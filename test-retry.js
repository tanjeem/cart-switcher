const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function test() {
  const job = await prisma.migrationJob.findUnique({ where: { id: 'cmqsl6b8g0002icsxiu32q6gh' } });
  console.log('doneProducts:', job.doneProducts, 'failedProducts:', job.failedProducts);
}
test().finally(() => prisma.$disconnect());
