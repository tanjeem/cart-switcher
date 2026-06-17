import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { Geist } from 'next/font/google'
import './globals.css'

const geist = Geist({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'CartSwitcher — Migrate your store to Shopify',
  description: 'Migrate products, orders, customers, and more from WooCommerce to Shopify in minutes.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${geist.className} bg-gray-50 text-gray-900 antialiased`}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}
