
"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from "@/hooks/use-toast";
import { useAppContext } from '@/contexts/app-context';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, Globe, ShieldCheck, Heart, ArrowLeft, Languages, Volume2, Utensils, Image as ImageIcon, AlertTriangle } from 'lucide-react';
import { generateCulinaryPassport } from '@/ai/flows/generate-culinary-passport';
import { CulinaryPassport, GenerateCulinaryPassportInputSchema } from '@/ai/schemas/culinary-passport-schemas';
import type { z } from 'zod';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

type PassportFormValues = z.infer<typeof GenerateCulinaryPassportInputSchema>;


export default function CulinaryPassportGenerator() {
    const [passport, setPassport] = useState<CulinaryPassport | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const { apiKey, isApiKeySet, seenPassportDishes, addSeenPassportDishes } = useAppContext();

    const form = useForm<PassportFormValues>({
        resolver: zodResolver(GenerateCulinaryPassportInputSchema),
        defaultValues: {
            destination: '',
            dietaryNeeds: 'Vegetarian',
            preferences: '',
        },
    });

    async function onSubmit(data: PassportFormValues) {
        if (!apiKey) {
            toast({
                variant: "destructive",
                title: "API Key is missing.",
                description: "Please provide your API key to generate a passport.",
            });
            return;
        }

        setIsLoading(true);
        setPassport(null);

        // Filter seen dishes for the current destination
        const seenDishesForDestination = seenPassportDishes
            .filter(dish => dish.startsWith(`${data.destination}|`))
            .map(dish => dish.split('|')[1]);

        try {
          const result = await generateCulinaryPassport({
            ...data,
            seenDishes: seenDishesForDestination,
          }, apiKey);
          
          if (result && result.recommendations.length > 0) {
            setPassport(result);
            addSeenPassportDishes(result.recommendations, data.destination);
          } else if (result && result.recommendations.length === 0 && result.chefCardAudioUri === '') {
            // Handle fallback case where AI fails to generate anything
            toast({
              variant: "destructive",
              title: "Generation Failed",
              description: result.chefCardMessage || "The AI model is currently overloaded. Please try again in a few minutes.",
            });
            setPassport(result);
          } else {
             // Handle case where AI generates a card but no new recommendations
             setPassport(result);
             toast({
                title: "No New Recommendations",
                description: "We've shown you all available recommendations for this destination. Try a different place!",
            });
          }
        } catch (error) {
          console.error(error);
          toast({
            variant: "destructive",
            title: "An error occurred.",
            description: "Failed to generate your Culinary Passport. The API key might be invalid or the service may be temporarily down.",
          });
        } finally {
          setIsLoading(false);
        }
    }
    
    const isUiDisabled = !isApiKeySet || isLoading;

    const renderForm = () => (
      <Card className="w-full shadow-lg border-2 border-border/70">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <fieldset disabled={isUiDisabled} className="group">
              <CardHeader>
                <CardTitle className="font-headline text-2xl flex items-center gap-2"><Globe size={24} />Create Your Culinary Passport</CardTitle>
                <CardDescription>Travel confidently. Get safe, local dish recommendations and a translation card for your dietary needs.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 group-disabled:opacity-50">
                <FormField
                  control={form.control}
                  name="destination"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Where are you traveling?</FormLabel>
                      <FormControl>
                          <Input placeholder="e.g., Kyoto, Japan or Florence, Italy" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dietaryNeeds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>What are your critical dietary needs?</FormLabel>
                      <FormControl>
                        <Textarea placeholder="e.g., Vegetarian, no eggs, severe peanut allergy" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="preferences"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Any likes or dislikes? (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., I love spicy food, I dislike cilantro" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={isUiDisabled} className="w-full">
                  <Sparkles className="mr-2 h-4 w-4" />
                  {isLoading ? 'Generating Passport...' : isApiKeySet ? 'Generate Culinary Passport' : 'Please Enter API Key'}
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
        <CardContent className="space-y-6">
            <Skeleton className="h-40 w-full rounded-lg" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Skeleton className="h-48 w-full rounded-lg" />
                <Skeleton className="h-48 w-full rounded-lg" />
                <Skeleton className="h-48 w-full rounded-lg" />
            </div>
        </CardContent>
      </Card>
    );

    const renderPassport = () => {
      if (!passport) return null;
      
      const isFallback = passport.recommendations.length === 0 && passport.chefCardAudioUri === '';

      return (
        <Card className="w-full shadow-lg border-2 border-border/70 animate-in fade-in-50 duration-500">
          <CardHeader>
            <Button variant="ghost" size="sm" onClick={() => setPassport(null)} className="mb-2 self-start px-2">
               <ArrowLeft className="mr-2 h-4 w-4" />
              {isFallback ? "Try Again" : "Create Another Passport"}
            </Button>
            <CardTitle className="font-headline text-3xl">Your Culinary Passport</CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            {isFallback ? (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Generation Failed</AlertTitle>
                  <AlertDescription>
                    {passport.chefCardMessage}
                  </AlertDescription>
                </Alert>
            ) : (
              <>
                {/* Chef Card Section */}
                <div className="p-4 bg-secondary rounded-lg border border-primary/50">
                    <h3 className="font-headline text-xl flex items-center gap-2 mb-2"><Languages className="text-primary"/> Your Chef Card</h3>
                    <p className="text-muted-foreground mb-4 text-sm">Show this to your waiter or chef to communicate your needs clearly.</p>
                    <div className="bg-background p-4 rounded-md shadow-inner">
                        <p className="text-lg leading-relaxed">{passport.chefCardMessage}</p>
                    </div>
                     {passport.chefCardAudioUri && (
                        <div className="mt-4">
                            <audio controls src={passport.chefCardAudioUri} className="w-full">
                                Your browser does not support the audio element.
                            </audio>
                        </div>
                    )}
                </div>
                
                {/* Recommendations Section */}
                {passport.recommendations.length > 0 && (
                    <div>
                        <h3 className="font-headline text-xl flex items-center gap-2 mb-4"><Utensils className="text-primary"/> Safe & Local Recommendations</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {passport.recommendations.map((rec, index) => (
                                <div key={index} className="flex flex-col bg-card rounded-lg border overflow-hidden">
                                     <div className="relative w-full h-40">
                                        {rec.photoDataUri ? (
                                            <Image src={rec.photoDataUri} alt={rec.dishNameEnglish} layout="fill" objectFit="cover" data-ai-hint="food meal"/>
                                        ) : (
                                            <div className="w-full h-full bg-muted flex items-center justify-center">
                                                <ImageIcon className="text-muted-foreground"/>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-4 flex flex-col flex-grow">
                                        <h4 className="font-bold">{rec.dishNameEnglish}</h4>
                                        <p className="text-sm text-muted-foreground italic mb-2">{rec.dishNameLocal}</p>
                                        <p className="text-sm flex-grow">{rec.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      );
    };

    if (isLoading) return renderLoading();
    if (passport) return renderPassport();
    return renderForm();
}
