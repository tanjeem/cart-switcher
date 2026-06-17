import { NextResponse } from 'next/server'
import { WooCommerceFetcher } from '@/fetchers/woocommerce'
import { ShopifyUploader } from '@/uploaders/shopify'

export async function POST(req: Request) {
  const body = await req.json()
  const { type, ...creds } = body

  try {
    if (type === 'woocommerce') {
      const fetcher = new WooCommerceFetcher({
        url: creds.url,
        consumerKey: creds.consumerKey,
        consumerSecret: creds.consumerSecret,
      })
      const result = await fetcher.validate()
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })

      const counts = await fetcher.getPreviewCounts()
      return NextResponse.json({ valid: true, counts })
    }

    if (type === 'shopify') {
      const uploader = new ShopifyUploader({
        domain: creds.domain,
        accessToken: creds.accessToken,
      })
      const valid = await uploader.validate()
      if (!valid) return NextResponse.json({ error: 'Invalid Shopify credentials or domain' }, { status: 400 })
      return NextResponse.json({ valid: true })
    }

    return NextResponse.json({ error: 'Unknown connection type' }, { status: 400 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Connection failed'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
