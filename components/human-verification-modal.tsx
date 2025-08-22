
'use client';
/**
 * @fileOverview A modal dialog for verifying the user is human with a custom AI-generated image CAPTCHA.
 */
import { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '@/contexts/app-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ShieldCheck, Sparkles, RefreshCw, AlertTriangle } from 'lucide-react';
import { generateCaptcha } from '@/ai/flows/generate-captcha';
import { Skeleton } from './ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function HumanVerificationModal() {
  const { isVerifiedHuman, setVerifiedHuman, isApiKeySet, apiKey } = useAppContext();
  const [userInput, setUserInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<{ question: string; answer: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const getNewChallenge = useCallback(async () => {
    if (!apiKey) return;
    setIsLoading(true);
    setError(null);
    setUserInput('');
    try {
      const newChallenge = await generateCaptcha(apiKey);
      if (newChallenge) {
        setChallenge(newChallenge);
      } else {
        setError("Failed to load a new challenge. Please try again.");
      }
    } catch (e) {
      console.error("Error generating captcha:", e);
      setError("An error occurred while fetching the challenge.");
      toast({
        variant: "destructive",
        title: "CAPTCHA Error",
        description: "Could not generate a verification challenge.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [apiKey, toast]);


  useEffect(() => {
    // Generate a challenge only when the modal is supposed to be open and a challenge doesn't already exist.
    if (!isVerifiedHuman && isApiKeySet && !challenge && !isLoading) {
      getNewChallenge();
    }
  }, [isVerifiedHuman, isApiKeySet, challenge, isLoading, getNewChallenge]);

  const handleVerification = () => {
    if (!challenge) return;
    // Case-insensitive comparison, trimming whitespace
    if (userInput.trim().toLowerCase() === challenge.answer.toLowerCase()) {
      setVerifiedHuman(true);
      setUserInput('');
      setError(null);
      setChallenge(null); // Clear challenge after success
    } else {
      setError("Incorrect. Please try again.");
      getNewChallenge();
    }
  };

  const handleRefresh = () => {
    getNewChallenge();
  }

  // The modal should only be open if the user is not verified AND the API key has been set.
  const isModalOpen = !isVerifiedHuman && isApiKeySet;

  return (
    <Dialog open={isModalOpen}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()} showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-headline">
            <ShieldCheck className="text-primary" />
            Please Verify You Are Human
          </DialogTitle>
          <DialogDescription>
            Answer the question below to continue.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="relative h-16 bg-muted rounded-lg flex items-center justify-center p-4">
             {isLoading && <Skeleton className="w-full h-8" />}
             {!isLoading && challenge?.question && (
                <p className="text-lg font-mono text-center text-foreground">{challenge.question}</p>
             )}
             {!isLoading && !challenge?.question && (
                 <div className="flex flex-col items-center text-destructive">
                    <AlertTriangle className="h-6 w-6 mb-2" />
                    <p className="text-xs text-center">Challenge failed to load.</p>
                </div>
             )}
          </div>
           <div className="flex items-center gap-2">
            <Input
                id="captcha"
                type="text"
                placeholder="Your answer"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleVerification()}
                disabled={isLoading || !challenge}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
            />
            <Button variant="ghost" size="icon" onClick={handleRefresh} aria-label="Refresh Challenge" disabled={isLoading}>
                <RefreshCw className={cn('h-4 w-4', { 'animate-spin': isLoading })} />
            </Button>
           </div>
           {error && <p className="text-sm text-destructive text-center">{error}</p>}
        </div>
        <DialogFooter>
            <Button onClick={handleVerification} disabled={!userInput.trim() || isLoading || !challenge} className="w-full">
                <Sparkles className="mr-2 h-4 w-4" />
                Verify
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
