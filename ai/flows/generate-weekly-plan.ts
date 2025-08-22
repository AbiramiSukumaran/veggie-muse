
'use server';
/**
 * @fileOverview A meal prep AI agent that creates weekly plans
 * focusing on component prep for fresh daily cooking.
 *
 * - generateWeeklyPlan - A function that handles the weekly plan generation.
 */

import { dynamicGenkit } from '@/ai/genkit';
import { findRecipesInBigQuery } from '@/ai/tools/recipe-finder';
import { GenerateWeeklyPlanInput, GenerateWeeklyPlanInputSchema, WeeklyPlan, WeeklyPlanSchema, FindRecipesSchema } from '@/ai/schemas/weekly-plan-schemas';
import { z } from 'genkit';


export async function generateWeeklyPlan(input: GenerateWeeklyPlanInput, apiKey: string): Promise<WeeklyPlan | null> {
  if (!apiKey) {
    throw new Error('API Key is required for this operation.');
  }
  const ai = dynamicGenkit(apiKey);

  // The tool is now defined dynamically within the flow, using the provided apiKey.
  const recipeFinderTool = ai.defineTool(
    {
      name: 'findRecipesInBigQuery',
      description: `Searches a recipe database for recipes based on a user's preferences using vector search.`,
      inputSchema: FindRecipesSchema,
      outputSchema: z.string().describe('A JSON string containing a list of found recipes. Each recipe is an object with title, ingredients, and directions.'),
    },
    async (toolInput) => findRecipesInBigQuery(toolInput, apiKey)
  );

  const weeklyPlanPrompt = ai.definePrompt({
    name: 'generateWeeklyPlanPrompt',
    model: 'googleai/gemini-2.0-flash',
    input: { schema: GenerateWeeklyPlanInputSchema },
    output: { schema: WeeklyPlanSchema },
    tools: [recipeFinderTool], // Use the dynamically created tool
    config: {
      safetySettings: [
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
      ],
    },
    prompt: `You are an expert meal planner who specializes in creating weekly vegetarian meal plans that focus on "component prep" to ensure every meal is cooked fresh daily. The user wants a 5-day meal plan based on a specific cuisine preference.

Your task is to generate a full weekly plan. Follow these steps:
1.  **Search for Recipes**: First, use the 'findRecipesInBigQuery' tool to search for recipes matching the user's preferences. You MUST call this tool with the user's preferences.
2.  **Validate the Results**: The tool will return a JSON string of recipes. Carefully examine the ingredients and directions of the returned recipes. Validate if they truly match the user's request (cuisine preference, dietary restrictions).
3.  **Create the Plan**:
    *   **If you find good matches from the tool**: Use those recipes as the primary inspiration to create a component prep plan and the 5 quick daily recipes.
    *   **If the tool returns no recipes, or if you determine none of the results are a good fit**: Do not fail. Instead, use your own extensive culinary knowledge to generate a logical and delicious weekly plan that still meets the user's request.
4.  **Generate the Output**: Structure your final response as a JSON object that includes:
    *   A **Weekend Prep Plan**: A consolidated list of tasks to be done over the weekend.
    *   Five **Daily Recipes**: For each of the 5 days, provide a simple recipe that can be cooked in 15-20 minutes.
    *   A **Consolidated Shopping List**: After creating the prep plan and daily recipes, combine all ingredients from *both* the prep plan and all 5 daily recipes into a single, de-duplicated list. This list is for the user to take to the store.

**User's Requirements:**
- Cuisine/Preference: {{{cuisinePreference}}}
- Dietary Restrictions/Dislikes: {{#if dietaryRestrictions}}{{#each dietaryRestrictions}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{else}}None{{/if}}

{{#if seenPlanTitles}}
CRITICAL INSTRUCTION: You have already shown the user these meal plan titles. You MUST NOT use any of them again:
{{#each seenPlanTitles}}
- "{{{this}}}"
{{/each}}
{{/if}}

Please create a plan that is creative, delicious, and adheres to the principle of fresh daily cooking by front-loading the preparation work.

Output MUST be in JSON format, matching the schema.
`,
  });

  const generateWeeklyPlanFlow = ai.defineFlow(
    {
      name: 'generateWeeklyPlanFlow',
      inputSchema: GenerateWeeklyPlanInputSchema,
      outputSchema: WeeklyPlanSchema.nullable(),
    },
    async (flowInput) => {
      let output: WeeklyPlan | null | undefined = null;
      let attempts = 0;
      const maxAttempts = 3;

      while (!output && attempts < maxAttempts) {
        attempts++;
        try {
          const result = await weeklyPlanPrompt(flowInput);
          output = result.output;
        } catch (e: any) {
          console.error(`Weekly plan generation attempt ${attempts} failed:`, e);
          if (e.message.includes('SAFETY')) {
            // Re-throw a specific error for the frontend to catch
            throw new Error('SAFETY_BLOCK');
          }
          if (attempts >= maxAttempts) {
            console.error('Failed to generate a weekly plan after multiple attempts.');
            return null;
          }
        }
      }

      if (!output) {
        return null;
      }
      return output;
    }
  );
  return generateWeeklyPlanFlow(input);
}
