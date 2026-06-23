const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
async function main() {
  const jobs = await prisma.migrationJob.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      status: true,
      totalOrders: true,
      doneOrders: true,
      failedOrders: true,
      errorLog: true,
      createdAt: true
    }
  })
  console.log(JSON.stringify(jobs, null, 2))
}
main().catch(console.error).finally(() => prisma.$disconnect())
