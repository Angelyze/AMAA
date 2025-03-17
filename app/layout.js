import { Inter } from 'next/font/google';
import { AppProvider } from './providers';
import { Analytics } from '@vercel/analytics/react';
import './styles/index.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'AMAA - Ask Me Anything About',
  description: 'Your AI assistant for any question',
  icons: {
    icon: [
      { url: '/AMAApp.svg', type: 'image/svg+xml' },
      { url: '/AMAApp.png' },
    ],
    apple: [
      { url: '/AMAApp.png' },
    ],
    shortcut: ['/AMAApp.svg'],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/AMAApp.svg" type="image/svg+xml" />
        <link rel="alternate icon" href="/AMAApp.png" type="image/png" />
        <link rel="apple-touch-icon" href="/AMAApp.png" />
      </head>
      <body className={inter.className}>
        <AppProvider>
          {children}
        </AppProvider>
        <Analytics />
      </body>
    </html>
  );
}