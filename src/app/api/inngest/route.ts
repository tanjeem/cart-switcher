import { serve } from 'inngest/next'
import { inngest } from '@/inngest/client'
import { migrationFunction } from '@/inngest/migration.function'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [migrationFunction],
})
