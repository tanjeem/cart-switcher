import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ShopifyUploader } from '@/uploaders/shopify'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params

  const job = await db.migrationJob.findUnique({
    where: { id: jobId },
    select: { shopifyDomain: true, shopifyAccessToken: true, status: true },
  })
  if (!job || job.status !== 'RUNNING') {
    return NextResponse.json({ status: 'NOT_RUNNING' })
  }

  const shopify = new ShopifyUploader({
    domain: job.shopifyDomain,
    accessToken: job.shopifyAccessToken,
  })

  try {
    // Rely on Inngest worker for actual polling. 
    // Just return RUNNING so the UI doesn't get tricked by stale Shopify cache.
    return NextResponse.json({ id: '', status: 'RUNNING', objectCount: 0, url: null })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
