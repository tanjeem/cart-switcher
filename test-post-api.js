const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const jobs = await prisma.migrationJob.findMany({
    orderBy: { createdAt: 'desc' },
    take: 1
  })
  const job = jobs[0]
  
  const res = await fetch(`http://localhost:3000/api/inngest`, {
    method: 'PUT'
  })
  console.log('Inngest sync:', res.status)
}
main().catch(console.error).finally(() => prisma.$disconnect())
