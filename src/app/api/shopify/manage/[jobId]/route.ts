import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ShopifyUploader } from '@/uploaders/shopify'

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
  return new ShopifyUploader({ domain: job.shopifyDomain, accessToken: job.shopifyAccessToken })
}

// GET /api/shopify/manage/[jobId]?entity=products|customers|orders
// Optional query params: domain, token (override stored credentials)
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
  if (!shopify) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

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
  if (!shopify) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

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
