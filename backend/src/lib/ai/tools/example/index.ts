// Exmaple how to create Tools for AI!
// 
// /**
//  * AI Tools for Roadmap Entries
//  * Tools for creating, updating, and deleting roadmap entries
//  */
// 
// import { valibotSchema } from '@ai-sdk/valibot';
// import * as v from 'valibot';
// import { tool, ToolLoopAgent, stepCountIs } from 'ai';
// import {
//     createRoadmapEntry,
//     updateRoadmapEntry,
//     deleteRoadmapEntry,
//     getRoadmapEntries,
//     searchRoadmapEntriesByName,
// } from '../../../lib/roadmap-entries';
// import { getRoadmapTypes } from '../../../lib/roadmap-types';
// import { STANDARD_AI_MODEL } from '../..';
// 
// /**
//  * Create AI tools for roadmap entries
//  * @param tenantId - The tenant ID to scope the operations
//  * @returns Object containing all roadmap entry tools
//  */
// export async function createRoadmapEntryTools(tenantId: string) {
//     // Get available roadmap types for this tenant
//     const availableTypes = await getRoadmapTypes(tenantId);
//     const typesList = availableTypes.length > 0
//         ? `\n\nAvailable roadmap types/categories:\n${availableTypes.map(t => `- ${t.name} (ID: ${t.id})`).join('\n')}`
//         : '\n\nNote: No roadmap types are currently available. Please create roadmap types first.';
// 
//     /**
//      * Create a new roadmap entry
//      */
//     const createEntryTool = tool({
//         description: `Create a new roadmap entry. A roadmap entry represents a planned feature, task, or milestone.${typesList}`,
//         inputSchema: valibotSchema(
//             v.object({
//                 name: v.pipe(
//                     v.string(),
//                     v.minLength(1),
//                     v.maxLength(255),
//                     v.description('The name of the roadmap entry (required, max 255 characters)')
//                 ),
//                 description: v.optional(
//                     v.pipe(
//                         v.string(),
//                         v.description('Detailed description of the roadmap entry (optional)')
//                     )
//                 ),
//                 typeId: v.pipe(
//                     v.string(),
//                     v.description('The ID of the roadmap type/category this entry belongs to (required)')
//                 ),
//                 startsAt: v.pipe(
//                     v.string(),
//                     v.description('Start date/time in ISO 8601 format (required, e.g., "2024-01-01T00:00:00Z")')
//                 ),
//                 endsAt: v.optional(
//                     v.pipe(
//                         v.string(),
//                         v.description('End date/time in ISO 8601 format (optional, e.g., "2024-12-31T23:59:59Z")')
//                     )
//                 ),
//             })
//         ),
//         execute: async ({ name, description, typeId, startsAt, endsAt }) => {
//             try {
//                 const newEntry = await createRoadmapEntry(tenantId, {
//                     name,
//                     description: description || null,
//                     typeId,
//                     startsAt,
//                     endsAt: endsAt || null,
//                 });
// 
//                 return {
//                     success: true,
//                     data: newEntry,
//                 };
//             } catch (error) {
//                 return {
//                     success: false,
//                     error: error instanceof Error ? error.message : 'Failed to create roadmap entry',
//                 };
//             }
//         },
//     });
// 
//     /**
//      * Update an existing roadmap entry
//      */
//     const updateEntryTool = tool({
//         description: 'Update an existing roadmap entry. Only provide fields that should be changed.',
//         inputSchema: valibotSchema(
//             v.object({
//                 id: v.pipe(
//                     v.string(),
//                     v.description('The ID of the roadmap entry to update (required)')
//                 ),
//                 name: v.optional(
//                     v.pipe(
//                         v.string(),
//                         v.minLength(1),
//                         v.maxLength(255),
//                         v.description('The name of the roadmap entry (optional, max 255 characters)')
//                     )
//                 ),
//                 description: v.optional(
//                     v.pipe(
//                         v.string(),
//                         v.description('Detailed description of the roadmap entry (optional)')
//                     )
//                 ),
//                 typeId: v.optional(
//                     v.pipe(
//                         v.string(),
//                         v.description('The ID of the roadmap type/category this entry belongs to (optional)')
//                     )
//                 ),
//                 startsAt: v.optional(
//                     v.pipe(
//                         v.string(),
//                         v.description('Start date/time in ISO 8601 format (optional, e.g., "2024-01-01T00:00:00Z")')
//                     )
//                 ),
//                 endsAt: v.optional(
//                     v.pipe(
//                         v.string(),
//                         v.description('End date/time in ISO 8601 format (optional, e.g., "2024-12-31T23:59:59Z")')
//                     )
//                 ),
//             })
//         ),
//         execute: async ({ id, name, description, typeId, startsAt, endsAt }) => {
//             try {
//                 const updateData: Record<string, unknown> = {};
//                 if (name !== undefined) updateData.name = name;
//                 if (description !== undefined) updateData.description = description || null;
//                 if (typeId !== undefined) updateData.typeId = typeId;
//                 if (startsAt !== undefined) updateData.startsAt = startsAt;
//                 if (endsAt !== undefined) updateData.endsAt = endsAt || null;
// 
//                 const updatedEntry = await updateRoadmapEntry(tenantId, id, updateData);
// 
//                 if (!updatedEntry) {
//                     return {
//                         success: false,
//                         error: 'Roadmap entry not found',
//                     };
//                 }
// 
//                 return {
//                     success: true,
//                     data: updatedEntry,
//                 };
//             } catch (error) {
//                 return {
//                     success: false,
//                     error: error instanceof Error ? error.message : 'Failed to update roadmap entry',
//                 };
//             }
//         },
//     });
// 
//     /**
//      * Delete a roadmap entry
//      */
//     const deleteEntryTool = tool({
//         description: 'Delete a roadmap entry by its ID. This action cannot be undone.',
//         inputSchema: valibotSchema(
//             v.object({
//                 id: v.pipe(
//                     v.string(),
//                     v.description('The ID of the roadmap entry to delete (required)')
//                 ),
//             })
//         ),
//         execute: async ({ id }) => {
//             try {
//                 const deleted = await deleteRoadmapEntry(tenantId, id);
// 
//                 if (!deleted) {
//                     return {
//                         success: false,
//                         error: 'Roadmap entry not found',
//                     };
//                 }
// 
//                 return {
//                     success: true,
//                     message: 'Roadmap entry deleted successfully',
//                 };
//             } catch (error) {
//                 return {
//                     success: false,
//                     error: error instanceof Error ? error.message : 'Failed to delete roadmap entry',
//                 };
//             }
//         },
//     });
// 
//     /**
//      * List all roadmap entries for the tenant, optionally filtered by typeId
//      */
//     const listEntriesTool = tool({
//         description: `List all roadmap entries for the tenant.${typesList}`,
//         inputSchema: valibotSchema(
//             v.object({
//                 typeId: v.optional(
//                     v.pipe(
//                         v.string(),
//                         v.description('Optional: Filter entries by roadmap type/category ID')
//                     )
//                 ),
//             })
//         ),
//         execute: async ({ typeId }) => {
//             try {
//                 const entries = await getRoadmapEntries(tenantId, typeId);
// 
//                 return {
//                     success: true,
//                     data: entries,
//                     count: entries.length,
//                 };
//             } catch (error) {
//                 return {
//                     success: false,
//                     error: error instanceof Error ? error.message : 'Failed to list roadmap entries',
//                 };
//             }
//         },
//     });
// 
//     /**
//      * Search roadmap entries by name and description (case-insensitive)
//      */
//     const searchEntriesByNameTool = tool({
//         description: `Search for roadmap entries by name and description. The search is case-insensitive and matches partial text in both name and description fields.${typesList}`,
//         inputSchema: valibotSchema(
//             v.object({
//                 name: v.pipe(
//                     v.string(),
//                     v.minLength(1),
//                     v.description('The search term to match against roadmap entry names and descriptions (required, case-insensitive partial match)')
//                 ),
//                 typeId: v.optional(
//                     v.pipe(
//                         v.string(),
//                         v.description('Optional: Filter results by roadmap type/category ID')
//                     )
//                 ),
//             })
//         ),
//         execute: async ({ name, typeId }) => {
//             try {
//                 const entries = await searchRoadmapEntriesByName(tenantId, name, typeId);
// 
//                 return {
//                     success: true,
//                     data: entries,
//                     count: entries.length,
//                     searchTerm: name,
//                 };
//             } catch (error) {
//                 return {
//                     success: false,
//                     error: error instanceof Error ? error.message : 'Failed to search roadmap entries',
//                 };
//             }
//         },
//     });
// 
//     return {
//         createRoadmapEntry: createEntryTool,
//         updateRoadmapEntry: updateEntryTool,
//         deleteRoadmapEntry: deleteEntryTool,
//         listRoadmapEntries: listEntriesTool,
//         searchRoadmapEntriesByName: searchEntriesByNameTool,
//     };
// }
// 
// /**
//  * Build agent instructions for roadmap management
//  */
// function buildAgentInstructions(): string {
//     return `You are an AI assistant specialized in managing roadmap entries.
// Your role is to help users create, update, delete, list, and search roadmap entries efficiently.
// 
// Guidelines:
// - When creating a roadmap entry, ensure all required fields are provided (name, typeId, startsAt)
// - Dates must be in ISO 8601 format (e.g., "2024-01-01T00:00:00Z")
// - When updating, only provide the fields that need to be changed
// - Use listRoadmapEntries to show all entries or filter by typeId
// - Use searchRoadmapEntriesByName to find entries by name or description (supports partial matches in both fields)
// - Always confirm successful operations to the user
// - If an operation fails, explain the error clearly
// - Be helpful and provide context when needed`;
// }
// 
// /**
//  * Create a ToolLoopAgent with all roadmap entry tools
//  * @param tenantId - The tenant ID to scope the operations
//  * @returns A configured ToolLoopAgent instance with all roadmap tools
//  */
// export async function createRoadmapEntryAgent(tenantId: string) {
//     // Create all tools
//     const { createRoadmapEntry, updateRoadmapEntry, deleteRoadmapEntry, listRoadmapEntries, searchRoadmapEntriesByName } = await createRoadmapEntryTools(tenantId);
// 
//     // Create and return the agent
//     const agent = new ToolLoopAgent({
//         model: STANDARD_AI_MODEL,
//         instructions: buildAgentInstructions(),
//         tools: {
//             createRoadmapEntry,
//             updateRoadmapEntry,
//             deleteRoadmapEntry,
//             listRoadmapEntries,
//             searchRoadmapEntriesByName,
//         },
//         stopWhen: stepCountIs(10),
//     });
// 
//     return agent;
// }
// 