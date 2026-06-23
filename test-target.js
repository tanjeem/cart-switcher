const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const jobs = await prisma.migrationJob.findMany({ orderBy: { createdAt: 'desc' }, take: 1 })
  const job = jobs[0]
  const domain = job.shopifyDomain.replace(/^https?:\/\//, '').replace(/\/$/, '')
  
  const res = await fetch(`https://${domain}/admin/api/2024-10/graphql.json`, {
    method: 'POST',
    headers: { 'X-Shopify-Access-Token': job.shopifyAccessToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `mutation {
        stagedUploadsCreate(input: [{
          filename: "orders.jsonl",
          mimeType: "text/jsonl",
          httpMethod: POST,
          resource: BULK_MUTATION_VARIABLES
        }]) {
          stagedTargets { url parameters { name value } }
        }
      }`
    })
  })
  console.log(JSON.stringify(await res.json(), null, 2))
}
main().catch(console.error).finally(() => prisma.$disconnect())
