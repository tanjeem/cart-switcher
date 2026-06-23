const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
async function main() {
  const jobs = await prisma.migrationJob.findMany({
    orderBy: { createdAt: 'desc' },
    take: 3,
    select: {
      id: true,
      status: true,
      doneOrders: true,
      errorLog: true,
      createdAt: true,
      updatedAt: true
    }
  })
  console.log(JSON.stringify(jobs, null, 2))
}
main().catch(console.error).finally(() => prisma.$disconnect())
