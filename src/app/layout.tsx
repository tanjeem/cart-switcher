import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

const BASE = 'https://cart-switcher.vercel.app'

export const metadata: Metadata = {
  metadataBase: new URL(BASE),
  title: {
    default: 'CartSwitcher — Migrate WooCommerce to Shopify in Minutes',
    template: '%s | CartSwitcher',
  },
  description: 'Migrate your WooCommerce store to Shopify automatically. Products, orders, customers, coupons, and blog posts — migrated in under an hour. Half the price of Cart2Cart.',
  keywords: [
    'woocommerce to shopify migration',
    'migrate woocommerce to shopify',
    'woocommerce shopify migration tool',
    'woocommerce to shopify converter',
    'shopify migration service',
    'move woocommerce to shopify',
    'woocommerce shopify transfer',
    'woocommerce migration tool',
  ],
  authors: [{ name: 'CartSwitcher' }],
  creator: 'CartSwitcher',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: BASE,
    siteName: 'CartSwitcher',
    title: 'CartSwitcher — Migrate WooCommerce to Shopify in Minutes',
    description: 'Migrate products, orders, customers, coupons and blog posts from WooCommerce to Shopify automatically. From $79 one-time. 7-day money-back guarantee.',
    images: [
      {
        url: '/og.png',
        width: 1200,
        height: 630,
        alt: 'CartSwitcher — WooCommerce to Shopify Migration',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CartSwitcher — Migrate WooCommerce to Shopify in Minutes',
    description: 'Migrate products, orders, customers, coupons and blog posts from WooCommerce to Shopify automatically. From $79 one-time.',
    images: ['/og.png'],
  },
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: BASE,
  },
}

const SCHEMA_ORG = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${BASE}/#website`,
      url: BASE,
      name: 'CartSwitcher',
      description: 'WooCommerce to Shopify migration tool',
      potentialAction: {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: `${BASE}/?q={search_term_string}` },
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@type': 'SoftwareApplication',
      '@id': `${BASE}/#app`,
      name: 'CartSwitcher',
      url: BASE,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      description: 'Migrate your WooCommerce store to Shopify automatically. Products, orders, customers, coupons, and blog posts migrated in under an hour.',
      offers: {
        '@type': 'AggregateOffer',
        lowPrice: '79',
        highPrice: '249',
        priceCurrency: 'USD',
        offerCount: '3',
      },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.9',
        reviewCount: '47',
        bestRating: '5',
      },
    },
    {
      '@type': 'FAQPage',
      '@id': `${BASE}/#faq`,
      mainEntity: [
        {
          '@type': 'Question',
          name: 'How long does a WooCommerce to Shopify migration take?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Most migrations complete in under an hour. Large stores with 10,000+ products may take 2-3 hours.',
          },
        },
        {
          '@type': 'Question',
          name: 'Will my WooCommerce store go down during migration?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'No. CartSwitcher reads from your WooCommerce store via API — your live store stays fully operational throughout the entire migration.',
          },
        },
        {
          '@type': 'Question',
          name: 'What data gets migrated from WooCommerce to Shopify?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Products (with variants, images, and inventory), customers, orders, coupons, and blog posts. SEO URLs are also preserved with automatic redirect mapping.',
          },
        },
        {
          '@type': 'Question',
          name: 'Is CartSwitcher cheaper than Cart2Cart?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. CartSwitcher starts at $79 one-time. Cart2Cart charges $155+ for the same migration, plus extra fees for orders and customers. No subscriptions, ever.',
          },
        },
        {
          '@type': 'Question',
          name: 'Do you offer a free trial?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes — the free sandbox migrates 25 products, 10 orders, and 10 customers so you can verify how your data looks in Shopify before paying.',
          },
        },
      ],
    },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <head>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(SCHEMA_ORG) }}
          />
        </head>
        <body className={`${inter.variable} font-sans bg-wise-canvas-soft text-wise-body antialiased`}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}
