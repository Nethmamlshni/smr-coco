import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/contexts/AuthContext';
import Image from 'next/image';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  metadataBase: new URL('http://localhost:3000'),
  title: 'SMR Consolidated',
  description: 'Professional Coconut Factory Management System',
  openGraph: {
    images: [{ url:'/logo.png' }],
  },
  twitter: {
    card: 'summary_large_image',
    images: [{ url: '/logo.png' }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
