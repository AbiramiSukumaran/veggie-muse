
"use client";

import { useState, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { generateRecipe } from '@/ai/flows/generate-recipe';
import type { GenerateRecipeOutput } from '@/ai/schemas/recipe-schemas';
import { useToast } from "@/hooks/use-toast";
import { useAppContext } from '@/contexts/app-context';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Soup, ArrowLeft, ScrollText, List, HeartPulse, Camera, Trash2, Pencil, Clock, ShoppingCart, Download, Image as ImageIcon, Quote } from 'lucide-react';
import { cn } from '@/lib/utils';


const recipeFormSchema = z.object({
  mood: z.array(z.number()).min(1).max(1),
  duration: z.string().optional(),
  dislikedIngredients: z.string().optional(),
  availableIngredients: z.array(z.string()),
  additionalIngredients: z.string().optional(),
  photo: z.any().optional(), // For file input
}).superRefine(
    (data, ctx) => {
        // We need to access the photo state from outside the form data.
        // This is a bit of a hack, but it's the cleanest way to do it with react-hook-form.
        // The real check happens in the component's state (`ingredientPhoto`).
        if (
            data.availableIngredients.length === 0 &&
            (!data.additionalIngredients || data.additionalIngredients.trim() === '') &&
            !data.photo // This is a placeholder; real logic is in the component.
        ) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Please provide at least one ingredient via photo, checklist, or text input.",
                path: ["availableIngredients"],
            });
        }
    }
);


type RecipeFormValues = z.infer<typeof recipeFormSchema>;

const COMMON_INGREDIENTS = [
    'Almonds', 'Avocado', 'Bell Peppers', 'Black Beans', 'Black Pepper', 'Broccoli', 'Butter', 'Carrots', 'Cauliflower', 'Celery', 'Cheese', 'Chia Seeds', 'Chickpeas', 'Cilantro', 'Coconut Milk', 'Coconut Oil', 'Corn', 'Cumin', 'Cucumber', 'Eggs', 'Eggplant', 'Flour', 'Garlic', 'Ginger', 'Honey', 'Kale', 'Lemon', 'Lentils', 'Lime', 'Maple Syrup', 'Milk', 'Mushrooms', 'Oats', 'Olive Oil', 'Onion', 'Paprika', 'Pasta', 'Peas', 'Potatoes', 'Quinoa', 'Rice', 'Salt', 'Spinach', 'Sweet Potato', 'Tofu', 'Tomatoes', 'Turmeric', 'Walnuts', 'Zucchini'
];

const moodMap: { [key: number]: 'Comforting' | 'Cozy' | 'Happy' | 'Adventurous' | 'Energized' | 'Romantic' | 'Celebratory' | 'Healthy' } = {
  0: 'Comforting',
  1: 'Cozy',
  2: 'Happy',
  3: 'Adventurous',
  4: 'Energized',
  5: 'Romantic',
  6: 'Celebratory',
  7: 'Healthy',
};
const moodLabels = Object.values(moodMap);

export default function RecipeGenerator() {
    const [recipe, setRecipe] = useState<GenerateRecipeOutput | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [ingredientPhoto, setIngredientPhoto] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();
    const { apiKey, isApiKeySet, seenQuotes, addSeenQuote, seenRecipeTitles, addSeenRecipeTitle } = useAppContext();

    const form = useForm<RecipeFormValues>({
        resolver: zodResolver(recipeFormSchema),
        defaultValues: {
            mood: [1],
            duration: "30",
            dislikedIngredients: '',
            availableIngredients: [],
            additionalIngredients: '',
        },
    });

    const watchedMood = form.watch('mood');

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setIngredientPhoto(reader.result as string);
                 // Manually set a value for the photo field to satisfy the validator
                form.setValue('photo', 'uploaded');
                form.clearErrors('availableIngredients');
            };
            reader.readAsDataURL(file);
        }
    };

    const removePhoto = () => {
        setIngredientPhoto(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        // Manually clear the photo field value
        form.setValue('photo', null);
    };

    async function onSubmit(data: RecipeFormValues) {
        // Final validation check including the photo
        if (
            data.availableIngredients.length === 0 &&
            (!data.additionalIngredients || data.additionalIngredients.trim() === '') &&
            !ingredientPhoto
        ) {
            form.setError("availableIngredients", {
                type: "manual",
                message: "Please provide at least one ingredient via photo, checklist, or text input."
            });
            return;
        }


        if (!apiKey) {
            toast({
                variant: "destructive",
                title: "API Key is missing.",
                description: "Please provide your API key to generate a recipe.",
            });
            return;
        }

        setIsLoading(true);
        setRecipe(null);

        const disliked = data.dislikedIngredients
            ? data.dislikedIngredients.split(',').map(s => s.trim()).filter(Boolean)
            : [];
        const additional = data.additionalIngredients
            ? data.additionalIngredients.split(',').map(s => s.trim()).filter(Boolean)
            : [];

        try {
          // Pass the current seen lists to the backend.
          const result = await generateRecipe({
            mood: moodMap[data.mood[0]],
            vegetarian: true,
            duration: data.duration,
            dislikedIngredients: disliked,
            availableIngredients: data.availableIngredients,
            additionalIngredients: additional,
            photoDataUri: ingredientPhoto || undefined,
            seenQuotes,
            seenRecipeTitles,
          }, apiKey);

          if (result) {
            setRecipe(result);
            // After getting a result, update the seen lists in the context.
            // This ensures the next generation will have the updated list.
            addSeenQuote(result.quote);
            addSeenRecipeTitle(result.recipeName);
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
              title: "Unsafe Ingredients Detected",
              description: "I'm sorry, but I can't create a recipe with those ingredients. Let's stick to safe and edible items!",
            });
          } else {
            toast({
              variant: "destructive",
              title: "An unexpected error occurred.",
              description: "Failed to generate a recipe. Your API key might be invalid or the service may be temporarily down.",
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
      link.download = 'shopping-list.txt';
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
                <CardTitle className="font-headline text-2xl flex items-center gap-2"><Soup size={24} />Tell us what you have</CardTitle>
                <CardDescription>...and how you're feeling today, and we'll whip up something special for you.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8 group-disabled:opacity-50">
                <FormItem>
                  <FormLabel>Have a photo of your ingredients?</FormLabel>
                  <FormControl>
                      <div>
                          <input
                              type="file"
                              accept="image/*"
                              ref={fileInputRef}
                              onChange={handleFileChange}
                              className="hidden"
                          />
                          {ingredientPhoto ? (
                              <div className="relative group/photo">
                                  <Image src={ingredientPhoto} alt="Ingredients" width={500} height={280} className="rounded-lg object-cover w-full aspect-video" />
                                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover/photo:opacity-100 transition-opacity rounded-lg">
                                      <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                                          <Pencil className="mr-2" /> Change
                                      </Button>
                                      <Button type="button" variant="destructive" size="sm" className="ml-2" onClick={removePhoto}>
                                          <Trash2 className="mr-2" /> Remove
                                      </Button>
                                  </div>
                              </div>
                          ) : (
                              <Button type="button" variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()}>
                                  <Camera className="mr-2" /> Upload Photo
                              </Button>
                          )}
                      </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>

                <FormField
                  control={form.control}
                  name="mood"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>What's your mood? <span className="font-bold text-primary">{moodLabels[watchedMood?.[0] ?? 1]}</span></FormLabel>
                      <FormControl>
                        <Slider
                          min={0}
                          max={moodLabels.length - 1}
                          step={1}
                          defaultValue={field.value}
                          onValueChange={(value) => field.onChange([value[0]])}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>How much time do you have?</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                              <SelectTrigger>
                                  <Clock className="mr-2 h-4 w-4" />
                                  <SelectValue placeholder="Select a time" />
                              </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                              <SelectItem value="15">Under 15 minutes</SelectItem>
                              <SelectItem value="30">15-30 minutes</SelectItem>
                              <SelectItem value="60">30-60 minutes</SelectItem>
                              <SelectItem value="120">Over 60 minutes</SelectItem>
                          </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="availableIngredients"
                  render={() => (
                    <FormItem>
                      <div className="mb-2">
                        <FormLabel>Check off ingredients you have</FormLabel>
                      </div>
                      <ScrollArea className="h-48 w-full pr-4">
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {COMMON_INGREDIENTS.map((item) => (
                              <FormField
                                key={item}
                                control={form.control}
                                name="availableIngredients"
                                render={({ field }) => {
                                  return (
                                    <FormItem
                                      key={item}
                                      className="flex flex-row items-start space-x-3 space-y-0"
                                    >
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value?.includes(item)}
                                          onCheckedChange={(checked) => {
                                            return checked
                                              ? field.onChange([...(field.value ?? []), item])
                                              : field.onChange(
                                                  field.value?.filter(
                                                    (value) => value !== item
                                                  )
                                                )
                                          }}
                                        />
                                      </FormControl>
                                      <FormLabel className="font-normal">
                                        {item}
                                      </FormLabel>
                                    </FormItem>
                                  )
                                }}
                              />
                            ))}
                          </div>
                      </ScrollArea>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="additionalIngredients"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Any other ingredients or preferences or a dish you fancy?</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., nutritional yeast, paprika (comma-separated)" {...field} />
                      </FormControl>
                      <FormDescription>
                        We'll generate a shopping list for anything you're missing.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dislikedIngredients"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Any ingredients you dislike?</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., cilantro, olives (comma-separated)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={isUiDisabled} className="w-full">
                  <Sparkles className="mr-2 h-4 w-4" />
                  {isLoading ? 'Generating...' : isApiKeySet ? 'Generate Recipe' : 'Please Enter API Key'}
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
          <Skeleton className="w-full h-64" />
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );

    const renderRecipe = () => {
      if (!recipe) return null;

      const cleanedQuote = recipe.quote.trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
      const uniqueMissingIngredients = recipe.missingIngredients ? [...new Set(recipe.missingIngredients)] : [];

      return (
        <Card className="w-full shadow-lg border-2 border-border/70 animate-in fade-in-50 duration-500">
          <CardHeader>
            <Button variant="ghost" size="sm" onClick={() => { setRecipe(null); }} className="mb-2 self-start px-2">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Generate Another
            </Button>
            <CardTitle className="font-headline text-3xl">{recipe.recipeName}</CardTitle>
            <CardDescription className="text-base italic text-muted-foreground">{recipe.description}</CardDescription>
          </CardHeader>
          <CardContent>
             {recipe.photoDataUri ? (
                <div className="mb-6 rounded-lg overflow-hidden relative aspect-video w-full">
                    <Image src={recipe.photoDataUri} alt={recipe.recipeName} layout="fill" objectFit="cover" data-ai-hint="food meal" />
                </div>
            ) : (
                <div className="mb-6 rounded-lg relative aspect-video w-full bg-muted flex items-center justify-center">
                    <ImageIcon className="text-muted-foreground h-12 w-12" />
                </div>
            )}

            {recipe.quote && (
              <div 
                className={cn(
                  "my-6 p-6 rounded-lg border text-center relative overflow-hidden",
                  "animate-in fade-in-0 zoom-in-95 duration-500",
                  "bg-gradient-to-r from-amber-200 via-yellow-200 to-amber-300",
                  "dark:from-amber-800 dark:via-yellow-800 dark:to-amber-900"
                )}
                style={{
                  '--tw-gradient-stops': 'var(--tw-gradient-from) 10%, var(--tw-gradient-to) 90%',
                  animation: 'shine 5s linear infinite',
                  backgroundSize: '200% 200%'
                }}
              >
                <Quote className="mx-auto h-8 w-8 text-yellow-600 dark:text-yellow-400 mb-4" />
                <blockquote className="font-headline text-2xl md:text-3xl italic text-yellow-900 dark:text-yellow-100">
                  &ldquo;{cleanedQuote}&rdquo;
                </blockquote>
                {recipe.quoteAuthor && (
                  <cite className="block text-right text-sm text-yellow-800 dark:text-yellow-300 mt-4">&mdash; {recipe.quoteAuthor}</cite>
                )}
              </div>
            )}

            <Accordion type="multiple" defaultValue={["instructions", "ingredients", "shopping-list"]} className="w-full">
              <AccordionItem value="instructions">
                <AccordionTrigger className="text-lg font-headline"><ScrollText className="mr-2 h-5 w-5 text-primary"/>Instructions</AccordionTrigger>
                <AccordionContent className="prose prose-sm dark:prose-invert whitespace-pre-line text-base leading-relaxed">
                  {recipe.instructions}
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="ingredients">
                <AccordionTrigger className="text-lg font-headline"><List className="mr-2 h-5 w-5 text-primary"/>Ingredients</AccordionTrigger>
                <AccordionContent>
                  <ul className="list-disc pl-6 space-y-1 text-base">
                    {recipe.ingredientList.map((item, index) => <li key={index}>{item}</li>)}
                  </ul>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="shopping-list">
                <AccordionTrigger className="text-lg font-headline"><ShoppingCart className="mr-2 h-5 w-5 text-primary"/>Shopping List</AccordionTrigger>
                <AccordionContent>
                    {uniqueMissingIngredients && uniqueMissingIngredients.length > 0 ? (
                        <>
                            <div className="bg-white dark:bg-gray-800/20 p-6 rounded-md border border-dashed shadow-sm mb-4 font-mono">
                                <h3 className="text-lg font-bold mb-4 text-center font-headline text-gray-800 dark:text-gray-200">Missing Ingredients</h3>
                                <ul className="space-y-2">
                                    {uniqueMissingIngredients.map((item, index) => (
                                        <li key={index} className="flex items-center">
                                            <span className="inline-block w-4 h-4 border-2 border-gray-400 dark:border-gray-500 rounded-sm mr-3"></span>
                                            <span className="text-gray-800 dark:text-gray-200">{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <Button onClick={() => handleDownloadShoppingList(uniqueMissingIngredients)}>
                                <Download className="mr-2 h-4 w-4" />
                                Download as .txt
                            </Button>
                        </>
                    ) : (
                        <p className="text-muted-foreground">You seem to have all the ingredients covered for this recipe!</p>
                    )}
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="nutrition">
                <AccordionTrigger className="text-lg font-headline"><HeartPulse className="mr-2 h-5 w-5 text-primary"/>Nutritional Information</AccordionTrigger>
                <AccordionContent className="whitespace-pre-line text-base">
                  {recipe.nutritionalInformation}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      );
    };

    if (isLoading) return renderLoading();
    if (recipe) return renderRecipe();
    return renderForm();
}
