
'use client';
/**
 * @fileOverview A modal dialog component for users to enter their Google AI API key.
 * The dialog is non-dismissible and remains open until a valid key is provided.
 */
import { useState } from 'react';
import { useAppContext } from '@/contexts/app-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { KeyRound, Sparkles } from 'lucide-react';

export default function ApiKeyModal() {
  const { isApiKeySet, setApiKey } = useAppContext();
  const [keyInput, setKeyInput] = useState('');

  const handleSaveKey = () => {
    if (keyInput.trim()) {
      setApiKey(keyInput.trim());
    }
  };

  return (
    <Dialog open={!isApiKeySet}>
      <DialogContent className="sm:max-w-[425px]" onInteractOutside={(e) => e.preventDefault()} showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-headline">
            <KeyRound className="text-primary" />
            Enter Your API Key
          </DialogTitle>
          <DialogDescription>
            Veggie Muse is free, but requires your own Google AI API key.
            Your key is stored only in your browser and never saved on our servers.
            The free tier is generous, but has usage limits. If you see errors, you may have reached your free quota.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Input
            id="apiKey"
            type="password"
            placeholder="Your Google AI API Key"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveKey()}
          />
        </div>
        <DialogFooter>
            <div className="w-full flex flex-col gap-2">
                 <Button onClick={handleSaveKey} disabled={!keyInput.trim()}>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Start Cooking
                </Button>
                <div className="flex justify-center gap-4">
                    <Button variant="link" asChild className="text-xs">
                        <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer">
                            Get a Google AI Key
                        </a>
                    </Button>
                     <Button variant="link" asChild className="text-xs">
                        <a href="https://ai.google.dev/pricing" target="_blank" rel="noopener noreferrer">
                            View Gemini Pricing & Quotas
                        </a>
                    </Button>
                </div>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
