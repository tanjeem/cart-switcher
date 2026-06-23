const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const job = await prisma.migrationJob.findFirst({
    orderBy: { createdAt: 'desc' }
  })
  console.log('Fetching logs for job', job.id)
  
  const logs = await prisma.migrationLog.findMany({
    where: { jobId: job.id },
    take: 5
  })
  console.log('Logs:', logs)
  
  const events = await fetch(`http://127.0.0.1:8288/api/v1/events?limit=5`)
    .then(r => r.json())
    .catch(e => e.message)
    
  console.log('Inngest Dev Server Events:', events)
}
main().catch(console.error).finally(() => prisma.$disconnect())
