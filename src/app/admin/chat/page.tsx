'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Send, MessageCircle } from 'lucide-react'

const G = '#96bf48'

interface Msg {
  id: string
  body: string
  fromAdmin: boolean
  createdAt: string
}

interface UserThread {
  userId: string
  email: string
  plan: string
  unread: number
  lastMessage: string
  lastAt: string
}

function AdminChatInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const focusedUserId = searchParams.get('userId')

  const [threads, setThreads] = useState<UserThread[]>([])
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  async function loadThreads() {
    const res = await fetch('/api/admin/chat/threads')
    if (res.ok) setThreads(await res.json())
  }

  async function loadMessages(uid: string) {
    const res = await fetch(`/api/admin/chat/messages?userId=${uid}`)
    if (res.ok) setMessages(await res.json())
  }

  useEffect(() => { loadThreads() }, [])
  useEffect(() => {
    if (focusedUserId) {
      loadMessages(focusedUserId)
      const t = setInterval(() => loadMessages(focusedUserId), 4000)
      return () => clearInterval(t)
    }
  }, [focusedUserId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send() {
    const body = input.trim()
    if (!body || sending || !focusedUserId) return
    setSending(true)
    setInput('')
    const optimistic: Msg = { id: `tmp-${Date.now()}`, body, fromAdmin: true, createdAt: new Date().toISOString() }
    setMessages(prev => [...prev, optimistic])
    await fetch('/api/admin/chat/reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: focusedUserId, body }),
    })
    setSending(false)
  }

  const focusedThread = threads.find(t => t.userId === focusedUserId)

  return (
    <div className="flex h-[calc(100vh-57px)]">
      {/* Thread sidebar */}
      <div className="w-72 border-r border-white/10 bg-[#141414] flex flex-col flex-shrink-0">
        <div className="px-4 py-4 border-b border-white/10">
          <h2 className="font-black text-sm">Support threads</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {threads.length === 0 && (
            <div className="p-6 text-white/30 text-xs text-center">No messages yet</div>
          )}
          {threads.map(t => (
            <button key={t.userId} onClick={() => router.push(`/admin/chat?userId=${t.userId}`)}
              className={`w-full text-left px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors ${focusedUserId === t.userId ? 'bg-white/10' : ''}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold truncate">{t.email}</span>
                {t.unread > 0 && (
                  <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black text-white flex-shrink-0"
                    style={{ backgroundColor: G }}>
                    {t.unread}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-white/30 truncate">{t.lastMessage}</div>
              <div className="text-[10px] text-white/20 mt-0.5">{t.plan} · {new Date(t.lastAt).toLocaleDateString()}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Conversation */}
      <div className="flex-1 flex flex-col">
        {focusedUserId ? (
          <>
            <div className="px-6 py-4 border-b border-white/10 flex items-center gap-3">
              <MessageCircle className="w-4 h-4" style={{ color: G }} />
              <div>
                <div className="font-bold text-sm">{focusedThread?.email ?? focusedUserId}</div>
                <div className="text-xs text-white/30">{focusedThread?.plan ?? ''}</div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.fromAdmin ? 'justify-end' : 'justify-start'}`}>
                  <div className="max-w-[70%]">
                    {!msg.fromAdmin && <div className="text-[10px] text-white/30 mb-1 ml-1">User</div>}
                    {msg.fromAdmin && <div className="text-[10px] text-white/30 mb-1 mr-1 text-right">You</div>}
                    <div className="px-4 py-2.5 rounded-2xl text-sm leading-relaxed"
                      style={msg.fromAdmin
                        ? { backgroundColor: G, color: 'white' }
                        : { backgroundColor: '#2a2a2a', color: 'white' }}>
                      {msg.body}
                    </div>
                    <div className={`text-[10px] text-white/20 mt-1 ${msg.fromAdmin ? 'text-right mr-1' : 'ml-1'}`}>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            <div className="border-t border-white/10 px-5 py-4 flex items-end gap-3">
              <textarea
                className="flex-1 resize-none text-sm px-3 py-2 rounded-xl bg-white/10 border border-white/20 focus:outline-none focus:border-white/40 text-white min-h-[40px] max-h-32 placeholder:text-white/20"
                placeholder="Type a reply…"
                value={input}
                rows={1}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
              />
              <button onClick={send} disabled={sending || !input.trim()}
                className="w-9 h-9 rounded-full flex items-center justify-center text-white flex-shrink-0 disabled:opacity-40 hover:opacity-90 transition-all"
                style={{ backgroundColor: G }}>
                <Send className="w-4 h-4" />
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-white/20">
            <div className="text-center">
              <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">Select a thread to view the conversation</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function AdminChatPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-[60vh]"><div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" /></div>}>
      <AdminChatInner />
    </Suspense>
  )
}
