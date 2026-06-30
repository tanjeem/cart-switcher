import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Auth is handled server-side via Clerk's auth() in each layout/page.
// proxy.ts (Next.js 16) runs on Node.js runtime which is incompatible
// with clerkMiddleware (Edge Runtime), so we pass through all requests here.
export default function proxy(_req: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)', '/(api|trpc)(.*)'],
}
