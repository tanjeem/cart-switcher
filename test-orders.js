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

  const res = await fetch(`https://${domain}/admin/api/2024-10/graphql.json`, {
    method: 'POST',
    headers: {
      'X-Shopify-Access-Token': token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `query {
        orders(first: 5, sortKey: CREATED_AT, reverse: true) {
          edges {
            node {
              id
              createdAt
              name
            }
          }
        }
      }`
    })
  })
  const json = await res.json()
  console.log('Latest Orders:', JSON.stringify(json, null, 2))
}
main().catch(console.error).finally(() => prisma.$disconnect())
