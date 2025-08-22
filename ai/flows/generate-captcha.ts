
'use server';
/**
 * @fileOverview A CAPTCHA generation agent.
 *
 * - generateCaptcha - A function that handles CAPTCHA generation.
 */

import { dynamicGenkit } from '@/ai/genkit';
import { GenerateCaptchaOutput, GenerateCaptchaOutputSchema } from '@/ai/schemas/captcha-schemas';
import { z } from 'genkit';


function generateMathProblem() {
  const num1 = Math.floor(Math.random() * 10) + 1; // 1-10
  const num2 = Math.floor(Math.random() * 10) + 1; // 1-10
  const operations = ['+', '-', '*'];
  const operation = operations[Math.floor(Math.random() * operations.length)];
  let answer;
  let question = `What is ${num1} ${operation} ${num2}?`;

  switch (operation) {
    case '+':
      answer = num1 + num2;
      break;
    case '-':
      // Ensure the result is not negative for simplicity
      if (num1 < num2) {
        question = `What is ${num2} - ${num1}?`;
        answer = num2 - num1;
      } else {
        answer = num1 - num2;
      }
      break;
    case '*':
      answer = num1 * num2;
      break;
  }

  return {
    question: question,
    answer: String(answer),
  };
}

export async function generateCaptcha(apiKey: string): Promise<GenerateCaptchaOutput | null> {
    if (!apiKey) {
        throw new Error('API Key is required for this operation.');
    }
    // We don't use the AI here, but we keep the structure for consistency.
    // In a real app, you might not even need the API key for this specific flow.

    const captchaFlow = async (): Promise<GenerateCaptchaOutput | null> => {
        try {
            const problem = generateMathProblem();
            return {
                question: problem.question,
                answer: problem.answer,
            };
        } catch (e) {
            console.error(`CAPTCHA generation failed:`, e);
            return null;
        }
    };

    return captchaFlow();
}
