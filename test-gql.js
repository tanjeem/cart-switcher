const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const jobs = await prisma.migrationJob.findMany({
    orderBy: { createdAt: 'desc' },
    take: 1
  })
  const job = jobs[0]
  const domain = job.shopifyDomain.replace(/^https?:\/\//, '').replace(/\/$/, '')
  
  const res1 = await fetch(`https://${domain}/admin/api/2024-10/graphql.json`, {
    method: 'POST',
    headers: {
      'X-Shopify-Access-Token': job.shopifyAccessToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `query bulkOp($id: ID!) {
          node(id: $id) {
            ... on BulkOperation {
              id status errorCode url objectCount
            }
          }
        }`,
      variables: { id: "gid://shopify/BulkOperation/123" }
    })
  })
  const json1 = await res1.json()
  console.log('Result:', JSON.stringify(json1, null, 2))
}
main().catch(console.error).finally(() => prisma.$disconnect())
