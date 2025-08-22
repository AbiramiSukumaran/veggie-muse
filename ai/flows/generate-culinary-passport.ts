
'use server';
/**
 * @fileOverview A Culinary Passport AI agent that helps travelers with dietary needs.
 *
 * - generateCulinaryPassport - A function that handles the passport generation.
 */

import { dynamicGenkit } from '@/ai/genkit';
import wav from 'wav';
import {
  GenerateCulinaryPassportInput,
  GenerateCulinaryPassportInputSchema,
  CulinaryPassport,
  CulinaryPassportSchema,
  CulinaryPassportText,
  CulinaryPassportTextSchema,
} from '@/ai/schemas/culinary-passport-schemas';


export async function generateCulinaryPassport(input: GenerateCulinaryPassportInput, apiKey: string): Promise<CulinaryPassport> {
  if (!apiKey) {
    throw new Error('API Key is required for this operation.');
  }
  const ai = dynamicGenkit(apiKey);

  // 1. Text Generation Prompt
  const passportTextPrompt = ai.definePrompt({
    name: 'generatePassportTextPrompt',
    model: 'googleai/gemini-2.0-flash',
    input: { schema: GenerateCulinaryPassportInputSchema },
    output: { schema: CulinaryPassportTextSchema },
    config: {
       safetySettings: [
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
      ],
    },
    prompt: `You are a culinary travel expert for vegetarians with dietary restrictions.
Create a "Culinary Passport" for a traveler going to {{{destination}}}.

Their critical dietary needs are: {{{dietaryNeeds}}}.
Their optional preferences are: {{{preferences}}}.

1.  **Recommend 3 local dishes** that are either naturally vegetarian or can be easily made vegetarian and will not contain their allergens. Provide the dish name in English and the local language, and a short description.
2.  **Write a "Chef Card."** This is a polite, concise message in the local language of the destination. It must clearly state the traveler's dietary needs so they can show it to a waiter. It should be friendly and respectful.

{{#if seenDishes}}
You have already recommended the following dishes for this destination. Do not recommend them again:
{{#each seenDishes}}
- {{{this}}}
{{/each}}
{{/if}}

Output MUST be in JSON format, matching the schema.`,
  });

  // Helper function to convert PCM audio buffer to WAV base64 string
  async function toWav(pcmData: Buffer): Promise<string> {
    return new Promise((resolve, reject) => {
      const writer = new wav.Writer({
        channels: 1,
        sampleRate: 24000,
        bitDepth: 16,
      });

      const bufs: Buffer[] = [];
      writer.on('data', (chunk) => bufs.push(chunk));
      writer.on('end', () => resolve(Buffer.concat(bufs).toString('base64')));
      writer.on('error', reject);

      writer.write(pcmData);
      writer.end();
    });
  }

  // Generates a fallback passport object when AI generation fails completely.
  function createFallbackPassport(destination: string): CulinaryPassport {
    return {
      recommendations: [], // Empty array indicates failure to the UI
      chefCardMessage: `We're sorry, we couldn't generate a culinary passport for ${destination} at this moment due to high demand. Please try again in a few minutes.`,
      chefCardAudioUri: '',
    };
  }

  // 2. Main Flow
  const culinaryPassportFlow = ai.defineFlow(
    {
      name: 'culinaryPassportFlow',
      inputSchema: GenerateCulinaryPassportInputSchema,
      outputSchema: CulinaryPassportSchema,
    },
    async (flowInput) => {
      // Step 1: Generate all the text content first, with retries for transient errors
      let textOutput: CulinaryPassportText | null | undefined = null;
      let textAttempts = 0;
      const maxTextAttempts = 3;

      while (!textOutput && textAttempts < maxTextAttempts) {
        textAttempts++;
        try {
          const result = await passportTextPrompt(flowInput);
          textOutput = result.output;
        } catch (e: any) {
          console.error(`Passport text generation attempt ${textAttempts} failed:`, e);
          if (e.message.includes('SAFETY')) {
            // Re-throw a specific error for the frontend to catch
            throw new Error('SAFETY_BLOCK');
          }
          if (textAttempts >= maxTextAttempts) {
            console.error('Failed to generate culinary passport text after multiple attempts. Returning fallback.');
            return createFallbackPassport(flowInput.destination);
          }
        }
      }

      if (!textOutput) {
        console.error('Failed to generate culinary passport text. Returning fallback.');
        return createFallbackPassport(flowInput.destination);
      }

      // Step 2: In parallel, generate images for recommendations and audio for the chef card
      const imagePromises = textOutput.recommendations.map(async (rec) => {
        let media;
        let attempts = 0;
        const maxAttempts = 3;

        while (!media && attempts < maxAttempts) {
          attempts++;
          try {
            const result = await ai.generate({
              model: 'googleai/gemini-2.0-flash-preview-image-generation',
              prompt: `A photorealistic, appetizing photo of ${rec.dishNameEnglish}, a popular dish from ${flowInput.destination}.`,
              config: { responseModalities: ['TEXT', 'IMAGE'] },
            });
            media = result.media;
          } catch (e) {
            console.error(`Image generation attempt ${attempts} failed for ${rec.dishNameEnglish}:`, e);
            if (attempts >= maxAttempts) {
              console.error(`Failed to generate image for ${rec.dishNameEnglish} after multiple attempts.`);
            }
          }
        }

        return {
          ...rec,
          photoDataUri: media?.url || '',
        };
      });

      const audioPromise = async (): Promise<string> => {
        if (!textOutput?.chefCardMessage) {
            return '';
        }
        let media;
        let attempts = 0;
        const maxAttempts = 3;
        while (!media && attempts < maxAttempts) {
          attempts++;
          try {
            const result = await ai.generate({
              model: 'googleai/gemini-2.5-flash-preview-tts',
              prompt: textOutput.chefCardMessage,
              config: {
                responseModalities: ['AUDIO'],
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: 'Algenib' },
                  },
                },
              },
            });
            media = result.media;
          } catch (e) {
            console.error(`Audio generation attempt ${attempts} failed:`, e);
            if (attempts >= maxAttempts) {
              console.error('Failed to generate audio after multiple attempts. Continuing without audio.');
              return '';
            }
          }
        }
        if (!media?.url) {
          console.error('Audio generation resulted in no media URL. Continuing without audio.');
          return '';
        }
        const pcmBuffer = Buffer.from(media.url.substring(media.url.indexOf(',') + 1), 'base64');
        const wavBase64 = await toWav(pcmBuffer);
        return `data:audio/wav;base64,${wavBase64}`;
      };

      // Step 3: Await all parallel generations
      const [recommendationsWithPhotos, chefCardAudioUri] = await Promise.all([
        Promise.all(imagePromises),
        audioPromise(),
      ]);

      return {
        recommendations: recommendationsWithPhotos,
        chefCardMessage: textOutput.chefCardMessage,
        chefCardAudioUri: chefCardAudioUri,
      };
    }
  );

  return culinaryPassportFlow(input);
}
