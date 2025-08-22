
/**
 * @fileOverview Zod schemas and TypeScript types for the Recipe Generator feature.
 * This file is intended for shared data structures between the client and server.
 */

import { z } from 'genkit';

const MoodSchema = z.enum(['Cozy', 'Happy', 'Adventurous', 'Comforting', 'Energized', 'Romantic', 'Celebratory', 'Healthy']);

export const GenerateRecipeInputSchema = z.object({
  mood: MoodSchema.describe('The desired mood for the recipe.'),
  duration: z.string().optional().describe('The maximum time available for cooking in minutes.'),
  vegetarian: z.boolean().describe('Whether the recipe should be vegetarian.'),
  dislikedIngredients: z
    .array(z.string())
    .describe('A list of ingredients the user dislikes.'),
  availableIngredients:
    z.array(z.string()).describe('A list of available ingredients from a checklist.'),
  additionalIngredients: z
    .array(z.string())
    .describe('A list of additional ingredients typed in by the user.'),
  photoDataUri: z.optional(z
    .string()
    .describe(
      "An optional photo of ingredients, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    )),
  seenRecipeTitles: z.array(z.string()).optional().describe("A list of recipe titles that have already been shown to the user."),
  seenQuotes: z.array(z.string()).optional().describe("A list of quotes that have already been shown to the user."),
});
export type GenerateRecipeInput = z.infer<typeof GenerateRecipeInputSchema>;


// Step 1: Generate multiple options for recipes and quotes
export const RecipeOptionSchema = z.object({
  recipeName: z.string().describe('The name of the recipe.'),
  description: z.string().describe('A short, one-sentence, mood-based description for the recipe.'),
  instructions: z.string().describe('The cooking instructions for the recipe.'),
  ingredientList: z
    .array(z.string())
    .describe('A list of all ingredients required for the recipe.'),
  missingIngredients: z.array(z.string()).describe('A list of ingredients required for the recipe that the user does not have. If none are missing, this must be an empty array.'),
  nutritionalInformation: z
    .string()
    .describe('Nutritional information for the recipe.'),
});

export const QuoteOptionSchema = z.object({
    quote: z.string().describe("An inspiring quote from a film, book, or famous person that matches the user's mood. Do not include quotation marks in the output."),
    quoteAuthor: z.string().describe('The author of the quote or the source (e.g., film title).'),
});

export const GenerateRecipeOptionsOutputSchema = z.object({
  recipeOptions: z.array(RecipeOptionSchema).length(5).describe("A list of 5 diverse and unique recipe options."),
  quoteOptions: z.array(QuoteOptionSchema).length(5).describe("A list of 5 diverse and unique quote options."),
});
export type GenerateRecipeOptionsOutput = z.infer<typeof GenerateRecipeOptionsOutputSchema>;


// Step 2: Validate the options and select one
export const ValidateAndSelectInputSchema = z.object({
    recipeOptions: z.array(RecipeOptionSchema),
    quoteOptions: z.array(QuoteOptionSchema),
    seenRecipeTitles: z.array(z.string()).optional(),
    seenQuotes: z.array(z.string()).optional(),
});

export const ValidateAndSelectOutputSchema = z.object({
    selectedRecipe: RecipeOptionSchema.describe("The selected unique recipe."),
    selectedQuote: QuoteOptionSchema.describe("The selected unique quote."),
});
export type ValidateAndSelectOutput = z.infer<typeof ValidateAndSelectOutputSchema>;


// Final Output Schema for the entire flow
export const GenerateRecipeOutputSchema = z.object({
  recipeName: z.string().describe('The name of the recipe.'),
  description: z.string().describe('A short, one-sentence, mood-based description for the recipe.'),
  photoDataUri: z
    .string()
    .describe(
      "A photo of the recipe, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  instructions: z.string().describe('The cooking instructions for the recipe.'),
  ingredientList: z
    .array(z.string())
    .describe('A list of all ingredients required for the recipe.'),
  missingIngredients: z.array(z.string()).describe('A list of ingredients required for the recipe that the user does not have.'),
  nutritionalInformation: z
    .string()
    .describe('Nutritional information for the recipe.'),
  quote: z.string().describe("An inspiring quote from a film, book, or famous person that matches the user's mood. Do not include quotation marks in the output."),
  quoteAuthor: z.string().describe('The author of the quote or the source (e.g., film title).'),
});
export type GenerateRecipeOutput = z.infer<typeof GenerateRecipeOutputSchema>;
