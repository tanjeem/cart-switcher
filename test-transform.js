const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const WooCommerceRestApi = require('@woocommerce/woocommerce-rest-api').default
const { transformOrder } = require('./src/transformers') // Wait, transformers is TS, need ts-node or just require the built output... I'll just write it manually

async function main() {
  const jobs = await prisma.migrationJob.findMany({ orderBy: { createdAt: 'desc' }, take: 1 })
  const job = jobs[0]
  
  const wc = new WooCommerceRestApi({
    url: job.wcUrl.startsWith('http') ? job.wcUrl : `https://${job.wcUrl}`,
    consumerKey: job.wcKey,
    consumerSecret: job.wcSecret,
    version: 'wc/v3'
  })

  // We can just fetch a few orders to see if one of them breaks.
  // Wait, I can run `npm run start` script using ts-node or Next.js!
  // I will just use `npx ts-node`
}
main().catch(console.error).finally(() => prisma.$disconnect())
