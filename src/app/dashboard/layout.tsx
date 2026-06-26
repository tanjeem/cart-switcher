import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import Link from 'next/link'
import { LayoutDashboard, Zap, MessageCircle, ArrowRight } from 'lucide-react'
import { db } from '@/lib/db'

const G = '#96bf48'
const GL = '#eef7e0'
const GD = '#4a7a10'

const PLAN_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  FREE:    { bg: '#f9fafb', text: '#6b7280', border: '#e5e7eb' },
  STARTER: { bg: GL,        text: GD,        border: `${G}50`  },
  GROWTH:  { bg: GL,        text: GD,        border: `${G}50`  },
  PRO:     { bg: '#1a1a1a', text: '#96bf48', border: '#333'    },
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await db.user.findUnique({ where: { clerkId: userId } })
  const plan = user?.plan ?? 'FREE'
  const pc = PLAN_COLORS[plan]

  const navLinks = [
    { href: '/dashboard',         icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/dashboard/support', icon: MessageCircle,   label: 'Support'   },
  ]

  return (
    <div className="min-h-screen bg-[#f7f7f6] flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-black text-lg tracking-tight">
            Cart<span style={{ color: G }}>Switcher</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(({ href, icon: Icon, label }) => (
              <Link key={href} href={href}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all">
                <Icon className="w-4 h-4" />{label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {/* Plan badge */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold"
            style={{ backgroundColor: pc.bg, color: pc.text, borderColor: pc.border }}>
            {plan === 'FREE' ? (
              <Link href="/checkout" className="flex items-center gap-1 hover:underline">
                Free plan · Upgrade <ArrowRight className="w-3 h-3" />
              </Link>
            ) : (
              <><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: G }} />{plan}</>
            )}
          </div>

          {plan !== 'FREE' && (
            <Link href="/dashboard/migration/new"
              className="hidden sm:flex items-center gap-1.5 text-white text-sm font-bold px-4 py-2 rounded-full transition-all hover:opacity-90"
              style={{ backgroundColor: G }}>
              <Zap className="w-3.5 h-3.5" /> New migration
            </Link>
          )}

          <UserButton />
        </div>
      </header>

      {/* Page */}
      <main className="flex-1">{children}</main>
    </div>
  )
}
