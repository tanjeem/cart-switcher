const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const job = await prisma.migrationJob.findUnique({
    where: { id: 'cmqqyr1xb0001cn6xuklml785' }
  })
  console.log('Job:', job.id, 'doneOrders:', job.doneOrders, 'status:', job.status, 'updatedAt:', job.updatedAt)
}
main().catch(console.error).finally(() => prisma.$disconnect())
