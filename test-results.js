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
    headers: { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `query { currentBulkOperation { id status errorCode url objectCount } }`
    })
  })
  const json = await res.json()
  const op = json.data.currentBulkOperation
  console.log(op)
  
  if (op.url) {
    const resUrl = await fetch(op.url)
    if (!resUrl.ok) throw new Error(`HTTP ${resUrl.status}`)
    const text = await resUrl.text()
    console.log('Result lines:', text.split('\n').length)
  }
}
main().catch(console.error).finally(() => prisma.$disconnect())
