const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const jobs = await prisma.migrationJob.findMany({
    orderBy: { createdAt: 'desc' },
    take: 1
  })
  const job = jobs[0]
  console.log(job.id)
  
  // Update the job with a dummy status to see if Vercel is overriding it? No.
}
main().catch(console.error).finally(() => prisma.$disconnect())
