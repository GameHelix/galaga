/**
 * Root layout for the Galaga game.
 * Sets up metadata, fonts, and global styling.
 */

import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GALAGA - Neon Edition',
  description: 'A full-featured Galaga browser game with neon cyberpunk visuals built with Next.js and HTML5 Canvas.',
  icons: {
    icon: '/favicon.svg',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#000011',
};

interface RootLayoutProps {
  children: React.ReactNode;
}

/**
 * Root layout wraps all pages with consistent structure and meta.
 */
export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
