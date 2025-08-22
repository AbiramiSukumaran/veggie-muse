
/**
 * @fileOverview Zod schemas and TypeScript types for the Culinary Passport feature.
 * This file is intended for shared data structures between the client and server.
 */
import { z } from 'zod';

// Input from the user form
export const GenerateCulinaryPassportInputSchema = z.object({
  destination: z.string().min(3, { message: "Please enter a destination." }),
  dietaryNeeds: z.string().min(5, { message: "Please describe your dietary needs." }),
  preferences: z.string().optional(),
  seenDishes: z.array(z.string()).optional().describe("A list of dishes that have already been shown to the user for this destination."),
});
export type GenerateCulinaryPassportInput = z.infer<typeof GenerateCulinaryPassportInputSchema>;


// Intermediate schema for the text-only part of the passport
const DishRecommendationSchema = z.object({
  dishNameEnglish: z.string().describe('The name of the recommended dish in English.'),
  dishNameLocal: z.string().describe('The name of the recommended dish in the local language.'),
  description: z.string().describe('A brief, appetizing description of the dish.'),
});

export const CulinaryPassportTextSchema = z.object({
  recommendations: z.array(DishRecommendationSchema).max(3).describe('A list of 3 recommended local dishes.'),
  chefCardMessage: z.string().describe('A polite message to a chef or waiter in the local language, clearly stating dietary needs.'),
});
export type CulinaryPassportText = z.infer<typeof CulinaryPassportTextSchema>;


// Final output schema for the entire passport, including generated media
export const CulinaryPassportSchema = z.object({
  recommendations: z.array(
    DishRecommendationSchema.extend({
      photoDataUri: z.string().describe("A photorealistic image of the dish as a data URI."),
    })
  ).describe('A list of recommended local dishes with photos.'),
  chefCardMessage: z.string().describe('A polite message to a chef or waiter in the local language.'),
  chefCardAudioUri: z.string().describe('An audio file (WAV format) of the chef card message as a data URI.'),
});
export type CulinaryPassport = z.infer<typeof CulinaryPassportSchema>;
