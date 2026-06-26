import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'CartSwitcher — Migrate your store to Shopify',
  description: 'Migrate products, orders, customers, and more from WooCommerce to Shopify in minutes.',
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${inter.variable} font-sans bg-wise-canvas-soft text-wise-body antialiased`}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}
