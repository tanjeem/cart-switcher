const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const fs = require('fs')

async function main() {
  const jobs = await prisma.migrationJob.findMany({
    orderBy: { createdAt: 'desc' },
    take: 1
  })
  const job = jobs[0]
  
  // Let's just fetch the 1548 orders from Woo? No, woo URL is in the job.
  // We can't easily fetch them without the wc client.
}
main().catch(console.error).finally(() => prisma.$disconnect())
