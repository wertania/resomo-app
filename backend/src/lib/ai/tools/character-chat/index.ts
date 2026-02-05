/**
 * AI Tools for Character Chat
 * Tools for the AI agent to search and retrieve information about the main character
 * from:
 * - Knowledge base (vector/semantic search on embedded interviews)
 * - Wiki (hierarchical text storage)
 */

import { tool } from "ai";
import { valibotSchema } from '@ai-sdk/valibot';
import * as v from "valibot";
import { getDb } from "@framework/lib/db/db-connection";
import { knowledgeText } from "@framework/lib/db/schema/knowledge";
import { getNearestEmbeddings } from "@framework/lib/knowledge/similarity-search";
import { eq, and, isNull, asc, ilike, or } from "drizzle-orm";
import { getMainCharacterGroupId } from "../../../interview-embedding";

/**
 * Context required for character chat tools
 */
export interface CharacterChatToolsContext {
  tenantId: string;
  userId: string;
  entryPointId?: string; // Wiki entry point (digital twin root)
}


/**
 * Create all character chat tools for a given context
 */
export async function createCharacterChatTools(ctx: CharacterChatToolsContext) {
  // Get the main-character knowledge group ID for vector search
  const mainCharacterGroupId = await getMainCharacterGroupId(ctx.tenantId);

  /**
   * Vector/Semantic Search Tool
   * Searches the embedded interview transcripts using vector similarity
   */
  const vectorSearchTool = tool({
    description: `Semantische Suche über alle Interview-Transkripte der Hauptperson.
Verwende dieses Tool, um relevante Informationen aus Interviews zu finden.
Die Suche basiert auf der Bedeutung, nicht auf exakten Wörtern.
Gut geeignet für:
- Fragen nach Erinnerungen, Geschichten, Erlebnissen
- Suche nach Personen, Orten, Ereignissen
- Fragen zu Gefühlen, Meinungen, Ansichten
Beispiel: "Erinnerungen an die Kindheit" findet auch Texte über "als ich jung war" oder "in meiner Jugend".`,
    inputSchema: valibotSchema(
      v.object({
        query: v.pipe(
          v.string(),
          v.minLength(3),
          v.description(
            "Die Suchanfrage - beschreibe was du suchst in natürlicher Sprache (min. 3 Zeichen)"
          )
        ),
        maxResults: v.optional(
          v.pipe(
            v.number(),
            v.minValue(1),
            v.maxValue(10),
            v.description("Maximale Anzahl Ergebnisse (1-10, Standard: 5)")
          )
        ),
      })
    ),
    execute: async ({ query, maxResults }: { query: string; maxResults?: number }) => {
      const limit = maxResults ?? 5;
      if (!mainCharacterGroupId) {
        return {
          success: false,
          error:
            "Keine Interviews gefunden. Es müssen zuerst Interviews mit Embeddings erstellt werden.",
          results: [],
        };
      }

      try {
        const chunks = await getNearestEmbeddings({
          tenantId: ctx.tenantId,
          searchText: query,
          n: limit,
          filterKnowledgeGroupIds: [mainCharacterGroupId],
          addBeforeN: 1, // Add context before
          addAfterN: 1, // Add context after
        });

        if (chunks.length === 0) {
          return {
            success: true,
            message: "Keine relevanten Textstellen gefunden.",
            results: [],
          };
        }

        // Format results
        const results = chunks.map((chunk) => ({
          source: chunk.knowledgeEntryName,
          text: chunk.text,
          metadata: chunk.meta,
        }));

        return {
          success: true,
          message: `${results.length} relevante Textstelle(n) gefunden.`,
          results,
        };
      } catch (error) {
        return {
          success: false,
          error: `Fehler bei der Suche: ${(error as Error).message}`,
          results: [],
        };
      }
    },
  });

  /**
   * Wiki Full-Text Search Tool
   * Searches wiki entries by title and content using SQL ILIKE
   */
  const wikiSearchTool = tool({
    description: `Volltextsuche im persönlichen Wiki.
Durchsucht Titel und Inhalte aller Wiki-Einträge nach dem Suchbegriff.
Gut geeignet für:
- Suche nach bestimmten Namen oder Begriffen
- Finden von Kategorien oder Themen
- Exakte oder teilweise Wortübereinstimmungen
Beispiel: "Oma Maria" findet Einträge die "Oma Maria" enthalten.`,
    inputSchema: valibotSchema(
      v.object({
        searchTerm: v.pipe(
          v.string(),
          v.minLength(2),
          v.description("Der Suchbegriff (min. 2 Zeichen)")
        ),
        maxResults: v.optional(
          v.pipe(
            v.number(),
            v.minValue(1),
            v.maxValue(20),
            v.description("Maximale Anzahl Ergebnisse (1-20, Standard: 10)")
          )
        ),
      })
    ),
    execute: async ({ searchTerm, maxResults }: { searchTerm: string; maxResults?: number }) => {
      const limit = maxResults ?? 10;
      try {
        const db = getDb();
        const searchPattern = `%${searchTerm}%`;

        // Build base conditions
        const conditions = [
          eq(knowledgeText.tenantId, ctx.tenantId),
          isNull(knowledgeText.deletedAt),
          or(
            ilike(knowledgeText.title, searchPattern),
            ilike(knowledgeText.text, searchPattern)
          ),
        ];

        const results = await db
          .select({
            id: knowledgeText.id,
            title: knowledgeText.title,
            text: knowledgeText.text,
            parentId: knowledgeText.parentId,
          })
          .from(knowledgeText)
          .where(and(...conditions))
          .orderBy(asc(knowledgeText.title))
          .limit(limit);

        if (results.length === 0) {
          return {
            success: true,
            message: `Keine Einträge mit "${searchTerm}" gefunden.`,
            results: [],
          };
        }

        // Format results with text preview
        const formattedResults = results.map((entry) => {
          // Create a short preview of the text
          let preview = entry.text || "";
          const searchIndex = preview
            .toLowerCase()
            .indexOf(searchTerm.toLowerCase());
          if (searchIndex > 50) {
            preview = "..." + preview.substring(searchIndex - 50);
          }
          if (preview.length > 300) {
            preview = preview.substring(0, 300) + "...";
          }

          return {
            id: entry.id,
            title: entry.title,
            preview,
            hasParent: !!entry.parentId,
          };
        });

        return {
          success: true,
          message: `${results.length} Eintrag/Einträge gefunden.`,
          results: formattedResults,
        };
      } catch (error) {
        return {
          success: false,
          error: `Fehler bei der Wiki-Suche: ${(error as Error).message}`,
          results: [],
        };
      }
    },
  });

  /**
   * Wiki Read Entry Tool
   * Reads the full content of a specific wiki entry
   */
  const wikiReadTool = tool({
    description: `Lese den vollständigen Inhalt eines Wiki-Eintrags.
Verwende eine Wiki-Eintrag-ID, um den kompletten Text zu lesen.
Gut geeignet für:
- Detailliertes Lesen eines gefundenen Eintrags
- Nachlesen von Informationen zu einer Person oder einem Thema`,
    inputSchema: valibotSchema(
      v.object({
        entryId: v.pipe(
          v.string(),
          v.description("Die ID des Wiki-Eintrags")
        ),
      })
    ),
    execute: async ({ entryId }: { entryId: string }) => {
      try {
        const db = getDb();

        const entry = await db
          .select({
            id: knowledgeText.id,
            title: knowledgeText.title,
            text: knowledgeText.text,
            parentId: knowledgeText.parentId,
            createdAt: knowledgeText.createdAt,
            updatedAt: knowledgeText.updatedAt,
          })
          .from(knowledgeText)
          .where(
            and(
              eq(knowledgeText.id, entryId),
              eq(knowledgeText.tenantId, ctx.tenantId),
              isNull(knowledgeText.deletedAt)
            )
          )
          .limit(1);

        if (entry.length === 0) {
          return {
            success: false,
            error: "Wiki-Eintrag nicht gefunden.",
          };
        }

        const result = entry[0]!;

        // Get children titles for context
        const children = await db
          .select({
            id: knowledgeText.id,
            title: knowledgeText.title,
          })
          .from(knowledgeText)
          .where(
            and(
              eq(knowledgeText.parentId, entryId),
              eq(knowledgeText.tenantId, ctx.tenantId),
              isNull(knowledgeText.deletedAt)
            )
          )
          .orderBy(asc(knowledgeText.title));

        return {
          success: true,
          entry: {
            id: result.id,
            title: result.title,
            text: result.text || "(Kein Inhalt)",
            updatedAt: result.updatedAt,
          },
          childEntries:
            children.length > 0
              ? children.map((c) => ({ id: c.id, title: c.title }))
              : [],
        };
      } catch (error) {
        return {
          success: false,
          error: `Fehler beim Lesen: ${(error as Error).message}`,
        };
      }
    },
  });

  /**
   * Wiki Navigate Tool
   * Browse the wiki structure - list categories and subcategories
   */
  const wikiNavigateTool = tool({
    description: `Navigiere durch die Wiki-Struktur.
Zeigt die Kategorien und Unterkategorien des persönlichen Wikis.
Verwende ohne Parameter, um die Hauptkategorien zu sehen.
Verwende mit parentId, um Unterkategorien einer Kategorie zu sehen.
Gut geeignet für:
- Überblick über vorhandene Informationen
- Entdecken von Themen und Kategorien
- Navigation zu spezifischen Bereichen`,
    inputSchema: valibotSchema(
      v.object({
        parentId: v.optional(
          v.pipe(
            v.string(),
            v.description(
              "ID des Elterneintrags. Leer lassen für Hauptkategorien."
            )
          )
        ),
      })
    ),
    execute: async ({ parentId }: { parentId?: string }) => {
      try {
        const db = getDb();

        // Use entry point if no parentId provided
        const targetParentId = parentId || ctx.entryPointId;

        if (!targetParentId) {
          return {
            success: false,
            error:
              "Kein Wiki-Einstiegspunkt konfiguriert. Bitte zuerst einen Digital Twin Einstiegspunkt setzen.",
          };
        }

        // Get children of the target parent
        const children = await db
          .select({
            id: knowledgeText.id,
            title: knowledgeText.title,
            text: knowledgeText.text,
          })
          .from(knowledgeText)
          .where(
            and(
              eq(knowledgeText.parentId, targetParentId),
              eq(knowledgeText.tenantId, ctx.tenantId),
              isNull(knowledgeText.deletedAt)
            )
          )
          .orderBy(asc(knowledgeText.title));

        if (children.length === 0) {
          return {
            success: true,
            message: "Keine Einträge unter diesem Eintrag gefunden.",
            entries: [],
          };
        }

        // Check which entries have children (are categories)
        const entriesWithChildCount = await Promise.all(
          children.map(async (child) => {
            const childCount = await db
              .select({ id: knowledgeText.id })
              .from(knowledgeText)
              .where(
                and(
                  eq(knowledgeText.parentId, child.id),
                  eq(knowledgeText.tenantId, ctx.tenantId),
                  isNull(knowledgeText.deletedAt)
                )
              );

            // Create a short description from the text
            let description = "";
            if (child.text) {
              // Get first non-header line
              const lines = child.text.split("\n").filter((l) => !l.startsWith("#") && l.trim());
              description = lines[0]?.substring(0, 100) || "";
              if (description.length === 100) description += "...";
            }

            return {
              id: child.id,
              title: child.title,
              description,
              hasChildren: childCount.length > 0,
              childCount: childCount.length,
            };
          })
        );

        return {
          success: true,
          message: `${entriesWithChildCount.length} Eintrag/Einträge gefunden.`,
          entries: entriesWithChildCount,
        };
      } catch (error) {
        return {
          success: false,
          error: `Fehler bei der Navigation: ${(error as Error).message}`,
        };
      }
    },
  });

  return {
    vectorSearch: vectorSearchTool,
    wikiSearch: wikiSearchTool,
    wikiRead: wikiReadTool,
    wikiNavigate: wikiNavigateTool,
  };
}

/**
 * Build system instructions for the character chat agent
 */
export function buildCharacterChatInstructions(characterName?: string): string {
  const name = characterName || "die Hauptperson";

  return `Du bist ein freundlicher KI-Assistent, der Informationen über ${name} bereitstellt.

## DEINE ROLLE

Du hast Zugriff auf:
1. **Interview-Transkripte** (via vectorSearch) - Aufgezeichnete Gespräche mit ${name}
2. **Persönliches Wiki** (via wikiSearch, wikiRead, wikiNavigate) - Strukturierte Informationen über ${name}

## VERFÜGBARE WERKZEUGE

### vectorSearch
Semantische Suche über alle Interview-Transkripte. Findet relevante Passagen basierend auf Bedeutung, nicht exakten Wörtern.
- Verwende für: Erinnerungen, Geschichten, Meinungen, Erlebnisse
- Beispiel: "Kindheitserinnerungen" findet auch "als ich jung war"

### wikiSearch
Volltextsuche im Wiki. Findet Einträge die den Suchbegriff enthalten.
- Verwende für: Bestimmte Namen, Orte, Begriffe
- Beispiel: "Oma Maria" findet alle Erwähnungen

### wikiRead
Lese einen vollständigen Wiki-Eintrag.
- Verwende mit der ID aus wikiSearch oder wikiNavigate

### wikiNavigate
Zeige Wiki-Kategorien und Struktur.
- Ohne Parameter: Hauptkategorien
- Mit parentId: Unterkategorien

## VERHALTENSREGELN

1. **Antworte auf Deutsch** - Die meisten Informationen sind auf Deutsch
2. **Verwende die Werkzeuge aktiv** - Suche nach Informationen bevor du antwortest
3. **Sei ehrlich** - Sage wenn du keine Information findest
4. **Zitiere Quellen** - Erwähne woher die Information stammt (Interview, Wiki-Kategorie)
5. **Sei respektvoll** - Es handelt sich um persönliche Erinnerungen und Lebensgeschichten
6. **Fasse zusammen** - Gib klare, strukturierte Antworten

## BEISPIEL-ABLAUF

Nutzer: "Erzähl mir von der Familie"

1. vectorSearch: "Familie Familienmitglieder Beziehungen"
2. wikiNavigate: (ohne Parameter, um Kategorien zu sehen)
3. Falls "familie" Kategorie existiert: wikiRead mit der ID
4. Fasse die gefundenen Informationen zusammen

## WICHTIG

- Erfinde KEINE Informationen
- Wenn nichts gefunden wird, sage das ehrlich
- Biete alternative Suchvorschläge an wenn möglich`;
}
