import { serve } from 'inngest/next'
import { inngest } from '@/inngest/client'
import { migrationStart, migrationChunk, migrationComplete, migrationDeleteOrders } from '@/inngest/migration.function'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [migrationStart, migrationChunk, migrationComplete, migrationDeleteOrders],
})

export const maxDuration = 60

