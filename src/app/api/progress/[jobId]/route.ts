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
              startedAt: true,
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
              errorLog: true,
            },
          }),
          db.migrationLog.findMany({
            where: { jobId, status: 'failed' },
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: { entity: true, entityId: true, message: true, createdAt: true },
          }),
        ])

        if (!job) {
          controller.close()
          return
        }

        send({ ...job, recentErrors: logs })

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
