import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { UserButton } from '@clerk/nextjs'
import { Users, Zap, CreditCard, MessageCircle, LayoutDashboard } from 'lucide-react'

const G = '#96bf48'
const ADMIN_EMAIL = 'tanjeem.adeeb@gmail.com'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  // Lazy import to avoid circular deps — check email via Clerk
  const { clerkClient } = await import('@clerk/nextjs/server')
  const client = await clerkClient()
  const user = await client.users.getUser(userId)
  const email = user.emailAddresses[0]?.emailAddress ?? ''
  if (email !== ADMIN_EMAIL) redirect('/dashboard')

  const navLinks = [
    { href: '/admin',            icon: LayoutDashboard, label: 'Overview'   },
    { href: '/admin/users',      icon: Users,           label: 'Users'      },
    { href: '/admin/migrations', icon: Zap,             label: 'Migrations' },
    { href: '/admin/payments',   icon: CreditCard,      label: 'Payments'   },
    { href: '/admin/chat',       icon: MessageCircle,   label: 'Support'    },
  ]

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white flex flex-col">
      <header className="bg-[#1a1a1a] border-b border-white/10 px-6 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-6">
          <Link href="/admin" className="font-black text-lg tracking-tight">
            Cart<span style={{ color: G }}>Switcher</span>
            <span className="ml-2 text-[10px] font-black uppercase tracking-widest bg-white/10 px-2 py-0.5 rounded-full text-white/50">Admin</span>
          </Link>
          <nav className="flex items-center gap-1">
            {navLinks.map(({ href, icon: Icon, label }) => (
              <Link key={href} href={href}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white/50 hover:text-white hover:bg-white/10 transition-all">
                <Icon className="w-4 h-4" />{label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-xs text-white/30 hover:text-white/60">← User view</Link>
          <UserButton />
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  )
}
