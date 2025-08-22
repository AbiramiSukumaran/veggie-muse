
'use server';
/**
 * @fileOverview A conversational AI flow for a cooking assistant chatbot using the native Google AI SDK.
 *
 * - chatWithChef - A function that handles the chat conversation.
 * - ChatInput - The input type for the chat function.
 * - HistoryPart - The type for a single message in the chat history.
 */

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, type Content } from '@google/generative-ai';
import { z } from 'zod';

// Define the schema for a single message in the chat history
// This remains for client-side validation but will be mapped to the SDK's format.
const HistoryPartSchema = z.object({
  role: z.enum(['user', 'model']),
  parts: z.array(z.object({ text: z.string() })),
});
export type HistoryPart = z.infer<typeof HistoryPartSchema>;

// Define the schema for the chat function's input
const ChatInputSchema = z.object({
  history: z.array(HistoryPartSchema),
  message: z.string().describe('The latest message from the user.'),
});
export type ChatInput = z.infer<typeof ChatInputSchema>;


/**
 * Handles a chat conversation with the Gemini model using the native Google AI SDK.
 * @param input The user's input, including the latest message and history.
 * @param apiKey The user's Google AI API key.
 * @returns The model's response as a string.
 */
export async function chatWithChef(input: ChatInput, apiKey: string): Promise<string> {
  if (!apiKey) {
    throw new Error('API Key is required for this operation.');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction: `You are a friendly and knowledgeable vegetarian cooking assistant named "Veggie.ai".
Your purpose is to help users with their cooking questions, provide tips, suggest ingredient substitutions, and explain cooking techniques.
You specialize in vegetarian cuisine.
Keep your answers concise, helpful, and encouraging.
Always maintain a warm and conversational tone.
If you don't know the answer to something, it's okay to say so.
Do not answer questions that are not related to cooking, food, or recipes.`,
  });

  // Map the input history to the format expected by the GoogleGenerativeAI SDK
  const historyForSDK: Content[] = input.history.map(h => ({
    role: h.role,
    parts: h.parts.map(p => ({ text: p.text })),
  }));

  const chat = model.startChat({
    history: historyForSDK,
    safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
    ]
  });

  try {
    const result = await chat.sendMessage(input.message);
    const response = result.response;
    const text = response.text();
    return text;
  } catch (error: any) {
    console.error("Error sending message to Gemini:", error);
     if (error.message && error.message.includes('SAFETY')) {
        return "I'm sorry, but I can't respond to that due to safety guidelines. Let's talk about something else related to vegetarian cooking!";
    }
    return "I'm sorry, I seem to be at a loss for words. Could you ask that a different way?";
  }
}
