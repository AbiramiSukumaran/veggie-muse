
/**
 * @fileOverview Zod schemas and TypeScript types for the Weekly Plan feature.
 * This file is intended for shared data structures between the client and server.
 */
import { z } from 'zod';

// Input from the user form
export const GenerateWeeklyPlanInputSchema = z.object({
  cuisinePreference: z.string().describe('The desired cuisine or meal preference for the weekly plan (e.g., Indian, Italian and Mexican fusion, Quick lunches).'),
  dietaryRestrictions: z.array(z.string()).optional().describe('A list of dietary restrictions or disliked ingredients.'),
  seenPlanTitles: z.array(z.string()).optional().describe('A list of weekly plan titles that have already been shown to the user.'),
});
export type GenerateWeeklyPlanInput = z.infer<typeof GenerateWeeklyPlanInputSchema>;


// Schema for the BigQuery recipe finder tool
export const FindRecipesSchema = z.object({
    cuisinePreference: z.string().describe('The cuisine or meal preference to search for, e.g., "Indian", "Italian and Mexican fusion", "Quick lunches".'),
    dietaryRestrictions: z.array(z.string()).optional().describe('A list of dietary restrictions or disliked ingredients.'),
});
export type FindRecipesInput = z.infer<typeof FindRecipesSchema>;


// Output schema for the daily recipes within the plan
const DailyRecipeSchema = z.object({
  recipeName: z.string().describe("The name of the day's recipe."),
  ingredients: z.array(z.string()).describe("List of ingredients needed for the final cooking, assuming prep is done."),
  instructions: z.string().describe("The quick cooking instructions for the day's meal."),
});

// Final output schema for the entire weekly plan
export const WeeklyPlanSchema = z.object({
  planTitle: z.string().describe("A creative title for the weekly meal plan."),
  planDescription: z.string().describe("A short, inspiring description of the weekly plan."),
  prepPlan: z.string().describe("A detailed plan for all the component prep to be done over the weekend. This should include making base sauces, chopping vegetables, preparing spice mixes, etc. It should be a single, consolidated list of tasks."),
  dailyRecipes: z.array(DailyRecipeSchema).length(5).describe("An array of 5 daily recipes for the week."),
  consolidatedShoppingList: z.array(z.string()).describe('A consolidated list of all unique ingredients needed for the entire 5-day plan, combining ingredients from the prep plan and daily recipes.'),
});
export type WeeklyPlan = z.infer<typeof WeeklyPlanSchema>;
