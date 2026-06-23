const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const jobs = await prisma.migrationJob.findMany({
    orderBy: { createdAt: 'desc' },
    take: 1
  })
  const job = jobs[0]
  console.log('Job:', job.id, 'doneOrders:', job.doneOrders, 'failedOrders:', job.failedOrders, 'status:', job.status, 'errorLog:', job.errorLog, 'updatedAt:', job.updatedAt)
}
main().catch(console.error).finally(() => prisma.$disconnect())
