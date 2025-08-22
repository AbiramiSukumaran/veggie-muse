
"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sparkles,
  ChefHat,
  CalendarDays,
  ShoppingCart,
  MessageSquare,
  Globe,
} from "lucide-react";

export default function FeatureGuide() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="relative flex h-6 w-6 cursor-pointer" aria-label="Open Feature Guide">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
          <span className="relative inline-flex rounded-full h-6 w-6 bg-primary/80 border-2 border-background"></span>
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl flex items-center gap-2">
            <Sparkles className="text-primary" />
            What's Possible with Veggie Muse?
          </DialogTitle>
          <DialogDescription>
            Discover the powerful AI features at your fingertips.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 -mr-6 pr-6">
            <div className="grid gap-6 py-4">
            <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/20 rounded-full">
                <ChefHat className="h-6 w-6 text-primary" />
                </div>
                <div>
                <h3 className="font-semibold">Dynamic Recipe Generation</h3>
                <p className="text-sm text-muted-foreground">
                    Create a unique recipe based on your mood, available time, and
                    ingredients. You can check off items, type them in, or even{" "}
                    <span className="font-semibold text-foreground">
                    upload a photo of your ingredients
                    </span>{" "}
                    for the AI to analyze.
                </p>
                </div>
            </div>
            <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/20 rounded-full">
                <CalendarDays className="h-6 w-6 text-primary" />
                </div>
                <div>
                <h3 className="font-semibold">Smart Weekly Meal Plans</h3>
                <p className="text-sm text-muted-foreground">
                    Get a 5-day meal plan for any cuisine. Our AI focuses on
                    "component prep"—giving you a weekend prep list so daily cooking
                    is fresh, fast (15-20 mins), and delicious.
                </p>
                </div>
            </div>
            <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/20 rounded-full">
                <Globe className="h-6 w-6 text-primary" />
                </div>
                <div>
                <h3 className="font-semibold">The Culinary Passport</h3>
                <p className="text-sm text-muted-foreground">
                    Traveling? Enter your destination and dietary needs. The AI provides safe, local dish recommendations and a{" "}
                    <span className="font-semibold text-foreground">
                    "Chef Card" translated into the local language
                    </span>, complete with audio pronunciation to help you communicate clearly and safely.
                </p>
                </div>
            </div>
            <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/20 rounded-full">
                <ShoppingCart className="h-6 w-6 text-primary" />
                </div>
                <div>
                <h3 className="font-semibold">Visual Shopping Lists</h3>
                <p className="text-sm text-muted-foreground">
                    After generating a recipe or meal plan, the app identifies ingredients you don't have and can generate a{" "}
                    <span className="font-semibold text-foreground">
                    realistic image of a handwritten shopping list
                    </span>{" "}
                    that you can save to your phone.
                </p>
                </div>
            </div>
            <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/20 rounded-full">
                <MessageSquare className="h-6 w-6 text-primary" />
                </div>
                <div>
                <h3 className="font-semibold">Veggie.ai Chat Assistant</h3>
                <p className="text-sm text-muted-foreground">
                    Have a question? The floating chat button connects you to
                    Veggie.ai. Ask for ingredient substitutions, cooking techniques, or vegetarian tips.
                </p>
                </div>
            </div>
            </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
