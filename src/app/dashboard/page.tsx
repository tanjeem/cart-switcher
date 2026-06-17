import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/lib/db'
import { UserButton } from '@clerk/nextjs'

export default async function DashboardPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await db.user.findUnique({
    where: { clerkId: userId },
    include: {
      jobs: {
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
    },
  })

  const jobs = user?.jobs ?? []

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="flex items-center justify-between px-8 py-5 border-b bg-white">
        <Link href="/" className="font-bold text-xl">CartSwitcher</Link>
        <div className="flex items-center gap-4">
          <Link
            href="/migrate/connect"
            className="bg-black text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
          >
            New migration
          </Link>
          <UserButton />
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold mb-8">Migration history</h1>

        {jobs.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg mb-4">No migrations yet</p>
            <Link
              href="/migrate/connect"
              className="bg-black text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              Start your first migration
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map(job => (
              <div key={job.id} className="bg-white border rounded-xl p-5 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{job.wcUrl}</span>
                    <span className="text-gray-400 text-xs">→</span>
                    <span className="font-medium text-sm">{job.shopifyDomain}</span>
                    {job.isDemo && (
                      <span className="bg-blue-50 text-blue-600 text-xs px-2 py-0.5 rounded-full border border-blue-100">Demo</span>
                    )}
                  </div>
                  <div className="flex gap-4 text-xs text-gray-500">
                    <span>{job.doneProducts.toLocaleString()} products</span>
                    <span>{job.doneOrders.toLocaleString()} orders</span>
                    <span>{job.doneCustomers.toLocaleString()} customers</span>
                    <span>{new Date(job.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={job.status} />
                  {(job.status === 'RUNNING' || job.status === 'PENDING') && (
                    <Link
                      href={`/migrate/progress/${job.id}`}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      View progress
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    PENDING: { label: 'Queued',   cls: 'bg-gray-100 text-gray-600' },
    RUNNING: { label: 'Running',  cls: 'bg-blue-50 text-blue-700' },
    DONE:    { label: 'Done',     cls: 'bg-green-50 text-green-700' },
    PARTIAL: { label: 'Partial',  cls: 'bg-yellow-50 text-yellow-700' },
    FAILED:  { label: 'Failed',   cls: 'bg-red-50 text-red-700' },
  }
  const { label, cls } = map[status] ?? map.PENDING
  return <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cls}`}>{label}</span>
}
