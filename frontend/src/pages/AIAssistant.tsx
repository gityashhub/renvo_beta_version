import { useState, useEffect, useRef } from 'react'
import { sendMessage, getHistory, clearHistory } from '../api/ai'
import { getColumnTypes } from '../api/dataset'
import { Button, SectionHeader } from '../components/ui'
import { Send, Trash2, Bot, User, Sparkles, MessageSquare } from 'lucide-react'
import { cn } from '../lib/utils'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export default function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [columns, setColumns] = useState<string[]>([])
  const [selectedCol, setSelectedCol] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  const suggestions = [
    "What should I clean first?",
    "Explain missing value patterns",
    "Recommend a cleaning approach",
    "Are there any outliers in the data?",
  ]

  useEffect(() => {
    loadHistory()
    getColumnTypes().then(d => setColumns(['(None)', ...Object.keys(d.column_types)])).catch(() => {})
  }, [])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, loading])

  const loadHistory = async () => {
    try {
      const { history } = await getHistory()
      setMessages(history)
    } catch {}
  }

  const handleSend = async (text: string = input) => {
    if (!text.trim() || loading) return
    
    const userMsg: Message = {
      role: 'user',
      content: text,
      timestamp: new Date().toISOString()
    }
    
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)
    
    try {
      const res = await sendMessage(text, selectedCol === '(None)' ? undefined : selectedCol)
      const assistantMsg: Message = {
        role: 'assistant',
        content: res.response,
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, assistantMsg])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "I'm sorry, I encountered an error processing your request.",
        timestamp: new Date().toISOString()
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleClear = async () => {
    if (confirm("Are you sure you want to clear the chat history?")) {
      await clearHistory()
      setMessages([])
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] lg:h-screen p-3 sm:p-4 lg:p-6 bg-slate-50">
      <SectionHeader 
        title="AI Assistant" 
        subtitle="Powered by Llama 3.1 via Groq"
        action={
          <Button variant="ghost" size="sm" onClick={handleClear} className="text-slate-500 hover:text-red-600">
            <Trash2 className="w-4 h-4 mr-2" />
            Clear History
          </Button>
        }
      />

      <div className="flex-1 flex flex-col min-h-0 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {/* Chat Area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4 max-w-md mx-auto">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center">
                <Bot className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">How can I help you today?</h3>
              <p className="text-sm text-slate-500">
                I can help you analyze your data, suggest cleaning steps, or explain complex statistical patterns.
              </p>
              <div className="grid grid-cols-1 gap-2 w-full pt-4">
                {suggestions.map(s => (
                  <button 
                    key={s}
                    onClick={() => handleSend(s)}
                    className="text-left p-3 text-sm bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={cn("flex gap-4", msg.role === 'user' ? "justify-end" : "justify-start")}>
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
                  <Bot className="w-5 h-5 text-white" />
                </div>
              )}
              <div className={cn(
                "max-w-[80%] rounded-2xl p-4 text-sm shadow-sm",
                msg.role === 'user' 
                  ? "bg-blue-600 text-white" 
                  : "bg-white border border-slate-200 text-slate-800"
              )}>
                {msg.content}
              </div>
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-slate-600" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" />
                  <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="max-w-4xl mx-auto space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <MessageSquare className="w-3.5 h-3.5" />
                Ask about column:
              </div>
              <select 
                className="bg-transparent text-[11px] font-bold text-blue-600 hover:text-blue-700 outline-none cursor-pointer"
                value={selectedCol}
                onChange={e => setSelectedCol(e.target.value)}
              >
                {columns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            
            <form 
              className="flex gap-2"
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            >
              <input 
                type="text" 
                placeholder="Message Renvo Assistant..."
                className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                value={input}
                onChange={e => setInput(e.target.value)}
                disabled={loading}
              />
              <Button type="submit" disabled={!input.trim() || loading} className="rounded-xl px-5 h-auto">
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
