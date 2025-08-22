
/**
 * @fileOverview Zod schemas and TypeScript types for the CAPTCHA feature.
 */

import { z } from 'genkit';

export const GenerateCaptchaOutputSchema = z.object({
  question: z.string().describe(
    "The CAPTCHA question as a string."
  ),
  answer: z.string().describe('The correct answer for the CAPTCHA.'),
});
export type GenerateCaptchaOutput = z.infer<typeof GenerateCaptchaOutputSchema>;
