
import {genkit, GenerationCommonConfig} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// This is the default AI instance, used for operations that don't require a user-provided key.
// It will use the GOOGLE_API_KEY from the server's environment variables.
export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_API_KEY,
    }),
  ],
});


/**
 * Creates a dynamic Genkit instance configured with a user-provided API key.
 * This function should be called at the beginning of any flow that needs to
 * use the user's personal API key for authentication.
 *
 * @param {string} apiKey - The user's Google AI API key.
 * @returns A Genkit instance configured with the provided key.
 */
export function dynamicGenkit(apiKey: string) {
    return genkit({
        plugins: [
            googleAI({ apiKey }),
        ],
    });
}
