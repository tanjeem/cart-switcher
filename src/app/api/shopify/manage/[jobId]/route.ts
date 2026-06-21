import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ShopifyUploader } from '@/uploaders/shopify'

// Resolve a working ShopifyUploader for this jobId.
// If override creds are provided, use those.
// Otherwise try the job's stored creds; if they 401, fall back to the most
// recent job with the same Shopify domain (handles re-installs / retried jobs).
async function resolveShopify(
  jobId: string,
  overrideDomain?: string,
  overrideToken?: string,
): Promise<ShopifyUploader | null> {
  if (overrideDomain && overrideToken) {
    return new ShopifyUploader({ domain: overrideDomain, accessToken: overrideToken })
  }

  const job = await db.migrationJob.findUnique({
    where: { id: jobId },
    select: { shopifyDomain: true, shopifyAccessToken: true },
  })
  if (!job) return null

  const primary = new ShopifyUploader({ domain: job.shopifyDomain, accessToken: job.shopifyAccessToken })
  if (await primary.validate()) return primary

  // Primary credentials invalid — try the most recent other job with same domain
  const fallback = await db.migrationJob.findFirst({
    where: { shopifyDomain: job.shopifyDomain, id: { not: jobId } },
    orderBy: { createdAt: 'desc' },
    select: { shopifyDomain: true, shopifyAccessToken: true },
  })
  if (!fallback) return null

  const alt = new ShopifyUploader({ domain: fallback.shopifyDomain, accessToken: fallback.shopifyAccessToken })
  return (await alt.validate()) ? alt : null
}

// GET /api/shopify/manage/[jobId]?entity=products|customers|orders
// Optional: &domain=...&token=... to override stored credentials
export async function GET(
  req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params
  const { searchParams } = new URL(req.url)
  const entity = searchParams.get('entity')
  if (!entity || !['products', 'customers', 'orders'].includes(entity)) {
    return NextResponse.json({ error: 'entity must be products, customers, or orders' }, { status: 400 })
  }

  const shopify = await resolveShopify(
    jobId,
    searchParams.get('domain') ?? undefined,
    searchParams.get('token') ?? undefined,
  )
  if (!shopify) return NextResponse.json({ error: 'Could not authenticate with Shopify. Please enter credentials manually.' }, { status: 401 })

  try {
    let ids: number[]
    if (entity === 'products') ids = await shopify.getAllProductIds()
    else if (entity === 'customers') ids = await shopify.getAllCustomerIds()
    else ids = await shopify.getAllOrderIds()
    return NextResponse.json({ count: ids.length, ids })
  } catch (err) {
    console.error(`[manage/${entity}] GET error`, err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// DELETE /api/shopify/manage/[jobId]
// Body: { entity, ids, domain?, token? }
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params
  const { entity, ids, domain, token } = (await req.json()) as {
    entity: string; ids: number[]; domain?: string; token?: string
  }
  if (!entity || !Array.isArray(ids)) {
    return NextResponse.json({ error: 'entity and ids required' }, { status: 400 })
  }

  const shopify = await resolveShopify(jobId, domain, token)
  if (!shopify) return NextResponse.json({ error: 'Could not authenticate with Shopify. Please enter credentials manually.' }, { status: 401 })

  let deleted = 0
  let failed = 0
  for (const id of ids) {
    try {
      if (entity === 'products') await shopify.deleteProduct(id)
      else if (entity === 'customers') await shopify.deleteCustomer(id)
      else if (entity === 'orders') await shopify.deleteOrder(id)
      deleted++
    } catch {
      failed++
    }
  }
  return NextResponse.json({ deleted, failed })
}
