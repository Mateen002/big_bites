import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BigBites Admin',
  description: 'Manage categories, products, options, zones, and orders',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
