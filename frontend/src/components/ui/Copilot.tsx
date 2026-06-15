import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, X, Send, Bot, ArrowUpRight, Loader2, Check, Ban } from 'lucide-react'
import api from '@/lib/api'
import { cn } from '@/lib/utils'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface Action {
  label: string
  route: string
}

export default function Copilot() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'Hi! I am your SpiderSmart IMS Copilot. Ask me anything about the inventory records, legal holds, or how to navigate the system.',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [actions, setActions] = useState<Action[]>([])
  const [pendingAction, setPendingAction] = useState<any>(null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (isOpen) {
      scrollToBottom()
    }
  }, [messages, isOpen, pendingAction])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading || pendingAction) return

    const userMessage = input.trim()
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }])
    setLoading(true)
    setActions([])

    try {
      const response = await api.post('/copilot/chat', {
        message: userMessage,
        history: messages.slice(-10),
      })

      const reply = response.data.response
      const suggestedActions = response.data.actions_suggested || []
      const pending = response.data.pending_action

      setMessages((prev) => [...prev, { role: 'assistant', content: reply }])
      setActions(suggestedActions)
      if (pending) {
        setPendingAction(pending)
      }
    } catch (error) {
      console.error('Copilot chat error:', error)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please check your connection or try again later.',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleExecuteAction = async (confirmed: boolean) => {
    if (!pendingAction) return
    
    if (!confirmed) {
      setMessages((prev) => [...prev, { role: 'assistant', content: '🚫 Action cancelled.' }])
      setPendingAction(null)
      return
    }

    setLoading(true)
    const actionToRun = pendingAction
    setPendingAction(null)

    try {
      const response = await api.post('/copilot/execute', actionToRun)
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: response.data.message },
      ])
    } catch (error: any) {
      console.error('Action execution failed:', error)
      const errorMsg = error.response?.data?.detail || 'Database execution failed. Please verify permissions or parameters.'
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `❌ **Execution Failed:** ${errorMsg}` },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleActionClick = (route: string) => {
    navigate(route)
    setIsOpen(false)
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Chat Window */}
      {isOpen && (
        <div className="mb-4 flex h-[500px] w-96 flex-col rounded-2xl border bg-card text-card-foreground shadow-2xl animate-in slide-in-from-bottom-5 duration-200 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between bg-primary p-4 text-primary-foreground">
            <div className="flex items-center space-x-2">
              <Bot className="h-5 w-5" />
              <div>
                <h3 className="font-semibold text-sm">SpiderSmart Copilot</h3>
                <p className="text-[10px] opacity-80">AI Inventory Assistant</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-full p-1 hover:bg-primary-foreground/10 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/10">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "flex max-w-[80%] flex-col rounded-2xl p-3 text-sm",
                  msg.role === 'user'
                    ? "ml-auto bg-primary text-primary-foreground rounded-tr-none"
                    : "bg-card border rounded-tl-none shadow-sm"
                )}
              >
                <p className="whitespace-pre-line leading-relaxed">
                  {msg.content}
                </p>
              </div>
            ))}
            
            {loading && (
              <div className="flex items-center space-x-2 bg-card border rounded-2xl rounded-tl-none p-3 max-w-[80%] shadow-sm">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Processing...</span>
              </div>
            )}
            
            {/* Dynamic Action Chips */}
            {!loading && actions.length > 0 && !pendingAction && (
              <div className="flex flex-wrap gap-2 pt-2 animate-in fade-in duration-300">
                {actions.map((act, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleActionClick(act.route)}
                    className="flex items-center space-x-1 rounded-full border bg-background px-3 py-1.5 text-xs font-semibold hover:border-primary hover:text-primary transition-all shadow-sm"
                  >
                    <span>{act.label}</span>
                    <ArrowUpRight className="h-3 w-3" />
                  </button>
                ))}
              </div>
            )}

            {/* Pending Confirmation Controls */}
            {pendingAction && !loading && (
              <div className="flex flex-col space-y-2 border border-amber-500/30 bg-amber-500/5 rounded-xl p-3 animate-in slide-in-from-bottom-2 duration-300">
                <p className="text-xs font-bold text-amber-600 dark:text-amber-500 uppercase tracking-wider flex items-center">
                  ⚠️ Action Confirmation Required
                </p>
                <div className="text-[11px] text-muted-foreground space-y-1">
                  <div>**Action:** <span className="uppercase text-foreground">{pendingAction.action.replace('_', ' ')}</span></div>
                  {pendingAction.barcode && <div>**Barcode:** <span className="text-foreground">{pendingAction.barcode}</span></div>}
                  {pendingAction.box_barcode && <div>**New Box Barcode:** <span className="text-foreground">{pendingAction.box_barcode}</span></div>}
                  {pendingAction.category_name && <div>**Category:** <span className="text-foreground">{pendingAction.category_name}</span></div>}
                  {pendingAction.tag_name && <div>**Tag:** <span className="text-foreground">{pendingAction.tag_name}</span></div>}
                  {pendingAction.reason && <div>**Reason:** <span className="text-foreground">{pendingAction.reason}</span></div>}
                </div>
                <div className="flex space-x-2 pt-1">
                  <button
                    onClick={() => handleExecuteAction(true)}
                    className="flex-1 flex items-center justify-center space-x-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white py-1.5 text-xs font-bold transition-colors shadow-sm"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>Confirm</span>
                  </button>
                  <button
                    onClick={() => handleExecuteAction(false)}
                    className="flex-1 flex items-center justify-center space-x-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white py-1.5 text-xs font-bold transition-colors shadow-sm"
                  >
                    <Ban className="h-3.5 w-3.5" />
                    <span>Cancel</span>
                  </button>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <form onSubmit={handleSend} className="border-t p-3 bg-card flex items-center space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={!!pendingAction || loading}
              placeholder={pendingAction ? "Please confirm or cancel action..." : "Ask Copilot..."}
              className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-muted-foreground disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading || !!pendingAction}
              className="rounded-lg bg-primary p-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg transition-transform hover:scale-105 active:scale-95 duration-200",
          isOpen
            ? "bg-muted-foreground"
            : "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700"
        )}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
      </button>
    </div>
  )
}
