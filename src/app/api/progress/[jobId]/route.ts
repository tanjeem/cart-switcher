import { db } from '@/lib/db'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {

  const { jobId } = await params

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      const poll = async () => {
        const [job, logs] = await Promise.all([
          db.migrationJob.findUnique({
            where: { id: jobId },
            select: {
              id: true,
              status: true,
              wcUrl: true,
              shopifyDomain: true,
              startedAt: true,
              completedAt: true,
              totalProducts: true,
              totalOrders: true,
              totalCustomers: true,
              totalCoupons: true,
              totalPosts: true,
              doneProducts: true,
              doneOrders: true,
              doneCustomers: true,
              doneCoupons: true,
              donePosts: true,
              failedProducts: true,
              failedOrders: true,
              failedCustomers: true,
            },
          }),
          db.migrationLog.findMany({
            where: { jobId },
            orderBy: { createdAt: 'asc' },
            take: 200,
            select: { id: true, entity: true, status: true, message: true, createdAt: true },
          }),
        ])

        if (!job) {
          controller.close()
          return
        }

        const errorCount = (job.failedProducts ?? 0) + (job.failedOrders ?? 0) + (job.failedCustomers ?? 0)
        send({ ...job, errorCount, logs })

        if (job.status === 'DONE' || job.status === 'FAILED' || job.status === 'PARTIAL' || job.status === 'CANCELLED') {
          controller.close()
          return
        }

        setTimeout(poll, 1500)
      }

      await poll()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
