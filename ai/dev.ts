
import { config } from 'dotenv';
config();

import '@/ai/flows/generate-recipe.ts';
import '@/ai/flows/generate-weekly-plan.ts';
import '@/ai/flows/generate-culinary-passport.ts';
import '@/ai/tools/recipe-finder';
import '@/ai/flows/chat.ts';
import '@/ai/schemas/weekly-plan-schemas';
import '@/ai/schemas/culinary-passport-schemas';
import '@/ai/schemas/recipe-schemas';
import '@/ai/flows/generate-captcha';
import '@/ai/schemas/captcha-schemas';

