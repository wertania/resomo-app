/**
 * Personal Wiki Agent
 * AI-powered agent that processes interview transcripts and extracts personal information
 * about a person (the "main character") into a structured personal wiki.
 *
 * The personal wiki is organized as a wiki with max 3 levels:
 * - Level 0: Entry point (personal wiki root) - managed by system
 * - Level 1: Main categories (biography, family, etc.) - created automatically
 * - Level 2 & 3: Subcategories - managed by AGENT (max 10 per level)
 *
 * Focus areas:
 * - Family relationships and connections
 * - Life story and biography
 * - Memories, anecdotes, and stories
 * - Places and locations
 * - Personal wisdom and life lessons
 */

import { tool, jsonSchema, Output, ToolLoopAgent } from "ai";
import { mistral } from "@ai-sdk/mistral";
import { getDb } from "@framework/lib/db/db-connection";
import {
  knowledgeText,
  knowledgeTextHistory,
} from "@framework/lib/db/schema/knowledge";
import { eq, and, isNull, asc, sql } from "drizzle-orm";
import { createKnowledgeText } from "@framework/lib/knowledge/knowledge-texts";

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;

/**
 * Default categories for personal wiki (German)
 * These will be created automatically if they don't exist
 */
const DEFAULT_CATEGORIES = [
  {
    title: "01_biografie",
    description:
      "# Biografie\n\nLebenslauf, wichtige Daten und Meilensteine im Leben.",
  },
  {
    title: "02_familie",
    description:
      "# Familie\n\nFamilienmitglieder, Stammbaum, Familiengeschichten und Beziehungen innerhalb der Familie.",
  },
  {
    title: "03_beziehungen",
    description:
      "# Beziehungen\n\nFreunde, Bekannte, Nachbarn und andere wichtige Personen im Leben.",
  },
  {
    title: "04_beruf",
    description:
      "# Beruf & Karriere\n\nAusbildung, Berufsleben, Arbeitsstellen und berufliche Erfahrungen.",
  },
  {
    title: "05_erinnerungen",
    description:
      "# Erinnerungen\n\nGeschichten, Anekdoten, besondere Erlebnisse und prägende Momente.",
  },
  {
    title: "06_orte",
    description:
      "# Orte\n\nWohnorte, Heimat, Reisen und bedeutsame Plätze.",
  },
  {
    title: "07_interessen",
    description:
      "# Interessen & Hobbies\n\nHobbies, Leidenschaften, Lieblingsbeschäftigungen und Freizeitaktivitäten.",
  },
  {
    title: "08_weisheiten",
    description:
      "# Lebensweisheiten\n\nRatschläge, Ansichten, Lebensmotto und persönliche Weisheiten.",
  },
  {
    title: "09_interviews",
    description:
      "# Interview-Protokolle\n\nOriginal-Transkripte der geführten Interviews.",
  },
  {
    title: "90_sonstiges",
    description:
      "# Sonstiges\n\nInformationen, die keiner anderen Kategorie zugeordnet werden können.",
  },
];

// Fallback category
const FALLBACK_CATEGORY_NAME = "90_sonstiges";

/**
 * Parameters for processing an interview
 */
export interface ProcessInterviewParams {
  entryPointId: string;
  tenantId: string;
  userId: string;
  interviewMarkdown: string;
  interviewName: string;
  mainCharacterName: string;
}

/**
 * Result of interview processing
 */
export interface ProcessInterviewResult {
  success: boolean;
  processedFacts: number;
  updatedCategories: string[];
  newCategories: string[];
  errors: string[];
  interviewEntryId?: string;
}

/**
 * Wiki entry structure for YAML output
 */
interface WikiEntry {
  id: string;
  title: string;
  children?: WikiEntry[];
}

/**
 * Validate that Mistral API key is configured
 */
export function validateMistralConfig(): void {
  if (!MISTRAL_API_KEY) {
    throw new Error("Mistral API key is not configured");
  }
}

/**
 * Get direct children of a wiki entry (titles only)
 */
async function getChildrenTitles(
  parentId: string,
  tenantId: string
): Promise<{ id: string; title: string }[]> {
  const children = await getDb()
    .select({ id: knowledgeText.id, title: knowledgeText.title })
    .from(knowledgeText)
    .where(
      and(
        eq(knowledgeText.parentId, parentId),
        eq(knowledgeText.tenantId, tenantId),
        isNull(knowledgeText.deletedAt)
      )
    )
    .orderBy(asc(knowledgeText.title));

  return children;
}

/**
 * Get wiki structure recursively as YAML-like format
 */
async function getWikiStructureDeep(
  parentId: string,
  tenantId: string,
  currentDepth: number = 0,
  maxDepth: number = 3
): Promise<WikiEntry[]> {
  if (currentDepth >= maxDepth) {
    return [];
  }

  const children = await getChildrenTitles(parentId, tenantId);
  const result: WikiEntry[] = [];

  for (const child of children) {
    const entry: WikiEntry = {
      id: child.id,
      title: child.title,
    };

    // Recursively get children
    const grandChildren = await getWikiStructureDeep(
      child.id,
      tenantId,
      currentDepth + 1,
      maxDepth
    );

    if (grandChildren.length > 0) {
      entry.children = grandChildren;
    }

    result.push(entry);
  }

  return result;
}

/**
 * Format wiki structure as YAML string
 */
function formatAsYaml(entries: WikiEntry[], indent: number = 0): string {
  const lines: string[] = [];
  const prefix = "  ".repeat(indent);

  for (const entry of entries) {
    lines.push(`${prefix}- id: "${entry.id}"`);
    lines.push(`${prefix}  title: "${entry.title}"`);

    if (entry.children && entry.children.length > 0) {
      lines.push(`${prefix}  children:`);
      lines.push(formatAsYaml(entry.children, indent + 2));
    }
  }

  return lines.join("\n");
}

/**
 * Format wiki structure as simple markdown list (titles only)
 */
function formatAsTitleList(entries: { id: string; title: string }[]): string {
  return entries.map((e) => `- ${e.title} (id: ${e.id})`).join("\n");
}

/**
 * Get wiki entry text content
 */
async function getWikiEntryText(
  entryId: string,
  tenantId: string,
  startLine?: number,
  endLine?: number
): Promise<string> {
  const entry = await getDb()
    .select({ text: knowledgeText.text, title: knowledgeText.title })
    .from(knowledgeText)
    .where(
      and(
        eq(knowledgeText.id, entryId),
        eq(knowledgeText.tenantId, tenantId),
        isNull(knowledgeText.deletedAt)
      )
    )
    .limit(1);

  if (entry.length === 0) {
    throw new Error(`Wiki entry not found: ${entryId}`);
  }

  const text = entry[0]!.text;
  const lines = text.split("\n");

  // Apply line range if specified
  if (startLine !== undefined || endLine !== undefined) {
    const start = (startLine ?? 1) - 1;
    const end = endLine ?? lines.length;
    const excerpt = lines.slice(start, end);

    // Format with line numbers
    return excerpt
      .map((line, idx) => {
        const lineNum = start + idx + 1;
        return `${lineNum.toString().padStart(4, " ")}| ${line}`;
      })
      .join("\n");
  }

  return text;
}

/**
 * Get the depth level of an entry relative to the entry point
 */
async function getEntryDepth(
  entryId: string,
  entryPointId: string,
  tenantId: string,
  maxDepth: number = 5
): Promise<number> {
  if (entryId === entryPointId) {
    return 0;
  }

  let currentId = entryId;
  let depth = 0;

  while (depth < maxDepth) {
    const entry = await getDb()
      .select({ parentId: knowledgeText.parentId })
      .from(knowledgeText)
      .where(
        and(
          eq(knowledgeText.id, currentId),
          eq(knowledgeText.tenantId, tenantId),
          isNull(knowledgeText.deletedAt)
        )
      )
      .limit(1);

    if (entry.length === 0 || !entry[0]!.parentId) {
      return -1;
    }

    depth++;

    if (entry[0]!.parentId === entryPointId) {
      return depth;
    }

    currentId = entry[0]!.parentId;
  }

  return -1;
}

/**
 * Ensure all default categories exist
 */
async function ensureDefaultCategories(
  entryPointId: string,
  tenantId: string,
  userId: string
): Promise<void> {
  const existingChildren = await getChildrenTitles(entryPointId, tenantId);
  const existingTitles = new Set(existingChildren.map((c) => c.title));

  for (const category of DEFAULT_CATEGORIES) {
    if (!existingTitles.has(category.title)) {
      await createKnowledgeText({
        tenantId,
        userId,
        parentId: entryPointId,
        title: category.title,
        text: category.description,
        tenantWide: false,
        hidden: false,
      });
    }
  }
}

/**
 * Find category by title
 */
async function findCategoryByTitle(
  entryPointId: string,
  tenantId: string,
  title: string
): Promise<{ id: string; title: string } | null> {
  const children = await getChildrenTitles(entryPointId, tenantId);
  return children.find((c) => c.title === title) || null;
}

/**
 * Save interview transcript to wiki
 */
async function saveInterviewToWiki(
  entryPointId: string,
  tenantId: string,
  userId: string,
  interviewMarkdown: string,
  interviewName: string
): Promise<string> {
  // Find or create the interviews category
  const interviewsCategory = await findCategoryByTitle(
    entryPointId,
    tenantId,
    "09_interviews"
  );

  if (!interviewsCategory) {
    throw new Error("Interviews category not found");
  }

  // Generate title with date
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];
  const safeName = interviewName
    .toLowerCase()
    .replace(/[^a-z0-9äöüß]/gi, "_")
    .substring(0, 30);
  const title = `${dateStr}_${safeName}`;

  // Create the interview entry
  const newEntry = await createKnowledgeText({
    tenantId,
    userId,
    parentId: interviewsCategory.id,
    title,
    text: interviewMarkdown,
    tenantWide: false,
    hidden: false,
  });

  return newEntry.id;
}

/**
 * Create the read_structure tool for the agent
 */
function createReadStructureTool(entryPointId: string, tenantId: string) {
  type ReadStructureParams = {
    parentId?: string;
    deep?: boolean;
  };

  return tool<ReadStructureParams, string>({
    description: `Lese die Wiki-Struktur des persönlichen Wikis.
    
Parameter:
- parentId: Die ID des Elterneintrags. Wenn leer, wird vom Einstiegspunkt (Root) gelesen.
- deep: Wenn true, gibt die vollständige rekursive Struktur als YAML zurück. Wenn false (Standard), nur direkte Kinder.

Verwende dies, um die bestehende Kategoriestruktur zu verstehen, bevor du entscheidest, wo neue Informationen abgelegt werden.`,
    inputSchema: jsonSchema<ReadStructureParams>({
      type: "object",
      properties: {
        parentId: {
          type: "string",
          description: "Elterneintrag-ID. Leer lassen für den Einstiegspunkt.",
        },
        deep: {
          type: "boolean",
          description:
            "Wenn true, vollständige rekursive YAML-Struktur. Standard: false.",
        },
      },
    }),
    execute: async (params: ReadStructureParams): Promise<string> => {
      const targetParentId = params.parentId || entryPointId;
      const deep = params.deep ?? false;

      if (deep) {
        const structure = await getWikiStructureDeep(targetParentId, tenantId);
        if (structure.length === 0) {
          return "Keine Kindeinträge unter diesem Eintrag gefunden.";
        }
        return `\`\`\`yaml\n${formatAsYaml(structure)}\n\`\`\``;
      } else {
        const children = await getChildrenTitles(targetParentId, tenantId);
        if (children.length === 0) {
          return "Keine Kindeinträge unter diesem Eintrag gefunden.";
        }
        return formatAsTitleList(children);
      }
    },
  });
}

/**
 * Create the read_text tool for the agent
 */
function createReadTextTool(tenantId: string) {
  type ReadTextParams = {
    entryId: string;
    startLine?: number;
    endLine?: number;
  };

  return tool<ReadTextParams, string>({
    description: `Lese den Textinhalt eines Wiki-Eintrags.
    
Parameter:
- entryId: Die ID des Wiki-Eintrags (erforderlich)
- startLine: Optionale Startzeile (1-basiert)
- endLine: Optionale Endzeile (1-basiert)

Verwende dies, um bestehenden Inhalt zu lesen, bevor du entscheidest, wie neue Informationen eingefügt werden.`,
    inputSchema: jsonSchema<ReadTextParams>({
      type: "object",
      properties: {
        entryId: {
          type: "string",
          description: "Die ID des Wiki-Eintrags",
        },
        startLine: {
          type: "number",
          description: "Startzeile (1-basiert, optional)",
        },
        endLine: {
          type: "number",
          description: "Endzeile (1-basiert, optional)",
        },
      },
      required: ["entryId"],
    }),
    execute: async (params: ReadTextParams): Promise<string> => {
      try {
        return await getWikiEntryText(
          params.entryId,
          tenantId,
          params.startLine,
          params.endLine
        );
      } catch (error) {
        return `Fehler beim Lesen: ${(error as Error).message}`;
      }
    },
  });
}

/**
 * Create the create_subcategory tool for the agent
 */
function createSubcategoryTool(
  entryPointId: string,
  tenantId: string,
  userId: string
) {
  type CreateSubcategoryParams = {
    parentId: string;
    title: string;
    initialContent?: string;
  };

  return tool<CreateSubcategoryParams, string>({
    description: `Erstelle eine neue Unterkategorie (Wiki-Seite) unter einer bestehenden Kategorie.

WICHTIGE EINSCHRÄNKUNGEN:
- Du KANNST KEINE Einträge direkt unter dem Einstiegspunkt erstellen. Level-1-Kategorien sind bereits vorhanden.
- Du KANNST Einträge auf Level 2 (unter Level-1-Kategorien) und Level 3 (unter Level-2-Kategorien) erstellen.
- Maximal 10 Unterkategorien pro Elterneintrag empfohlen.
- Verwende beschreibende, deutsche Titel mit Unterstrichen (z.B. "oma_mueller", "schulzeit_1950er").

Parameter:
- parentId: Die ID des Elterneintrags (MUSS eine Level-1 oder Level-2 Kategorie sein)
- title: Der Titel für die neue Unterkategorie
- initialContent: Optionaler initialer Textinhalt`,
    inputSchema: jsonSchema<CreateSubcategoryParams>({
      type: "object",
      properties: {
        parentId: {
          type: "string",
          description: "Elterneintrag-ID. Muss Level 1 oder 2 sein.",
        },
        title: {
          type: "string",
          description: "Titel für die neue Unterkategorie.",
        },
        initialContent: {
          type: "string",
          description: "Optionaler initialer Textinhalt.",
        },
      },
      required: ["parentId", "title"],
    }),
    execute: async (params: CreateSubcategoryParams): Promise<string> => {
      if (params.parentId === entryPointId) {
        return "FEHLER: Kann keine Einträge direkt unter dem Einstiegspunkt erstellen. Verwende eine bestehende Level-1 Kategorie als Elterneintrag.";
      }

      const parentDepth = await getEntryDepth(
        params.parentId,
        entryPointId,
        tenantId
      );

      if (parentDepth === -1) {
        return "FEHLER: Elterneintrag nicht gefunden oder ungültig.";
      }

      if (parentDepth === 0) {
        return "FEHLER: Kann keine Einträge direkt unter dem Einstiegspunkt erstellen.";
      }

      if (parentDepth >= 3) {
        return "FEHLER: Maximale Tiefe von 3 Ebenen erreicht.";
      }

      const existingChildren = await getChildrenTitles(params.parentId, tenantId);
      if (existingChildren.length >= 10) {
        return `WARNUNG: Elterneintrag hat bereits ${existingChildren.length} Kinder. Erwäge, bestehende Unterkategorien zu verwenden.`;
      }

      const existingWithTitle = existingChildren.find(
        (c) => c.title.toLowerCase() === params.title.toLowerCase()
      );
      if (existingWithTitle) {
        return `Eintrag mit Titel "${params.title}" existiert bereits. Verwende ID: ${existingWithTitle.id}`;
      }

      try {
        const newEntry = await createKnowledgeText({
          tenantId,
          userId,
          parentId: params.parentId,
          title: params.title,
          text: params.initialContent || "",
          tenantWide: false,
          hidden: false,
        });

        return `Unterkategorie "${params.title}" erfolgreich erstellt mit ID: ${newEntry.id}`;
      } catch (error) {
        return `FEHLER beim Erstellen: ${(error as Error).message}`;
      }
    },
  });
}

/**
 * Create the update_text tool for the agent
 */
function createUpdateTextTool(tenantId: string, userId: string) {
  type UpdateTextParams = {
    entryId: string;
    newContent: string;
    appendMode?: boolean;
  };

  return tool<UpdateTextParams, string>({
    description: `Aktualisiere den Textinhalt eines Wiki-Eintrags.

Parameter:
- entryId: Die ID des Wiki-Eintrags (erforderlich)
- newContent: Der neue Textinhalt
- appendMode: Wenn true, wird an bestehenden Inhalt angehängt. Wenn false (Standard), wird ersetzt.

WICHTIG:
- Lies IMMER zuerst den bestehenden Inhalt mit read_text
- Beim Anhängen wird der neue Inhalt mit Zeilenumbruch nach dem bestehenden eingefügt
- Beim Ersetzen: Vorsicht, keine wichtigen Informationen zu verlieren
- Eine Versionshistorie wird automatisch erstellt`,
    inputSchema: jsonSchema<UpdateTextParams>({
      type: "object",
      properties: {
        entryId: {
          type: "string",
          description: "Die ID des Wiki-Eintrags",
        },
        newContent: {
          type: "string",
          description: "Der neue Textinhalt",
        },
        appendMode: {
          type: "boolean",
          description: "Wenn true, anhängen. Standard: false (ersetzen).",
        },
      },
      required: ["entryId", "newContent"],
    }),
    execute: async (params: UpdateTextParams): Promise<string> => {
      const db = getDb();

      const currentEntry = await db
        .select()
        .from(knowledgeText)
        .where(
          and(
            eq(knowledgeText.id, params.entryId),
            eq(knowledgeText.tenantId, tenantId),
            isNull(knowledgeText.deletedAt)
          )
        )
        .limit(1);

      if (currentEntry.length === 0) {
        return `FEHLER: Wiki-Eintrag nicht gefunden: ${params.entryId}`;
      }

      const current = currentEntry[0]!;

      // Create history entry
      await db.insert(knowledgeTextHistory).values({
        knowledgeTextId: current.id,
        tenantId: current.tenantId,
        tenantWide: current.tenantWide,
        teamId: current.teamId,
        userId: current.userId,
        parentId: current.parentId,
        text: current.text,
        title: current.title,
        meta: current.meta,
        hidden: current.hidden,
      });

      let finalContent: string;
      if (params.appendMode) {
        finalContent = current.text
          ? `${current.text}\n\n${params.newContent}`
          : params.newContent;
      } else {
        finalContent = params.newContent;
      }

      await db
        .update(knowledgeText)
        .set({
          text: finalContent,
          updatedAt: sql`now()`,
        })
        .where(eq(knowledgeText.id, params.entryId));

      return `Eintrag "${current.title}" (${params.entryId}) erfolgreich aktualisiert`;
    },
  });
}

/**
 * Build the system instructions for the Personal Wiki Agent
 */
function buildAgentInstructions(
  categories: string,
  mainCharacterName: string
): string {
  return `Du bist der Persönliche Wiki-Agent. Deine Aufgabe ist es, Interview-Transkripte zu verarbeiten und wichtige persönliche Informationen über ${mainCharacterName} in ein strukturiertes Wiki zu extrahieren.

## DEINE ROLLE

Du arbeitest wie ein Biograph, der die Lebensgeschichte und Erinnerungen einer Person bewahrt. Wenn du ein Interview erhältst, musst du:
1. Wichtige persönliche Informationen über ${mainCharacterName} identifizieren
2. Diese Informationen in die passende Kategorie einordnen
3. Die Informationen in bestehende Einträge einfügen oder neue Unterkategorien erstellen

## WIKI-STRUKTUR

Das persönliche Wiki hat maximal 3 Ebenen:
- **Level 1**: Hauptkategorien (Biografie, Familie, etc.) - BEREITS VORHANDEN, du kannst diese nicht ändern
- **Level 2**: Unterkategorien - DU KANNST diese erstellen und verwalten (max 10 pro Kategorie)
- **Level 3**: Unter-Unterkategorien - DU KANNST diese erstellen und verwalten (max 10 pro Elterneintrag)

## BESTEHENDE HAUPTKATEGORIEN (Level 1)
${categories}

## VERFÜGBARE WERKZEUGE

### 1. read_structure
Erkunde die Wiki-Hierarchie. Starte mit deep=true für die vollständige Struktur.

### 2. read_text
Lese den Inhalt eines Wiki-Eintrags. IMMER vor dem Schreiben lesen!

### 3. create_subcategory
Erstelle neue Level-2 oder Level-3 Einträge. Du KANNST KEINE Level-1 Einträge erstellen.

### 4. update_text
Aktualisiere den Inhalt eines Wiki-Eintrags. Verwende appendMode=true zum Anhängen.

## ARBEITSABLAUF

1. **INTERVIEW ANALYSIEREN**
   - Lies das Interview sorgfältig
   - Identifiziere Informationen über ${mainCharacterName}:
     * Familienmitglieder und Beziehungen
     * Lebensereignisse und Daten
     * Orte und Wohnorte
     * Beruf und Ausbildung
     * Erinnerungen und Geschichten
     * Persönliche Ansichten und Weisheiten
     * Besonders wertvolle Zitate

2. **STRUKTUR ERKUNDEN**
   - Verwende read_structure mit deep=true
   - Verstehe, welche Kategorien und Unterkategorien existieren

3. **FÜR JEDE INFORMATION**
   - Bestimme die passende Hauptkategorie (Level 1)
   - Prüfe, ob eine passende Unterkategorie existiert
   - Wenn ja: Lies den bestehenden Inhalt, dann aktualisiere (füge neue Infos hinzu)
   - Wenn nein: Erstelle eine neue Unterkategorie, dann füge die Infos ein

## KATEGORIE-RICHTLINIEN

- **01_biografie**: Geburtsdatum, Lebenslauf, wichtige Lebensereignisse
- **02_familie**: Familienmitglieder (Eltern, Geschwister, Kinder, Enkel), Familiengeschichten
- **03_beziehungen**: Freunde, Nachbarn, Arbeitskollegen, andere wichtige Personen
- **04_beruf**: Ausbildung, Berufe, Arbeitgeber, Karriereerfahrungen
- **05_erinnerungen**: Geschichten, Anekdoten, besondere Erlebnisse, prägende Momente
- **06_orte**: Wohnorte, Heimat, Reiseziele, bedeutsame Plätze
- **07_interessen**: Hobbies, Leidenschaften, Lieblingsbeschäftigungen
- **08_weisheiten**: Lebensratschläge, persönliche Ansichten, Lebensmotto
- **90_sonstiges**: Wenn nichts anderes passt

## FORMAT-RICHTLINIEN

- Schreibe auf Deutsch
- Verwende Markdown-Formatierung
- Strukturiere Informationen mit Überschriften und Aufzählungen
- Füge Zeitangaben hinzu wenn bekannt (z.B. "ca. 1960", "in den 1980er Jahren")
- Bewahre wörtliche Zitate in Anführungszeichen mit Quellenangabe
- Erstelle Personeneinträge im Format: **Name** (Beziehung) - Beschreibung
- Verknüpfe Informationen wenn möglich (z.B. "siehe auch 02_familie/opa_hans")

## WICHTIGE REGELN

1. **Erstelle NIEMALS Level-1 Kategorien** - verwende die bestehenden
2. **Maximal 10 Unterkategorien pro Elterneintrag**
3. **IMMER vor dem Schreiben lesen** - keine Informationen verlieren
4. **Extrahiere Fakten und Geschichten** - nicht nur Zusammenfassungen
5. **Verwende deutsche, beschreibende Titel** (z.B. "oma_maria", "schulzeit")
6. **Füge Kontext hinzu** - Zeitangaben, Personen, Quellen
7. **Bei Unsicherheit: 90_sonstiges verwenden**
8. **Bewahre wertvolle Zitate** - direkte Aussagen von ${mainCharacterName}

## AUSGABEFORMAT

Nach der Verarbeitung musst du ein JSON-Objekt zurückgeben:
{
  "processedFacts": <Anzahl extrahierter und gespeicherter Informationen>,
  "updatedCategories": [<Liste aktualisierter Kategorietitel>],
  "newCategories": [<Liste neu erstellter Unterkategorien>],
  "errors": [<Liste eventueller Fehler>]
}

Verarbeite nun das Interview und extrahiere alle wichtigen Informationen über ${mainCharacterName} in das persönliche Wiki.`;
}

/**
 * Build the user prompt for the agent
 */
function buildUserPrompt(
  interviewMarkdown: string,
  mainCharacterName: string
): string {
  return `## INTERVIEW-TRANSKRIPT

Die Hauptperson dieses Interviews ist: **${mainCharacterName}**

${interviewMarkdown}

---

Bitte analysiere dieses Interview, extrahiere alle wichtigen Informationen über ${mainCharacterName} und speichere sie im persönlichen Wiki. Verwende die Werkzeuge, um die bestehende Struktur zu erkunden, Unterkategorien bei Bedarf zu erstellen und die entsprechenden Einträge zu aktualisieren.

Denke daran:
- Nur Informationen über oder von ${mainCharacterName} extrahieren
- Bestehende Kategorien verwenden wenn möglich
- Neue Unterkategorien nur bei Bedarf erstellen
- Immer lesen bevor du schreibst
- Das Ergebnis-JSON am Ende zurückgeben`;
}

/**
 * Process an interview and extract personal information into the wiki
 */
export async function processInterview(
  params: ProcessInterviewParams
): Promise<ProcessInterviewResult> {
  const {
    entryPointId,
    tenantId,
    userId,
    interviewMarkdown,
    interviewName,
    mainCharacterName,
  } = params;

  // Validate configuration
  validateMistralConfig();

  // Ensure default categories exist
  await ensureDefaultCategories(entryPointId, tenantId, userId);

  // Save interview transcript to wiki
  const interviewEntryId = await saveInterviewToWiki(
    entryPointId,
    tenantId,
    userId,
    interviewMarkdown,
    interviewName
  );

  // Get existing main categories for context
  const mainCategories = await getChildrenTitles(entryPointId, tenantId);
  const categoriesContext =
    mainCategories.length > 0
      ? formatAsTitleList(mainCategories)
      : "Keine Hauptkategorien gefunden. Verwende '90_sonstiges'.";

  // Create tools
  const readStructureTool = createReadStructureTool(entryPointId, tenantId);
  const readTextTool = createReadTextTool(tenantId);
  const createSubcategoryToolInstance = createSubcategoryTool(
    entryPointId,
    tenantId,
    userId
  );
  const updateTextTool = createUpdateTextTool(tenantId, userId);

  // Create result schema
  const resultSchema = jsonSchema<ProcessInterviewResult>({
    type: "object",
    properties: {
      success: { type: "boolean" },
      processedFacts: { type: "number" },
      updatedCategories: {
        type: "array",
        items: { type: "string" },
      },
      newCategories: {
        type: "array",
        items: { type: "string" },
      },
      errors: {
        type: "array",
        items: { type: "string" },
      },
    },
    required: [
      "success",
      "processedFacts",
      "updatedCategories",
      "newCategories",
      "errors",
    ],
  });

  // Create the agent
  const agent = new ToolLoopAgent({
    model: mistral("mistral-large-latest"),
    instructions: buildAgentInstructions(categoriesContext, mainCharacterName),
    tools: {
      read_structure: readStructureTool,
      read_text: readTextTool,
      create_subcategory: createSubcategoryToolInstance,
      update_text: updateTextTool,
    },
    output: Output.object({
      schema: resultSchema,
    }),
  });

  // Process the interview
  const result = await agent.generate({
    prompt: buildUserPrompt(interviewMarkdown, mainCharacterName),
  });

  return {
    ...result.output,
    interviewEntryId,
  };
}
