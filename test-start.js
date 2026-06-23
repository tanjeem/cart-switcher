const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const jobs = await prisma.migrationJob.findMany({
    orderBy: { createdAt: 'desc' },
    take: 1
  })
  const job = jobs[0]
  const domain = job.shopifyDomain.replace(/^https?:\/\//, '').replace(/\/$/, '')
  const token = job.shopifyAccessToken

  async function gql(query, variables) {
    const res = await fetch(`https://${domain}/admin/api/2024-10/graphql.json`, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables })
    })
    const json = await res.json()
    if (json.errors) throw new Error(JSON.stringify(json.errors))
    return json.data
  }

  // 1. Get staged upload URL
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
  
  console.log('Staged:', JSON.stringify(stagedRes, null, 2))

  const target = stagedRes.stagedUploadsCreate?.stagedTargets?.[0]
  
  // Dummy JSONL
  const jsonl = `{"order":{"lineItems":[{"title":"Test","quantity":1,"price":"1.00"}],"tags":"cartswitcher-migrated"}}
`
  const form = new FormData()
  for (const p of target.parameters) form.append(p.name, p.value)
  form.append('file', new Blob([jsonl], { type: 'text/jsonl' }), 'orders.jsonl')
  
  const uploadRes = await fetch(target.url, { method: 'POST', body: form })
  console.log('Upload HTTP:', uploadRes.status)

  const key = target.parameters.find(p => p.name === 'key')?.value
  
  const ORDER_MUTATION = `
    mutation orderCreate($order: OrderCreateOrderInput!) {
      orderCreate(order: $order) {
        order { id }
        userErrors { field message }
      }
    }`

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

  console.log('Bulk Res:', JSON.stringify(bulkRes, null, 2))
}
main().catch(console.error).finally(() => prisma.$disconnect())
