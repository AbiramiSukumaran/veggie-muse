
import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import ChatBot from '@/components/chat-bot';
import { AppProvider } from '@/contexts/app-context';
import ApiKeyModal from '@/components/api-key-modal';
import HumanVerificationModal from '@/components/human-verification-modal';

export const metadata: Metadata = {
  title: "Veggie Muse",
  description: 'A Culinary Adventure Generator App',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <AppProvider>
          <ApiKeyModal />
          <HumanVerificationModal />
          {children}
          <ChatBot />
          <Toaster />
        </AppProvider>
      </body>
    </html>
  );
}
