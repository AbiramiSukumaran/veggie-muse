
'use client';
/**
 * @fileOverview This file provides a React context for managing user settings,
 * including the Google AI API key and a history of seen quotes.
 * It handles storing data in localStorage and making it available to the application.
 */

import { createContext, useContext, useState, useEffect, type ReactNode, useCallback } from 'react';
import useInactivityTimer from '@/hooks/use-inactivity-timer';

const API_KEY_STORAGE_KEY = 'google-ai-api-key';
const HUMAN_VERIFIED_SESSION_KEY = 'human-verified-session';
const SEEN_QUOTES_STORAGE_KEY = 'seen-recipe-quotes';
const SEEN_RECIPES_STORAGE_KEY = 'seen-recipe-titles';
const SEEN_PASSPORT_DISHES_KEY = 'seen-passport-dishes';
const SEEN_WEEKLY_PLANS_KEY = 'seen-weekly-plan-titles';
const MAX_SEEN_ITEMS = 100; // To prevent local storage from getting too large

interface AppContextType {
  apiKey: string | null;
  setApiKey: (key: string | null) => void;
  isApiKeySet: boolean;
  isVerifiedHuman: boolean;
  setVerifiedHuman: (isVerified: boolean) => void;
  seenQuotes: string[];
  addSeenQuote: (quote: string) => void;
  seenRecipeTitles: string[];
  addSeenRecipeTitle: (title: string) => void;
  seenPassportDishes: string[];
  addSeenPassportDishes: (dishes: { dishNameEnglish: string }[], destination: string) => void;
  seenWeeklyPlanTitles: string[];
  addSeenWeeklyPlanTitle: (title: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [apiKey, setApiKeyState] = useState<string | null>(null);
  const [isVerifiedHuman, setVerifiedHumanState] = useState(false);
  const [seenQuotes, setSeenQuotesState] = useState<string[]>([]);
  const [seenRecipeTitles, setSeenRecipeTitlesState] = useState<string[]>([]);
  const [seenPassportDishes, setSeenPassportDishesState] = useState<string[]>([]);
  const [seenWeeklyPlanTitles, setSeenWeeklyPlanTitlesState] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const handleTimeout = useCallback(() => {
    setVerifiedHuman(false);
  }, []);

  useInactivityTimer(handleTimeout, 15 * 60 * 1000); // 15 minutes


  useEffect(() => {
    // On initial load, try to get data from localStorage and sessionStorage.
    const storedKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (storedKey) {
      setApiKeyState(storedKey);
    }
    
    // Check session storage for verification status
    const verifiedStatus = sessionStorage.getItem(HUMAN_VERIFIED_SESSION_KEY);
    setVerifiedHumanState(verifiedStatus === 'true');

    try {
      const storedQuotes = localStorage.getItem(SEEN_QUOTES_STORAGE_KEY);
      setSeenQuotesState(storedQuotes ? JSON.parse(storedQuotes) : []);

      const storedRecipeTitles = localStorage.getItem(SEEN_RECIPES_STORAGE_KEY);
      setSeenRecipeTitlesState(storedRecipeTitles ? JSON.parse(storedRecipeTitles) : []);

      const storedPassportDishes = localStorage.getItem(SEEN_PASSPORT_DISHES_KEY);
      setSeenPassportDishesState(storedPassportDishes ? JSON.parse(storedPassportDishes) : []);

      const storedWeeklyPlanTitles = localStorage.getItem(SEEN_WEEKLY_PLANS_KEY);
      setSeenWeeklyPlanTitlesState(storedWeeklyPlanTitles ? JSON.parse(storedWeeklyPlanTitles) : []);

    } catch (e) {
      console.error("Failed to parse seen items from localStorage", e);
      // Reset corrupted keys
      setSeenQuotesState([]);
      setSeenRecipeTitlesState([]);
      setSeenPassportDishesState([]);
      setSeenWeeklyPlanTitlesState([]);
    }
    setIsInitialized(true); // Mark as initialized after first check.
  }, []);

  const setApiKey = (key: string | null) => {
    setApiKeyState(key);
    if (key) {
      localStorage.setItem(API_KEY_STORAGE_KEY, key);
    } else {
      localStorage.removeItem(API_KEY_STORAGE_KEY);
      // If API key is removed, also reset verification status
      setVerifiedHuman(false);
    }
  };
  
  const setVerifiedHuman = (isVerified: boolean) => {
    setVerifiedHumanState(isVerified);
    sessionStorage.setItem(HUMAN_VERIFIED_SESSION_KEY, String(isVerified));
  };


   const addSeenItem = useCallback((key: string, item: string) => {
    try {
      const storedItemsRaw = localStorage.getItem(key);
      const storedItems = storedItemsRaw ? JSON.parse(storedItemsRaw) : [];
      if (Array.isArray(storedItems)) {
        const newItems = [item, ...storedItems].slice(0, MAX_SEEN_ITEMS);
        localStorage.setItem(key, JSON.stringify(newItems));
        return newItems;
      }
      // If data is corrupted, start fresh
      const newItems = [item];
      localStorage.setItem(key, JSON.stringify(newItems));
      return newItems;
    } catch (e) {
      console.error(`Failed to update seen items for key ${key} in localStorage`, e);
      const newItems = [item];
      localStorage.setItem(key, JSON.stringify(newItems));
      return newItems;
    }
  }, []);

  const addSeenQuote = useCallback((quote: string) => {
    const newSeenQuotes = addSeenItem(SEEN_QUOTES_STORAGE_KEY, quote);
    setSeenQuotesState(newSeenQuotes);
  }, [addSeenItem]);
  
  const addSeenRecipeTitle = useCallback((title: string) => {
    const newSeenRecipeTitles = addSeenItem(SEEN_RECIPES_STORAGE_KEY, title);
    setSeenRecipeTitlesState(newSeenRecipeTitles);
  }, [addSeenItem]);
  
  const addSeenWeeklyPlanTitle = useCallback((title: string) => {
    const newSeenWeeklyPlanTitles = addSeenItem(SEEN_WEEKLY_PLANS_KEY, title);
    setSeenWeeklyPlanTitlesState(newSeenWeeklyPlanTitles);
  }, [addSeenItem]);

  const addSeenPassportDishes = useCallback((dishes: { dishNameEnglish: string }[], destination: string) => {
    const newDishes = dishes.map(dish => `${destination}|${dish.dishNameEnglish}`);
    try {
        const storedItemsRaw = localStorage.getItem(SEEN_PASSPORT_DISHES_KEY);
        const storedItems: string[] = storedItemsRaw ? JSON.parse(storedItemsRaw) : [];
        if (Array.isArray(storedItems)) {
          const currentDishes = storedItems.filter(d => !newDishes.includes(d));
          const newSeenDishes = [...newDishes, ...currentDishes].slice(0, MAX_SEEN_ITEMS);
          setSeenPassportDishesState(newSeenDishes);
          localStorage.setItem(SEEN_PASSPORT_DISHES_KEY, JSON.stringify(newSeenDishes));
        } else {
           setSeenPassportDishesState(newDishes);
           localStorage.setItem(SEEN_PASSPORT_DISHES_KEY, JSON.stringify(newDishes));
        }
    } catch (e) {
        console.error("Failed to update seen passport dishes in localStorage", e);
         setSeenPassportDishesState(newDishes);
         localStorage.setItem(SEEN_PASSPORT_DISHES_KEY, JSON.stringify(newDishes));
    }
  }, []);


  // The key is considered "set" if it's not null and not an empty string.
  const isApiKeySet = !!apiKey;

  // Don't render children until we've checked localStorage.
  // This prevents the app from flashing the API key modal unnecessarily.
  if (!isInitialized) {
    return null;
  }

  return (
    <AppContext.Provider value={{ 
        apiKey, 
        setApiKey, 
        isApiKeySet, 
        isVerifiedHuman,
        setVerifiedHuman,
        seenQuotes, 
        addSeenQuote, 
        seenRecipeTitles, 
        addSeenRecipeTitle, 
        seenPassportDishes, 
        addSeenPassportDishes,
        seenWeeklyPlanTitles,
        addSeenWeeklyPlanTitle
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
