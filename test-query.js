require('dotenv').config({ path: '.env.local' })
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
async function main() {
  const jobs = await prisma.migrationJob.findMany({
    orderBy: { createdAt: 'desc' },
    take: 1,
    include: {
      logs: {
        where: { entity: 'order', status: 'failed' },
        take: 5
      }
    }
  })
  console.log(JSON.stringify(jobs, null, 2))
}
main().catch(console.error).finally(() => prisma.$disconnect())
