const fs = require('fs')
const path = 'src/inngest/migration.function.ts'
let code = fs.readFileSync(path, 'utf8')

if (!code.includes('onFailure:')) {
  code = code.replace(
    `export const startMigration = inngest.createFunction(
  { id: 'migration-runner', retries: 3 },
  { event: 'migration/start' },
  async ({ event, step }) => {`,
    `export const startMigration = inngest.createFunction(
  { 
    id: 'migration-runner', 
    retries: 3,
    onFailure: async ({ event, error }) => {
      const jobId = event.data.event.data.jobId;
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      await prisma.migrationJob.update({
        where: { id: jobId },
        data: { 
          status: 'FAILED',
          errorLog: JSON.stringify({ message: error.message, stack: error.stack })
        }
      });
      await prisma.$disconnect();
    }
  },
  { event: 'migration/start' },
  async ({ event, step }) => {`
  )
  fs.writeFileSync(path, code)
  console.log('Patched onFailure!')
} else {
  console.log('Already patched.')
}
