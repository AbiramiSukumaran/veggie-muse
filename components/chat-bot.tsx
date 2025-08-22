
"use client";

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetDescription } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare, Send, Bot, User, KeyRound } from 'lucide-react';
import { chatWithChef, type HistoryPart } from '@/ai/flows/chat';
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/contexts/app-context';

type Message = {
  role: 'user' | 'model';
  text: string;
};

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { apiKey, isApiKeySet } = useAppContext();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (viewport) {
            viewport.scrollTop = viewport.scrollHeight;
        }
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Clear chat history if the sheet is closed.
  useEffect(() => {
    if (!isOpen) {
        setMessages([]);
    }
  }, [isOpen]);

  const handleSend = async () => {
    if (input.trim() === '' || !apiKey) {
        if (!apiKey) {
            toast({
                variant: "destructive",
                title: "API Key Not Set",
                description: "Please set your API key in the main app before using the chat.",
            });
        }
        return;
    };

    const userMessage: Message = { role: 'user', text: input };
    // Create the full new message list to update the UI and send to the API
    const newMessages = [...messages, userMessage];
    
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    // Construct the history for the API from the up-to-date newMessages array.
    // The history should contain all messages *except* the user's very last one,
    // which is sent in the 'message' field.
    const historyForApi: HistoryPart[] = newMessages.slice(0, -1).map(msg => ({
      role: msg.role,
      parts: [{ text: msg.text }],
    }));

    try {
      const response = await chatWithChef({
        history: historyForApi,
        message: input, // Send the latest user message separately.
      }, apiKey);
      const assistantMessage: Message = { role: 'model', text: response };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      toast({
        variant: "destructive",
        title: "Chat Error",
        description: "Sorry, I couldn't get a response. Your API key might be invalid or the service is down.",
      });
      // Rollback the user message on error
      setMessages(prev => prev.slice(0,-1));
    } finally {
      setIsLoading(false);
    }
  };

  const isUiDisabled = !isApiKeySet || isLoading;

  return (
    <>
      {isApiKeySet && (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button
              variant="default"
              size="icon"
              className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 bg-primary hover:bg-primary/90"
              aria-label="Open Chat"
            >
              <MessageSquare className="h-7 w-7 text-primary-foreground" />
            </Button>
          </SheetTrigger>
          <SheetContent className="flex flex-col p-0" side="right">
            <SheetHeader className="p-4 border-b">
              <SheetTitle className="flex items-center gap-2 font-headline"><Bot /> Veggie.ai Assistant</SheetTitle>
              <SheetDescription>Your friendly vegetarian cooking expert.</SheetDescription>
            </SheetHeader>
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full" ref={scrollAreaRef}>
                <div className="p-4 space-y-4">
                  {messages.length === 0 && (
                      <div className="text-center text-sm text-muted-foreground p-8">
                          Ask me anything about vegetarian cooking!
                      </div>
                  )}
                  {messages.map((message, index) => (
                    <div key={index} className={`flex items-start gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {message.role === 'model' && (
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary text-primary-foreground"><Bot size={20} /></AvatarFallback>
                        </Avatar>
                      )}
                      <div className={`rounded-lg px-4 py-2 max-w-[80%] ${
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                      </div>
                      {message.role === 'user' && (
                        <Avatar className="h-8 w-8">
                          <AvatarFallback><User size={20} /></AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex items-start gap-3 justify-start">
                        <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary text-primary-foreground"><Bot size={20} /></AvatarFallback>
                        </Avatar>
                        <div className="rounded-lg px-4 py-2 max-w-[80%] bg-muted">
                            <p className="text-sm animate-pulse">Typing...</p>
                        </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
            <SheetFooter className="p-4 border-t bg-background">
              <div className="flex w-full items-center space-x-2">
                <Input
                  id="message"
                  placeholder="Ask about ingredients, techniques..."
                  className="flex-1"
                  autoComplete="off"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  disabled={isUiDisabled}
                />
                <Button type="submit" size="icon" onClick={handleSend} disabled={isUiDisabled}>
                  <Send className="h-4 w-4" />
                  <span className="sr-only">Send</span>
                </Button>
              </div>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      )}
    </>
  );
}
