import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI Agent Simulation',
  description: 'Interactive visualization of intelligent agents — Reflex, Model-Based, Utility, and Q-Learning agents navigating a grid world.',
  keywords: ['AI', 'reinforcement learning', 'Q-learning', 'agent simulation', 'grid world'],
  authors: [{ name: 'Agent Simulation' }],
  openGraph: {
    title: 'AI Agent Simulation',
    description: 'Visualize how different AI agents learn and navigate grid environments',
    type: 'website',
  },
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <div className="ambient-glow" />
        {children}
      </body>
    </html>
  );
}
