
'use server';
/**
 * @fileOverview A recipe generation AI agent that uses a two-step process to ensure unique recipes.
 *
 * - generateRecipe - A function that handles the recipe generation process.
 */

import { dynamicGenkit } from '@/ai/genkit';
import {
    GenerateRecipeInput,
    GenerateRecipeInputSchema,
    GenerateRecipeOptionsOutputSchema,
    GenerateRecipeOutput,
    GenerateRecipeOutputSchema,
    RecipeOptionSchema,
    ValidateAndSelectInputSchema,
    ValidateAndSelectOutputSchema,
    QuoteOptionSchema,
    GenerateRecipeOptionsOutput,
    ValidateAndSelectOutput
} from '@/ai/schemas/recipe-schemas';


export async function generateRecipe(input: GenerateRecipeInput, apiKey: string): Promise<GenerateRecipeOutput | null> {
  if (!apiKey) {
    throw new Error('API Key is required for this operation.');
  }
  const ai = dynamicGenkit(apiKey);

  const generateOptionsPrompt = ai.definePrompt({
    name: 'generateRecipeOptionsPrompt',
    model: 'googleai/gemini-2.0-flash',
    input: { schema: GenerateRecipeInputSchema },
    output: { schema: GenerateRecipeOptionsOutputSchema },
    config: {
      temperature: 0.9,
      safetySettings: [
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
      ],
    },
    prompt: `You are a world-class chef, a master of culinary creativity, and a source of inspiration.

Your task is to generate 5 distinct recipe ideas and 5 distinct inspirational quotes based on the user's request.

Your response should be tailored to the user's mood. For example, if the mood is 'Cozy', use warm and comforting language. If it's 'Adventurous', use exciting and bold language.

First, generate 5 recipe options based on the user's mood, preferences, and available ingredients.

If a photo of ingredients is provided, use it as the primary source for available ingredients. Also consider the checklist of ingredients and any additional ingredients the user has typed.

Mood: {{mood}}
Vegetarian: {{vegetarian}}
{{#if duration}}Maximum cooking time: {{duration}} minutes{{/if}}
Disliked Ingredients: {{#if dislikedIngredients}}{{#each dislikedIngredients}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{else}} None {{/if}}
Available Ingredients (from checklist): {{#if availableIngredients}}{{#each availableIngredients}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{else}} None {{/if}}
Additional Ingredients (typed in): {{#if additionalIngredients}}{{#each additionalIngredients}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{else}} None {{/if}}

{{#if photoDataUri}}
Photo of available ingredients: {{media url=photoDataUri}}
{{/if}}

For each of the 5 recipe options, provide a full recipe including: a unique name, a mood-based description, instructions, and a complete ingredient list.

After creating the recipe, you MUST determine the list of missing ingredients by comparing the full ingredient list with the user's available ingredients.
If there are no missing ingredients, you MUST return an empty array [] for the 'missingIngredients' field. Do not omit this field.

Finally, find 5 famous quotes from films, books, or well-known leaders that perfectly match the user's chosen mood. The quotes MUST be positive, uplifting, and motivational. Provide the quote and its author/source. The quote text should NOT be enclosed in quotation marks.

Output MUST be in JSON format, matching the schema.
`,
  });

  const validateAndSelectPrompt = ai.definePrompt({
      name: 'validateAndSelectRecipePrompt',
      model: 'googleai/gemini-2.0-flash',
      input: { schema: ValidateAndSelectInputSchema },
      output: { schema: ValidateAndSelectOutputSchema },
      config: { temperature: 0.2 },
      prompt: `You are a strict editor. Your job is to select one recipe and one quote that have not been seen before.

From the provided list of 5 recipe options, you must select the *first* one whose title is semantically different from the titles in the 'seenRecipeTitles' list. For example, "Spinach and Paneer Curry" is semantically the same as "Paneer with Spinach in Curry".

From the provided list of 5 quote options, you must select the *first* one whose text is not present in the 'seenQuotes' list.

Recipe Options:
{{{json recipeOptions}}}

Seen Recipe Titles:
{{#if seenRecipeTitles}}
{{#each seenRecipeTitles}}
- {{{this}}}
{{/each}}
{{else}}
None
{{/if}}


Quote Options:
{{{json quoteOptions}}}

Seen Quotes:
{{#if seenQuotes}}
{{#each seenQuotes}}
- "{{{this}}}"
{{/each}}
{{else}}
None
{{/if}}

Select the first available unique recipe and unique quote and return them in the specified JSON format. If all recipe options are semantically similar to seen titles, select the first recipe from the options. Do the same for quotes.
`,
  });

  const generateRecipeFlow = ai.defineFlow(
    {
      name: 'generateRecipeFlow',
      inputSchema: GenerateRecipeInputSchema,
      outputSchema: GenerateRecipeOutputSchema.nullable(),
    },
    async (flowInput) => {
      // Step 1: Generate options
      let optionsOutput: GenerateRecipeOptionsOutput | null | undefined = null;
      try {
        const { output } = await generateOptionsPrompt(flowInput);
        optionsOutput = output;
      } catch (e: any) {
        console.error(`Recipe options generation failed:`, e);
         if (e.message.includes('SAFETY')) {
          throw new Error('SAFETY_BLOCK');
        }
        return null;
      }
      
      if (!optionsOutput) {
        return null;
      }
      
      // Step 2: Validate and select one recipe and one quote
      let finalSelection: ValidateAndSelectOutput | null | undefined = null;
      try {
          const { output } = await validateAndSelectPrompt({
              recipeOptions: optionsOutput.recipeOptions,
              quoteOptions: optionsOutput.quoteOptions,
              seenRecipeTitles: flowInput.seenRecipeTitles,
              seenQuotes: flowInput.seenQuotes,
          });
          finalSelection = output;
      } catch(e: any) {
          console.error(`Recipe selection/validation failed:`, e);
          // Fallback: if validation fails, just pick the first option to not fail the whole process
          finalSelection = {
              selectedRecipe: optionsOutput.recipeOptions[0],
              selectedQuote: optionsOutput.quoteOptions[0],
          };
      }

      if (!finalSelection) {
        return null;
      }
      
      const { selectedRecipe, selectedQuote } = finalSelection;

      // Step 3: Generate an image for the selected recipe
      let media;
      try {
        const result = await ai.generate({
          model: 'googleai/gemini-2.0-flash-preview-image-generation',
          prompt: 'Generate a photorealistic image of ' + selectedRecipe.recipeName,
          config: {
            responseModalities: ['TEXT', 'IMAGE'],
          },
        });
        media = result.media;
      } catch (e) {
        console.error(`Image generation failed:`, e);
      }

      // Step 4: Combine and return the final output
      return {
        recipeName: selectedRecipe.recipeName,
        description: selectedRecipe.description,
        instructions: selectedRecipe.instructions,
        ingredientList: selectedRecipe.ingredientList,
        missingIngredients: selectedRecipe.missingIngredients,
        nutritionalInformation: selectedRecipe.nutritionalInformation,
        quote: selectedQuote.quote,
        quoteAuthor: selectedQuote.quoteAuthor,
        photoDataUri: media?.url || '',
      };
    }
  );

  return generateRecipeFlow(input);
}
