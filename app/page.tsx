
"use client";

import RecipeGenerator from '@/components/recipe-generator';
import WeeklyPlanGenerator from '@/components/weekly-plan-generator';
import CulinaryPassportGenerator from '@/components/culinary-passport-generator';
import FeatureGuide from '@/components/feature-guide';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppContext } from '@/contexts/app-context';
import { Button } from '@/components/ui/button';
import { Heart, KeyRound } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export default function Home() {
  const { setApiKey, isApiKeySet } = useAppContext();

  return (
    <main className="flex min-h-screen flex-col items-center p-4 sm:p-8 md:p-12">
      <div className="w-full max-w-4xl mx-auto flex-1 flex flex-col">
        <header className="mb-10 w-full relative">
           <div className="absolute top-0 right-0 flex items-center gap-2">
            {isApiKeySet && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={() => setApiKey(null)} className="h-6 w-6">
                      <KeyRound className="h-4 w-4 text-muted-foreground" />
                      <span className="sr-only">Change API Key</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Change API Key</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <FeatureGuide />
          </div>
          <h1 className="font-headline text-4xl md:text-6xl font-bold tracking-tight text-foreground text-center">
            Veggie Muse
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground text-center mt-4">
            Craft a culinary adventure from your mood and pantry.
          </p>
        </header>

        <Tabs defaultValue="recipe" className="w-full">
          <TabsList className="grid w-full grid-cols-1 h-auto sm:h-10 sm:grid-cols-3">
            <TabsTrigger value="recipe">Single Recipe</TabsTrigger>
            <TabsTrigger value="weekly-plan">Weekly Meal Plan</TabsTrigger>
            <TabsTrigger value="passport">Culinary Passport</TabsTrigger>
          </TabsList>
          <TabsContent value="recipe">
            <div className="max-w-2xl mx-auto">
              <RecipeGenerator />
            </div>
          </TabsContent>
          <TabsContent value="weekly-plan">
            <WeeklyPlanGenerator />
          </TabsContent>
          <TabsContent value="passport">
              <CulinaryPassportGenerator />
          </TabsContent>
        </Tabs>
      </div>
      <footer className="mt-12 text-center text-muted-foreground">
        <p className="flex items-center justify-center gap-1.5 text-sm">
          Made with <Heart className="w-4 h-4 text-red-500 fill-current" /> by
          <a
            href="http://linkedin.com/in/abiramisukumaran"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary hover:underline"
          >
            Abirami Sukumaran
          </a>
        </p>
      </footer>
    </main>
  );
}
