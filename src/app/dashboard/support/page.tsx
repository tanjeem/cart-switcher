'use client'

import { useState, useEffect, useRef } from 'react'
import { Send, MessageCircle } from 'lucide-react'

const G = '#96bf48'
const GL = '#eef7e0'

interface Msg {
  id: string
  body: string
  fromAdmin: boolean
  createdAt: string
}

export default function SupportPage() {
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  async function loadMessages() {
    try {
      const res = await fetch('/api/support/messages')
      if (res.ok) setMessages(await res.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadMessages() }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Poll every 5s for new admin replies
  useEffect(() => {
    const t = setInterval(loadMessages, 5000)
    return () => clearInterval(t)
  }, [])

  async function send() {
    const body = input.trim()
    if (!body || sending) return
    setSending(true)
    const optimistic: Msg = { id: `tmp-${Date.now()}`, body, fromAdmin: false, createdAt: new Date().toISOString() }
    setMessages(prev => [...prev, optimistic])
    setInput('')
    try {
      const res = await fetch('/api/support/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      })
      if (res.ok) {
        const msg = await res.json()
        setMessages(prev => [...prev.filter(m => m.id !== optimistic.id), msg])
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="max-w-[720px] mx-auto px-6 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <MessageCircle className="w-5 h-5" style={{ color: G }} />
          <h1 className="text-xl font-black text-gray-900">Support</h1>
        </div>
        <p className="text-sm text-gray-400">Send us a message and we&apos;ll reply within a few hours.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col" style={{ height: 520 }}>
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {loading && (
            <div className="flex items-center justify-center h-full">
              <span className="w-5 h-5 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
            </div>
          )}

          {!loading && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
              <MessageCircle className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">No messages yet</p>
              <p className="text-xs mt-1">Ask us anything about your migration.</p>
            </div>
          )}

          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.fromAdmin ? 'justify-start' : 'justify-end'}`}>
              <div className="max-w-[75%]">
                {msg.fromAdmin && (
                  <div className="text-[10px] text-gray-400 font-semibold mb-1 ml-1">CartSwitcher Support</div>
                )}
                <div className="px-4 py-2.5 rounded-2xl text-sm leading-relaxed"
                  style={msg.fromAdmin
                    ? { backgroundColor: '#f3f4f6', color: '#111' }
                    : { backgroundColor: G, color: 'white' }}>
                  {msg.body}
                </div>
                <div className={`text-[10px] text-gray-300 mt-1 ${msg.fromAdmin ? 'ml-1' : 'text-right mr-1'}`}>
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-100 px-4 py-3 flex items-end gap-3">
          <textarea
            className="flex-1 resize-none text-sm px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:border-gray-400 min-h-[40px] max-h-32"
            placeholder="Type your message…"
            value={input}
            rows={1}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          />
          <button onClick={send} disabled={sending || !input.trim()}
            className="w-9 h-9 rounded-full flex items-center justify-center text-white transition-all hover:opacity-90 disabled:opacity-40 flex-shrink-0"
            style={{ backgroundColor: G }}>
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-4 text-center">
        Average response time: under 4 hours · Mon–Fri 9am–6pm EST
      </p>
    </div>
  )
}
