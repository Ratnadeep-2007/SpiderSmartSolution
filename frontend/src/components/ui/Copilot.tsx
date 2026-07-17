import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Sparkles, 
  X, 
  Send, 
  Bot, 
  ArrowUpRight, 
  Loader2, 
  Check, 
  Ban, 
  ShieldAlert, 
  FileText, 
  History, 
  Copy, 
  CheckCheck 
} from 'lucide-react'
import api from '@/lib/api'
import { cn } from '@/lib/utils'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  records?: any[]
  auditLogs?: any[]
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
  const [copiedBarcode, setCopiedBarcode] = useState<string | null>(null)
  
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

    // Strip rich objects from history payload to comply with backend schemas
    const historyPayload = messages.slice(-10).map(m => ({
      role: m.role,
      content: m.content
    }))

    try {
      const response = await api.post('/copilot/chat', {
        message: userMessage,
        history: historyPayload,
      })

      const reply = response.data.response
      const suggestedActions = response.data.actions_suggested || []
      const pending = response.data.pending_action
      const recs = response.data.records || []
      const logs = response.data.audit_logs || []

      setMessages((prev) => [
        ...prev, 
        { 
          role: 'assistant', 
          content: reply,
          records: recs,
          auditLogs: logs
        }
      ])
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

  const handleQuickAction = (action: string, barcode: string) => {
    setPendingAction({
      action,
      barcode,
      reason: `Quick execution from Copilot interface`
    })
  }

  const handleCopyBarcode = (barcode: string) => {
    navigator.clipboard.writeText(barcode)
    setCopiedBarcode(barcode)
    setTimeout(() => setCopiedBarcode(null), 2000)
  }

  // Inline markdown formatter for premium text representation
  const parseMarkdown = (text: string) => {
    if (!text) return null
    
    const lines = text.split('\n')
    let inList = false
    const elements: React.ReactNode[] = []
    let listItems: React.ReactNode[] = []

    const parseInline = (lineText: string, keyPrefix: string) => {
      const parts = lineText.split(/(\*\*.*?\*\*|`.*?`)/g)
      return parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={`${keyPrefix}-${index}`} className="font-bold text-foreground">{part.slice(2, -2)}</strong>
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <code key={`${keyPrefix}-${index}`} className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-rose-500 border border-muted-foreground/10">
              {part.slice(1, -1)}
            </code>
          )
        }
        return part
      })
    }

    lines.forEach((line, lineIdx) => {
      const trimmed = line.trim()
      const isBullet = trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*')
      
      if (isBullet) {
        if (!inList) {
          inList = true
          listItems = []
        }
        const bulletText = trimmed.replace(/^[•\-*]\s*/, '')
        listItems.push(
          <li key={`li-${lineIdx}`} className="ml-4 list-disc text-xs text-muted-foreground mt-1">
            {parseInline(bulletText, `bullet-${lineIdx}`)}
          </li>
        )
      } else {
        if (inList) {
          elements.push(
            <ul key={`ul-${lineIdx}`} className="my-2 space-y-1">
              {listItems}
            </ul>
          )
          inList = false
          listItems = []
        }
        
        if (trimmed === '') {
          elements.push(<div key={`br-${lineIdx}`} className="h-2" />)
        } else {
          elements.push(
            <p key={`p-${lineIdx}`} className="text-xs leading-relaxed mb-1.5">
              {parseInline(line, `p-${lineIdx}`)}
            </p>
          )
        }
      }
    })

    if (inList) {
      elements.push(
        <ul key="ul-final" className="my-2 space-y-1">
          {listItems}
        </ul>
      )
    }

    return elements
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end font-sans">
      {/* Chat Window */}
      {isOpen && (
        <div className="mb-4 flex h-[580px] w-[400px] flex-col rounded-2xl border bg-card text-card-foreground shadow-2xl animate-in slide-in-from-bottom-5 duration-200 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 p-4 text-white shadow-md">
            <div className="flex items-center space-x-2.5">
              <div className="rounded-xl bg-white/10 p-1.5 backdrop-blur-sm">
                <Bot className="h-5 w-5 text-white animate-pulse" />
              </div>
              <div>
                <h3 className="font-semibold text-sm tracking-wide">SpiderSmart Copilot</h3>
                <p className="text-[10px] opacity-75">Compliance & Inventory Assistant</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-full p-1.5 hover:bg-white/15 transition-colors"
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
                  "flex flex-col rounded-2xl p-3 text-sm transition-all",
                  msg.role === 'user'
                    ? "ml-auto bg-primary text-primary-foreground rounded-tr-none max-w-[80%] shadow-sm"
                    : cn(
                        "bg-card border rounded-tl-none shadow-sm",
                        (msg.records?.length || msg.auditLogs?.length) ? "max-w-[95%] w-full" : "max-w-[80%]"
                      )
                )}
              >
                {/* Chat message content */}
                <div className="whitespace-pre-wrap">
                  {msg.role === 'user' ? msg.content : parseMarkdown(msg.content)}
                </div>

                {/* Structured Records Data Cards */}
                {msg.records && msg.records.length > 0 && (
                  <div className="mt-3.5 space-y-2 border-t pt-3 w-full animate-in fade-in duration-300">
                    <div className="flex items-center space-x-1.5 text-muted-foreground font-semibold text-[10px] uppercase tracking-wider mb-2">
                      <FileText className="h-3 w-3 text-violet-500" />
                      <span>Matching Records ({msg.records.length})</span>
                    </div>
                    <div className="grid grid-cols-1 gap-2.5 max-h-[260px] overflow-y-auto pr-1">
                      {msg.records.map((rec: any, idx: number) => (
                        <div key={idx} className="flex flex-col rounded-xl border bg-muted/20 p-3 shadow-sm hover:border-violet-500/35 transition-all duration-200">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-2">
                              <div className="rounded-lg bg-indigo-500/10 p-1.5 text-indigo-600 dark:text-indigo-400">
                                <FileText className="h-3.5 w-3.5" />
                              </div>
                              <div className="flex flex-col">
                                <div className="flex items-center space-x-1">
                                  <span className="font-mono text-xs font-bold text-foreground">{rec.box_barcode}</span>
                                  <button
                                    onClick={() => handleCopyBarcode(rec.box_barcode)}
                                    className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
                                    title="Copy Box Barcode"
                                  >
                                    {copiedBarcode === rec.box_barcode ? (
                                      <CheckCheck className="h-3 w-3 text-emerald-600" />
                                    ) : (
                                      <Copy className="h-3 w-3" />
                                    )}
                                  </button>
                                </div>
                                <span className="text-[10px] text-muted-foreground font-mono">{rec.file_barcode}</span>
                              </div>
                            </div>
                            <div className="flex flex-col items-end space-y-1">
                              {rec.legal_hold && (
                                <span className="inline-flex items-center space-x-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[9px] font-bold text-rose-500 border border-rose-500/20">
                                  <ShieldAlert className="h-2.5 w-2.5" />
                                  <span>Hold</span>
                                </span>
                              )}
                              {rec.disposition_status === 'DUE' && (
                                <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold text-amber-600 dark:text-amber-500 border border-amber-500/20 animate-pulse">
                                  Due
                                </span>
                              )}
                              {rec.disposition_status === 'DISPOSED' && (
                                <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[9px] font-bold text-muted-foreground border">
                                  Disposed
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <p className="mt-2 text-xs text-foreground/80 leading-relaxed font-sans line-clamp-2">
                            {rec.description}
                          </p>

                          <div className="mt-3 flex items-center justify-between border-t pt-2 text-[10px] text-muted-foreground">
                            <span>{rec.department} &bull; {rec.location}</span>
                            <div className="flex space-x-1.5">
                              <button
                                onClick={() => handleQuickAction(rec.legal_hold ? 'remove_legal_hold' : 'apply_legal_hold', rec.box_barcode)}
                                className={cn(
                                  "rounded px-2.5 py-1 text-[10px] font-bold transition-all shadow-sm",
                                  rec.legal_hold 
                                    ? "bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 border border-rose-500/20" 
                                    : "bg-violet-600 text-white hover:bg-violet-700"
                                )}
                              >
                                {rec.legal_hold ? 'Release Hold' : 'Place Hold'}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Structured Audit Logs Cards */}
                {msg.auditLogs && msg.auditLogs.length > 0 && (
                  <div className="mt-3.5 space-y-2 border-t pt-3 w-full animate-in fade-in duration-300">
                    <div className="flex items-center space-x-1.5 text-muted-foreground font-semibold text-[10px] uppercase tracking-wider mb-2">
                      <History className="h-3 w-3 text-indigo-500" />
                      <span>Audit Logs Integrity Chain</span>
                    </div>
                    <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
                      {msg.auditLogs.map((log: any, idx: number) => (
                        <div key={idx} className="rounded-xl border bg-muted/20 p-3 shadow-sm text-xs space-y-2 hover:border-indigo-500/35 transition-all">
                          <div className="flex items-center justify-between">
                            <span className={cn(
                              "font-bold uppercase text-[9px] px-2 py-0.5 rounded-full border",
                              log.action.includes('HOLD') ? "bg-amber-500/10 text-amber-600 dark:text-amber-500 border-amber-500/20" :
                              log.action === 'CREATE' ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 border-emerald-500/20" :
                              "bg-blue-500/10 text-blue-600 dark:text-blue-500 border-blue-500/20"
                            )}>
                              {log.action}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {new Date(log.performed_at).toLocaleDateString()}
                            </span>
                          </div>
                          
                          {log.changes && Object.keys(log.changes).length > 0 && (
                            <div className="text-[9px] bg-card/60 p-2 rounded border font-mono text-muted-foreground overflow-x-auto whitespace-pre">
                              {JSON.stringify(log.changes, null, 2)}
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between text-[9px] text-muted-foreground border-t pt-2">
                            <span>Actor: {log.performed_by.slice(0, 8)}...</span>
                            <span className="text-emerald-600 dark:text-emerald-500 flex items-center font-semibold text-[9px] bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                              <Check className="h-2.5 w-2.5 mr-0.5" />
                              SHA-256 Verified
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {loading && (
              <div className="flex items-center space-x-2 bg-card border rounded-2xl rounded-tl-none p-3 max-w-[80%] shadow-sm animate-pulse">
                <Loader2 className="h-4 w-4 animate-spin text-violet-600" />
                <span className="text-xs text-muted-foreground">Thinking...</span>
              </div>
            )}
            
            {/* Dynamic Action Chips */}
            {!loading && actions.length > 0 && !pendingAction && (
              <div className="flex flex-wrap gap-2 pt-2 animate-in fade-in duration-300">
                {actions.map((act, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleActionClick(act.route)}
                    className="flex items-center space-x-1 rounded-full border bg-background px-3 py-1.5 text-xs font-semibold hover:border-primary hover:text-primary hover:shadow-md transition-all shadow-sm"
                  >
                    <span>{act.label}</span>
                    <ArrowUpRight className="h-3 w-3" />
                  </button>
                ))}
              </div>
            )}

            {/* Pending Confirmation Controls */}
            {pendingAction && !loading && (
              <div className="flex flex-col space-y-2 border border-amber-500/40 bg-amber-500/5 rounded-xl p-3 shadow-sm animate-in slide-in-from-bottom-2 duration-300">
                <p className="text-xs font-bold text-amber-600 dark:text-amber-500 uppercase tracking-wider flex items-center">
                  ⚠️ Action Confirmation Required
                </p>
                <div className="text-[11px] text-muted-foreground space-y-1 bg-card/40 p-2 rounded-lg border border-amber-500/15 font-mono">
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
          <form onSubmit={handleSend} className="border-t p-3 bg-card flex items-center space-x-2 shadow-inner">
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
              className="rounded-lg bg-primary p-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-md hover:shadow-lg active:scale-95 duration-100"
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
          "flex h-14 w-14 items-center justify-center rounded-full text-white shadow-xl transition-all hover:scale-105 active:scale-95 duration-200 hover:shadow-2xl",
          isOpen
            ? "bg-muted-foreground"
            : "bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 hover:brightness-110"
        )}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
      </button>
    </div>
  )
}
