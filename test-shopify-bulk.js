const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const jobs = await prisma.migrationJob.findMany({
    orderBy: { createdAt: 'desc' },
    take: 1
  })
  const job = jobs[0]
  console.log('Testing Shopify bulk query for job', job.id)
  
  const domain = job.shopifyDomain.replace(/^https?:\/\//, '').replace(/\/$/, '')
  
  const res = await fetch(`https://${domain}/admin/api/2024-10/graphql.json`, {
    method: 'POST',
    headers: {
      'X-Shopify-Access-Token': job.shopifyAccessToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `query {
        currentBulkOperation(type: MUTATION) {
          id status errorCode url objectCount
        }
      }`
    })
  })
  const json = await res.json()
  console.log(JSON.stringify(json, null, 2))
}
main().catch(console.error).finally(() => prisma.$disconnect())
