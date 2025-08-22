
"use client";

import { useState, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from "@/hooks/use-toast";
import { useAppContext } from '@/contexts/app-context';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, CalendarDays, ChefHat, CookingPot, Leaf, ArrowLeft, ShoppingCart, Download } from 'lucide-react';
import { generateWeeklyPlan } from '@/ai/flows/generate-weekly-plan';
import { WeeklyPlan, GenerateWeeklyPlanInputSchema } from '@/ai/schemas/weekly-plan-schemas';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { AlertTriangle } from 'lucide-react';


type WeeklyPlanFormValues = z.infer<typeof GenerateWeeklyPlanInputSchema>;


export default function WeeklyPlanGenerator() {
    const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const { apiKey, isApiKeySet, seenWeeklyPlanTitles, addSeenWeeklyPlanTitle } = useAppContext();

    const form = useForm<WeeklyPlanFormValues>({
        resolver: zodResolver(GenerateWeeklyPlanInputSchema),
        defaultValues: {
            cuisinePreference: 'Indian',
            dietaryRestrictions: [],
        },
    });

    async function onSubmit(data: WeeklyPlanFormValues) {
        if (!apiKey) {
            toast({
                variant: "destructive",
                title: "API Key is missing.",
                description: "Please provide your API key to generate a plan.",
            });
            return;
        }

        setIsLoading(true);
        setWeeklyPlan(null);

        try {
          const result = await generateWeeklyPlan({ 
            ...data,
            seenPlanTitles: seenWeeklyPlanTitles,
          }, apiKey);
          if (result) {
            setWeeklyPlan(result);
            if(result.planTitle) {
                addSeenWeeklyPlanTitle(result.planTitle);
            }
          } else {
            toast({
                variant: "destructive",
                title: "Generation Failed",
                description: "The AI model seems to be overloaded. Please try again in a few minutes.",
            });
          }
        } catch (error: any) {
          console.error(error);
          if (error.message === 'SAFETY_BLOCK') {
            toast({
              variant: "destructive",
              title: "Unsafe Preferences Detected",
              description: "I'm sorry, but I can't create a plan with those preferences due to safety concerns. Please adjust your request.",
            });
          } else {
            toast({
              variant: "destructive",
              title: "An unexpected error occurred.",
              description: "Failed to generate a weekly plan. Your API key might be invalid or the service may be temporarily down.",
            });
          }
        } finally {
          setIsLoading(false);
        }
    }
    
    const handleDownloadShoppingList = useCallback((ingredients: string[]) => {
      const uniqueIngredients = [...new Set(ingredients)];
      const textContent = uniqueIngredients.join('\n');
      const blob = new Blob([textContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'weekly-shopping-list.txt';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, []);
    
    const isUiDisabled = !isApiKeySet || isLoading;

    const renderForm = () => (
      <Card className="w-full shadow-lg border-2 border-border/70">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <fieldset disabled={isUiDisabled} className="group">
              <CardHeader>
                <CardTitle className="font-headline text-2xl flex items-center gap-2"><CalendarDays size={24} />Plan Your Week of Fresh Meals</CardTitle>
                <CardDescription>Tell us your preferences, and we'll create a 5-day meal prep plan that keeps your food fresh and delicious.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 group-disabled:opacity-50">
                <FormField
                  control={form.control}
                  name="cuisinePreference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cuisine Preference</FormLabel>
                      <FormControl>
                          <Input placeholder="e.g., Italian, Mexican and Italian fusion, Quick lunches" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="dietaryRestrictions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dietary Needs or Dislikes</FormLabel>
                      <FormControl>
                        <Input 
                            placeholder="e.g., gluten-free, no mushrooms (comma-separated)" 
                            // This little dance is to manage a string in the input for an array in the form state
                            onChange={e => field.onChange(e.target.value.split(',').map(s => s.trim()))}
                            value={Array.isArray(field.value) ? field.value.join(', ') : ''}
                         />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={isUiDisabled} className="w-full">
                  <Sparkles className="mr-2 h-4 w-4" />
                  {isLoading ? 'Generating Plan...' : isApiKeySet ? 'Generate Weekly Plan' : 'Please Enter API Key'}
                </Button>
              </CardFooter>
            </fieldset>
          </form>
        </Form>
      </Card>
    );

    const renderLoading = () => (
      <Card className="w-full shadow-lg border-2 border-border/70">
        <CardHeader>
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );

    const renderPlan = () => {
      if (!weeklyPlan) return null;
      const uniqueShoppingList = [...new Set(weeklyPlan.consolidatedShoppingList)];

      return (
        <Card className="w-full shadow-lg border-2 border-border/70 animate-in fade-in-50 duration-500">
          <CardHeader>
            <Button variant="ghost" size="sm" onClick={() => { setWeeklyPlan(null); }} className="mb-2 self-start px-2">
               <ArrowLeft className="mr-2 h-4 w-4" />
              Generate Another Plan
            </Button>
            <CardTitle className="font-headline text-3xl">{weeklyPlan.planTitle}</CardTitle>
            <CardDescription>{weeklyPlan.planDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="multiple" defaultValue={["prep", "day-1"]} className="w-full">
              <AccordionItem value="prep">
                <AccordionTrigger className="text-xl font-headline"><ChefHat className="mr-2 h-6 w-6 text-primary"/>Weekend Prep Plan</AccordionTrigger>
                <AccordionContent className="prose prose-sm dark:prose-invert whitespace-pre-line text-base leading-relaxed">
                  {weeklyPlan.prepPlan}
                </AccordionContent>
              </AccordionItem>

              {weeklyPlan.dailyRecipes.map((day, index) => (
                <AccordionItem value={`day-${index + 1}`} key={index}>
                  <AccordionTrigger className="text-lg font-headline"><Leaf className="mr-2 h-5 w-5 text-primary"/>Day {index + 1}: {day.recipeName}</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                        <div>
                            <h4 className="font-bold flex items-center gap-2"><CookingPot size={16}/> Ingredients:</h4>
                            <ul className="list-disc pl-6 space-y-1 text-base">
                                {day.ingredients.map((item, i) => <li key={i}>{item}</li>)}
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold">Instructions:</h4>
                            <p className="prose prose-sm dark:prose-invert whitespace-pre-line text-base leading-relaxed">{day.instructions}</p>
                        </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}

              {uniqueShoppingList && uniqueShoppingList.length > 0 && (
                 <AccordionItem value="shopping-list">
                    <AccordionTrigger className="text-xl font-headline"><ShoppingCart className="mr-2 h-6 w-6 text-primary"/>Weekly Shopping List</AccordionTrigger>
                    <AccordionContent>
                        <p className="text-sm text-muted-foreground mb-4">Here is a consolidated list of all unique ingredients you'll need for the week.</p>
                        <div className="bg-white dark:bg-gray-800/20 p-6 rounded-md border border-dashed shadow-sm mb-4 font-mono">
                           <h3 className="text-lg font-bold mb-4 text-center font-headline text-gray-800 dark:text-gray-200">Shopping List</h3>
                           <ul className="space-y-2">
                                {uniqueShoppingList.map((item, index) => (
                                    <li key={index} className="flex items-center">
                                        <span className="inline-block w-4 h-4 border-2 border-gray-400 dark:border-gray-500 rounded-sm mr-3"></span>
                                        <span className="text-gray-800 dark:text-gray-200">{item}</span>
                                    </li>
                                ))}
                           </ul>
                        </div>
                        <Button onClick={() => handleDownloadShoppingList(uniqueShoppingList)}>
                            <Download className="mr-2 h-4 w-4" /> 
                            Download as .txt
                        </Button>
                    </AccordionContent>
                 </AccordionItem>
               )}
            </Accordion>
          </CardContent>
        </Card>
      );
    };

    if (isLoading) return renderLoading();
    if (weeklyPlan) return renderPlan();
    return renderForm();
}
