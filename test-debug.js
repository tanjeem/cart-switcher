const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const WooCommerceRestApi = require('@woocommerce/woocommerce-rest-api').default

async function main() {
  const jobs = await prisma.migrationJob.findMany({ orderBy: { createdAt: 'desc' }, take: 1 })
  const job = jobs[0]
  
  const wc = new WooCommerceRestApi({
    url: job.wcUrl.startsWith('http') ? job.wcUrl : `https://${job.wcUrl}`,
    consumerKey: job.wcKey,
    consumerSecret: job.wcSecret,
    version: 'wc/v3'
  })

  // Fetch all orders
  const WC_PAGE_SIZE = 100
  const WC_PAGES_PER_STEP = 1
  const orderPageStepCount = Math.ceil(job.totalOrders / WC_PAGE_SIZE / WC_PAGES_PER_STEP)
  
  let orders = []
  console.log(`Fetching ${orderPageStepCount} pages...`)
  for (let i = 0; i < orderPageStepCount; i++) {
    const res = await wc.get('orders', { page: i * WC_PAGES_PER_STEP + 1, per_page: WC_PAGE_SIZE * WC_PAGES_PER_STEP })
    orders.push(...res.data)
  }

  const domain = job.shopifyDomain.replace(/^https?:\/\//, '').replace(/\/$/, '')
  
  async function gql(query, variables) {
    const res = await fetch(`https://${domain}/admin/api/2024-10/graphql.json`, {
      method: 'POST',
      headers: { 'X-Shopify-Access-Token': job.shopifyAccessToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables })
    })
    const json = await res.json()
    if (json.errors) throw new Error(JSON.stringify(json.errors))
    return json.data
  }

  // Get existing orders to skip
  const existingOrders = new Set()
  let hasNext = true
  let cursor = null
  while (hasNext) {
    const res = await gql(`
      query getOrders($cursor: String) {
        orders(first: 250, after: $cursor, query: "tag:cartswitcher-migrated") {
          pageInfo { hasNextPage endCursor }
          edges { node { customAttributes { key value } } }
        }
      }`, { cursor })
    
    for (const edge of res.orders.edges) {
      const wcId = edge.node.customAttributes.find((a) => a.key === 'wc_order_id')?.value
      if (wcId) existingOrders.add(wcId)
    }
    hasNext = res.orders.pageInfo.hasNextPage
    cursor = res.orders.pageInfo.endCursor
  }

  const pendingOrders = orders.filter(o => !existingOrders.has(o.id.toString()))
  console.log(`Pending orders: ${pendingOrders.length}`)

  if (pendingOrders.length === 0) return

  // Format to JSONL
  const jsonlLines = pendingOrders.map(o => {
    return JSON.stringify({
      order: {
        lineItems: o.line_items.map(li => ({
          title: li.name,
          quantity: li.quantity,
          price: li.price.toString()
        })),
        tags: ['cartswitcher-migrated'],
        noteAttributes: [{ name: 'wc_order_id', value: o.id.toString() }]
      }
    })
  })
  const jsonl = jsonlLines.join('\n') + '\n'

  console.log(`JSONL length: ${jsonl.length} bytes`)

  // Staged upload
  const stagedRes = await gql(`
    mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
      stagedUploadsCreate(input: $input) {
        stagedTargets { url parameters { name value } }
        userErrors { field message }
      }
    }`, {
    input: [{
      filename: 'orders.jsonl',
      mimeType: 'text/jsonl',
      httpMethod: 'POST',
      resource: 'BULK_MUTATION_VARIABLES'
    }]
  })

  const target = stagedRes.stagedUploadsCreate?.stagedTargets?.[0]
  if (!target) throw new Error('No target')

  const form = new FormData()
  for (const p of target.parameters) form.append(p.name, p.value)
  form.append('file', new Blob([jsonl], { type: 'text/jsonl' }), 'orders.jsonl')

  const startT = Date.now()
  const uploadRes = await fetch(target.url, { method: 'POST', body: form })
  console.log('Upload HTTP:', uploadRes.status, 'Time:', Date.now() - startT, 'ms')

  const key = target.parameters.find(p => p.name === 'key')?.value

  const ORDER_MUTATION = `
    mutation orderCreate($order: OrderCreateOrderInput!) {
      orderCreate(order: $order) {
        order { id }
        userErrors { field message }
      }
    }`

  const startT2 = Date.now()
  const bulkRes = await gql(`
    mutation bulkOperationRunMutation($mutation: String!, $stagedUploadPath: String!) {
      bulkOperationRunMutation(
        mutation: $mutation,
        stagedUploadPath: $stagedUploadPath
      ) {
        bulkOperation { id status }
        userErrors { field message }
      }
    }`, {
    mutation: ORDER_MUTATION,
    stagedUploadPath: key
  })

  console.log('Bulk Res:', JSON.stringify(bulkRes, null, 2), 'Time:', Date.now() - startT2, 'ms')
}
main().catch(console.error).finally(() => prisma.$disconnect())
