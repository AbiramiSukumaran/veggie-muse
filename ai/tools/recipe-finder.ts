
'use server';
/**
 * @fileOverview Defines a Genkit tool for finding recipes in a BigQuery database.
 *
 * - findRecipesInBigQuery - An async function that searches for recipes.
 */

import { dynamicGenkit } from '@/ai/genkit';
import { z } from 'zod';
import { BigQuery } from '@google-cloud/bigquery';
import { FindRecipesInput } from '@/ai/schemas/weekly-plan-schemas';

const BQ_PROJECT_ID = 'abis-345004';
const BQ_DATASET_ID = 'recipe';
const BQ_TABLE_ID = 'recipes';
const BQ_TABLE_FQN = `${BQ_PROJECT_ID}.${BQ_DATASET_ID}.${BQ_TABLE_ID}`;

// Initialize BigQuery client
// This will use the GOOGLE_APPLICATION_CREDENTIALS environment variable for authentication.
const bigquery = new BigQuery({
    projectId: BQ_PROJECT_ID,
});


/**
 * Searches the BigQuery recipe database for recipes based on a user's preferences using vector search.
 * This function is intended to be wrapped by ai.defineTool within a flow that has access to an API key.
 * @param {FindRecipesInput} input The user's preferences.
 * @param {string} apiKey The user's Google AI API key.
 * @returns {Promise<string>} A JSON string of found recipes.
 */
export async function findRecipesInBigQuery(input: FindRecipesInput, apiKey: string): Promise<string> {
    const ai = dynamicGenkit(apiKey);

    const searchText = `Cuisine/Preference: ${input.cuisinePreference}. Dietary Restrictions: ${input.dietaryRestrictions?.join(', ') || 'None'}`;
    console.log(`[BigQuery Vector Search] Searching for: "${searchText}"`);
    
    // 1. Generate an embedding for the user's search query.
    const embedResult = await ai.embed({
      model: 'googleai/text-embedding-004',
      content: searchText,
    });

    if (!embedResult?.embedding) {
        console.error('[BigQuery Vector Search] Failed to generate embedding for query:', searchText);
        return JSON.stringify([]);
    }
    const { embedding } = embedResult;

    // 2. Use VECTOR_SEARCH to find the most similar recipes.
    const query = `
      SELECT
        base.title,
        base.ingredients,
        base.directions
      FROM
        VECTOR_SEARCH(
          TABLE ${BQ_TABLE_FQN},
          'Embedding',
          (SELECT @query_embedding AS embedding),
          top_k => 10,
          distance_type => 'COSINE'
        )
      JOIN
        ${BQ_TABLE_FQN} AS base
      ON
        search_results.id = base.id
    `;

    const options = {
      query: query,
      location: 'US', // Specify your BigQuery dataset's location.
      params: {
        query_embedding: embedding,
      },
    };

    console.log(`[BigQuery Vector Search] Executing query.`);

    try {
      const [rows] = await bigquery.query(options);
      console.log(`[BigQuery Vector Search] Found ${rows.length} recipes.`);
      return JSON.stringify(rows);
    } catch (error) {
      console.error('[BigQuery Vector Search] Error executing query:', error);
      // Return an empty array string in case of an error to prevent the flow from crashing.
      return JSON.stringify([]);
    }
  }
