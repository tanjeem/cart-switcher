import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ShopifyUploader } from '@/uploaders/shopify'

type Params = Promise<{ jobId: string }>

function getShopify(job: { shopifyDomain: string; shopifyAccessToken: string }) {
  return new ShopifyUploader({ domain: job.shopifyDomain, accessToken: job.shopifyAccessToken })
}

// GET — scan Shopify for products with duplicate titles (any origin)
export async function GET(_req: Request, { params }: { params: Params }) {
  const { jobId } = await params
  const job = await db.migrationJob.findUnique({ where: { id: jobId } })
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

  try {
    const shopify = getShopify(job)
    const groups = await shopify.getAllProductDuplicatesByTitle()
    const totalExtras = groups.reduce((sum, g) => sum + g.ids.length - 1, 0)
    return NextResponse.json({ groups, totalExtras })
  } catch (err) {
    console.error('[dedup GET]', err)
    return NextResponse.json({ error: 'Failed to scan Shopify products' }, { status: 500 })
  }
}

// POST — delete a list of product IDs (the extras identified by the scan)
export async function POST(req: Request, { params }: { params: Params }) {
  const { jobId } = await params
  const { ids }: { ids: number[] } = await req.json()

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'ids array required' }, { status: 400 })
  }

  const job = await db.migrationJob.findUnique({ where: { id: jobId } })
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

  const shopify = getShopify(job)
  let deleted = 0
  let failed = 0

  for (const id of ids) {
    try {
      await shopify.deleteProduct(id)
      deleted++
    } catch {
      failed++
    }
  }

  return NextResponse.json({ deleted, failed })
}
