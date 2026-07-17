import { useState, useEffect, useRef } from 'react'
import {
  BookOpen,
  Search,
  Send,
  Loader2,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Clock,
  Globe,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  X,
  History,
  Database,
  ExternalLink,
  Info,
  RefreshCw
} from 'lucide-react'
import { cn } from '@/lib/utils'
import api from '@/lib/api'
import { toast } from 'sonner'
import { useLanguageStore } from '@/store/languageStore'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Policy {
  id: string
  title: string
  source: string | null
  jurisdiction: string | null
  category: string | null
  applicable_record_types: string[]
  retention_years: number | null
  effective_date: string | null
  summary: string | null
  content: string
  has_embedding: boolean
  is_active: boolean
  created_at: string
}

interface Citation {
  id: string
  title: string
  source: string | null
  jurisdiction: string | null
  category: string | null
  retention_years: number | null
  summary: string | null
  excerpt: string
}

interface QueryResult {
  id: string
  query_text: string
  narrative: string
  suggested_retention_years: number | null
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  key_takeaways: string[]
  citations: Citation[]
  policies_searched: number
  created_at: string | null
}

interface HistoryItem {
  id: string
  query_text: string
  ai_response: string
  suggested_retention_years: number | null
  created_at: string
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const JURISDICTIONS = ['All', 'UAE', 'DIFC (UAE)', 'ADGM (UAE)', 'Saudi Arabia', 'GCC', 'International']
const CATEGORIES = ['All', 'Financial', 'Tax', 'Data Protection', 'Human Resources', 'Compliance & AML', 'Records Management']

const confidenceConfig = {
  HIGH:   { color: 'text-emerald-600 bg-emerald-50 border-emerald-200', icon: CheckCircle2 },
  MEDIUM: { color: 'text-amber-600 bg-amber-50 border-amber-200',       icon: AlertTriangle },
  LOW:    { color: 'text-slate-500 bg-slate-50 border-slate-200',       icon: Info },
}

const jurisdictionColors: Record<string, string> = {
  'UAE':           'bg-emerald-100 text-emerald-700',
  'DIFC (UAE)':    'bg-teal-100 text-teal-700',
  'ADGM (UAE)':    'bg-cyan-100 text-cyan-700',
  'Saudi Arabia':  'bg-green-100 text-green-700',
  'GCC':           'bg-blue-100 text-blue-700',
  'International': 'bg-purple-100 text-purple-700',
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function CitationCard({ citation, index }: { citation: Citation; index: number }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="border rounded-xl overflow-hidden bg-card hover:shadow-sm transition-shadow">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-4 py-3 flex items-center gap-3"
      >
        <span className="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
          {index}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm line-clamp-1">{citation.title}</p>
          <p className="text-xs text-muted-foreground truncate">
            {citation.source || 'Internal Policy'} · {citation.jurisdiction || 'N/A'}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {citation.retention_years && (
            <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
              {citation.retention_years}y
            </span>
          )}
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t bg-muted/20 space-y-2 animate-in fade-in slide-in-from-top-1">
          {citation.summary && (
            <p className="text-xs text-muted-foreground italic">{citation.summary}</p>
          )}
          <p className="text-xs leading-relaxed">{citation.excerpt}</p>
        </div>
      )}
    </div>
  )
}

function AnswerPanel({ result }: { result: QueryResult }) {
  const conf = confidenceConfig[result.confidence] || confidenceConfig.LOW
  const ConfIcon = conf.icon

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4">
      {/* Header row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className={cn('flex items-center gap-1.5 border text-xs font-semibold px-3 py-1 rounded-full', conf.color)}>
          <ConfIcon className="h-3.5 w-3.5" />
          {result.confidence} Confidence
        </div>
        {result.suggested_retention_years !== null && (
          <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 text-primary text-xs font-bold px-3 py-1 rounded-full">
            <Clock className="h-3.5 w-3.5" />
            Suggested Retention: {result.suggested_retention_years} Years
          </div>
        )}
        <span className="text-xs text-muted-foreground ml-auto">
          {result.policies_searched} policies searched
        </span>
      </div>

      {/* Narrative */}
      <div className="bg-muted/30 rounded-xl p-5 border">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5" /> AI Analysis
        </h4>
        <div className="text-sm leading-relaxed whitespace-pre-wrap">{result.narrative}</div>
      </div>

      {/* Key takeaways */}
      {result.key_takeaways && result.key_takeaways.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5" /> Key Takeaways
          </h4>
          <ul className="space-y-1.5">
            {result.key_takeaways.map((t, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="mt-1 shrink-0 h-1.5 w-1.5 rounded-full bg-primary" />
                {t}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Citations */}
      {result.citations.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <FileText className="h-3.5 w-3.5" /> Legal Citations ({result.citations.length})
          </h4>
          <div className="space-y-2">
            {result.citations.map((c, i) => (
              <CitationCard key={c.id} citation={c} index={i + 1} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

type Tab = 'advisor' | 'policies' | 'history'

export default function ComplianceAdvisor() {
  const { translate } = useLanguageStore()
  const [activeTab, setActiveTab] = useState<Tab>('advisor')

  // Advisor state
  const [queryText, setQueryText] = useState('')
  const [recordTypeHint, setRecordTypeHint] = useState('')
  const [isQuerying, setIsQuerying] = useState(false)
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Policies state
  const [policies, setPolicies] = useState<Policy[]>([])
  const [loadingPolicies, setLoadingPolicies] = useState(false)
  const [filterJurisdiction, setFilterJurisdiction] = useState('All')
  const [filterCategory, setFilterCategory] = useState('All')
  const [searchPolicies, setSearchPolicies] = useState('')
  const [showAddPolicy, setShowAddPolicy] = useState(false)
  const [isSeeding, setIsSeeding] = useState(false)

  // Add policy form
  const [newPolicy, setNewPolicy] = useState({
    title: '', content: '', source: '', jurisdiction: '', category: '', retention_years: '', summary: ''
  })
  const [isSavingPolicy, setIsSavingPolicy] = useState(false)

  // History state
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  // ─── Fetch ───────────────────────────────────────────────────────────────────

  const fetchPolicies = async () => {
    setLoadingPolicies(true)
    try {
      const res = await api.get('/compliance/policies')
      setPolicies(res.data)
    } catch {
      toast.error('Failed to load policies')
    } finally {
      setLoadingPolicies(false)
    }
  }

  const fetchHistory = async () => {
    setLoadingHistory(true)
    try {
      const res = await api.get('/compliance/history')
      setHistory(res.data)
    } catch {
      // silently fail
    } finally {
      setLoadingHistory(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'policies') fetchPolicies()
    if (activeTab === 'history') fetchHistory()
  }, [activeTab])

  // ─── Actions ─────────────────────────────────────────────────────────────────

  const handleQuery = async () => {
    if (!queryText.trim()) return
    setIsQuerying(true)
    setQueryResult(null)
    try {
      const res = await api.post('/compliance/query', {
        query: queryText,
        record_type_hint: recordTypeHint.trim() || undefined,
        top_k: 5,
      })
      setQueryResult(res.data)
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Query failed. Please try again.')
    } finally {
      setIsQuerying(false)
    }
  }

  const handleSeed = async () => {
    setIsSeeding(true)
    try {
      const res = await api.post('/compliance/policies/seed')
      toast.success(res.data.message || 'Policies seeded!')
      fetchPolicies()
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Seeding failed')
    } finally {
      setIsSeeding(false)
    }
  }

  const handleDeletePolicy = async (id: string) => {
    try {
      await api.delete(`/compliance/policies/${id}`)
      toast.success('Policy removed')
      setPolicies(prev => prev.filter(p => p.id !== id))
    } catch {
      toast.error('Failed to delete policy')
    }
  }

  const handleAddPolicy = async () => {
    if (!newPolicy.title.trim() || !newPolicy.content.trim()) {
      toast.error('Title and content are required')
      return
    }
    setIsSavingPolicy(true)
    try {
      const body: any = {
        title: newPolicy.title,
        content: newPolicy.content,
        source: newPolicy.source || undefined,
        jurisdiction: newPolicy.jurisdiction || undefined,
        category: newPolicy.category || undefined,
        summary: newPolicy.summary || undefined,
        retention_years: newPolicy.retention_years ? parseInt(newPolicy.retention_years) : undefined,
      }
      const res = await api.post('/compliance/policies', body)
      setPolicies(prev => [res.data, ...prev])
      setNewPolicy({ title: '', content: '', source: '', jurisdiction: '', category: '', retention_years: '', summary: '' })
      setShowAddPolicy(false)
      toast.success('Policy added to knowledge base')
    } catch {
      toast.error('Failed to add policy')
    } finally {
      setIsSavingPolicy(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleQuery()
    }
  }

  // ─── Filtered policies ────────────────────────────────────────────────────────
  const filteredPolicies = policies.filter(p => {
    const matchJurisdiction = filterJurisdiction === 'All' || p.jurisdiction === filterJurisdiction
    const matchCategory = filterCategory === 'All' || p.category === filterCategory
    const search = searchPolicies.toLowerCase()
    const matchSearch = !search || p.title.toLowerCase().includes(search) || (p.source || '').toLowerCase().includes(search)
    return matchJurisdiction && matchCategory && matchSearch
  })

  // ─── Example prompts ──────────────────────────────────────────────────────────
  const EXAMPLES = [
    'How long should I keep financial invoices in the UAE?',
    'What are the HR record retention requirements for employee files?',
    'Does DIFC data protection law apply to customer records?',
    'How long must we retain KYC documents under UAE AML law?',
    'What is the GCC standard for general corporate records?',
  ]

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col">
      {/* Page Header */}
      <div className="px-8 pt-8 pb-0 border-b bg-card">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <BookOpen className="h-7 w-7 text-primary" />
              </div>
              {translate('Compliance Advisor')}
            </h1>
            <p className="text-muted-foreground mt-1 ml-14">
              {translate('AI-powered regulatory guidance — ask questions and receive cited legal answers.')}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1">
          {([['advisor', 'Ask Advisor', Sparkles], ['policies', 'Knowledge Base', Database], ['history', 'Query History', History]] as const).map(([key, label, Icon]) => (
            <button
              key={key}
              id={`compliance-tab-${key}`}
              onClick={() => setActiveTab(key as Tab)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
                activeTab === key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {translate(label)}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">

        {/* ── Advisor Tab ── */}
        {activeTab === 'advisor' && (
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-0 h-full">
            {/* Left: Query Panel */}
            <div className="xl:col-span-2 border-r p-6 space-y-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  {translate('Your Compliance Question')}
                </label>
                <textarea
                  ref={textareaRef}
                  id="compliance-query-input"
                  rows={5}
                  value={queryText}
                  onChange={e => setQueryText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={translate('e.g. How long must we retain financial invoices under UAE VAT law?')}
                  className="w-full rounded-xl border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                />
                <p className="text-xs text-muted-foreground mt-1">Tip: Press Ctrl+Enter to submit</p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  {translate('Record Type Context')} <span className="font-normal normal-case">(optional)</span>
                </label>
                <input
                  type="text"
                  id="compliance-record-type-hint"
                  value={recordTypeHint}
                  onChange={e => setRecordTypeHint(e.target.value)}
                  placeholder={translate('e.g. Financial Records, HR Files, KYC Documents...')}
                  className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <button
                id="compliance-submit-btn"
                onClick={handleQuery}
                disabled={isQuerying || !queryText.trim()}
                className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 rounded-xl text-sm font-bold hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm"
              >
                {isQuerying
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> {translate('Analysing...')}</>
                  : <><Send className="h-4 w-4" /> {translate('Get Legal Guidance')}</>
                }
              </button>

              {/* Example prompts */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{translate('Example Questions')}</p>
                <div className="space-y-1.5">
                  {EXAMPLES.map((ex, i) => (
                    <button
                      key={i}
                      onClick={() => setQueryText(ex)}
                      className="w-full text-left text-xs px-3 py-2 rounded-lg bg-muted/40 hover:bg-primary/5 hover:text-primary transition-colors"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Answer Panel */}
            <div className="xl:col-span-3 p-6 overflow-y-auto">
              {!queryResult && !isQuerying && (
                <div className="flex flex-col items-center justify-center h-full min-h-80 text-center">
                  <div className="p-5 rounded-2xl bg-primary/5 mb-4">
                    <BookOpen className="h-12 w-12 text-primary/40" />
                  </div>
                  <h3 className="font-semibold text-lg mb-1">{translate('Ask the Compliance Advisor')}</h3>
                  <p className="text-muted-foreground text-sm max-w-sm">
                    {translate('Submit a question to receive AI-powered legal guidance with citations from UAE, GCC, and international regulatory frameworks.')}
                  </p>
                  <div className="mt-6 flex flex-wrap gap-2 justify-center max-w-md">
                    {['UAE', 'GCC', 'DIFC', 'ISO 15489', 'GDPR'].map(tag => (
                      <span key={tag} className="text-xs bg-muted/60 px-3 py-1 rounded-full border">
                        <Globe className="h-3 w-3 inline mr-1 opacity-60" />{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {isQuerying && (
                <div className="flex flex-col items-center justify-center h-full min-h-80 gap-4">
                  <div className="relative">
                    <div className="h-16 w-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                    <Sparkles className="h-6 w-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold">{translate('Searching knowledge base...')}</p>
                    <p className="text-xs text-muted-foreground mt-1">{translate('Retrieving policies and generating legal analysis')}</p>
                  </div>
                </div>
              )}

              {queryResult && !isQuerying && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-sm font-medium text-muted-foreground line-clamp-1">
                      <Search className="h-4 w-4 inline mr-1.5 opacity-60" />
                      &ldquo;{queryResult.query_text}&rdquo;
                    </div>
                    <button
                      onClick={() => setQueryResult(null)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <AnswerPanel result={queryResult} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Knowledge Base Tab ── */}
        {activeTab === 'policies' && (
          <div className="p-6 space-y-5">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1 relative min-w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  id="policy-search-input"
                  value={searchPolicies}
                  onChange={e => setSearchPolicies(e.target.value)}
                  placeholder={translate('Search policies...')}
                  className="w-full pl-9 pr-4 py-2 border rounded-lg bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <select
                id="policy-filter-jurisdiction"
                value={filterJurisdiction}
                onChange={e => setFilterJurisdiction(e.target.value)}
                className="border rounded-lg px-3 py-2 bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20"
              >
                {JURISDICTIONS.map(j => <option key={j}>{j}</option>)}
              </select>

              <select
                id="policy-filter-category"
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
                className="border rounded-lg px-3 py-2 bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20"
              >
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>

              <button
                id="policy-refresh-btn"
                onClick={fetchPolicies}
                className="border rounded-lg px-3 py-2 hover:bg-accent transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
              </button>

              <button
                id="seed-policies-btn"
                onClick={handleSeed}
                disabled={isSeeding}
                className="flex items-center gap-2 border rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50"
              >
                {isSeeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
                {translate('Seed UAE/GCC Policies')}
              </button>

              <button
                id="add-policy-btn"
                onClick={() => setShowAddPolicy(true)}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <Plus className="h-4 w-4" />
                {translate('Add Policy')}
              </button>
            </div>

            {/* Add Policy Form */}
            {showAddPolicy && (
              <div className="border rounded-2xl p-6 bg-card shadow-sm space-y-4 animate-in fade-in slide-in-from-top-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{translate('Add New Policy Document')}</h3>
                  <button onClick={() => setShowAddPolicy(false)} className="text-muted-foreground hover:text-foreground">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium uppercase text-muted-foreground">{translate('Title *')}</label>
                    <input type="text" value={newPolicy.title} onChange={e => setNewPolicy({ ...newPolicy, title: e.target.value })}
                      placeholder="e.g. UAE VAT Record Retention" className="w-full mt-1 border rounded-lg px-3 py-2 text-sm bg-background outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <div>
                    <label className="text-xs font-medium uppercase text-muted-foreground">{translate('Source / Law Reference')}</label>
                    <input type="text" value={newPolicy.source} onChange={e => setNewPolicy({ ...newPolicy, source: e.target.value })}
                      placeholder="e.g. Federal Decree-Law No. 8 of 2017" className="w-full mt-1 border rounded-lg px-3 py-2 text-sm bg-background outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <div>
                    <label className="text-xs font-medium uppercase text-muted-foreground">{translate('Jurisdiction')}</label>
                    <select value={newPolicy.jurisdiction} onChange={e => setNewPolicy({ ...newPolicy, jurisdiction: e.target.value })}
                      className="w-full mt-1 border rounded-lg px-3 py-2 text-sm bg-background outline-none focus:ring-2 focus:ring-primary/20">
                      <option value="">Select...</option>
                      {JURISDICTIONS.filter(j => j !== 'All').map(j => <option key={j}>{j}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium uppercase text-muted-foreground">{translate('Category')}</label>
                    <select value={newPolicy.category} onChange={e => setNewPolicy({ ...newPolicy, category: e.target.value })}
                      className="w-full mt-1 border rounded-lg px-3 py-2 text-sm bg-background outline-none focus:ring-2 focus:ring-primary/20">
                      <option value="">Select...</option>
                      {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium uppercase text-muted-foreground">{translate('Retention Years')}</label>
                    <input type="number" min="1" max="50" value={newPolicy.retention_years} onChange={e => setNewPolicy({ ...newPolicy, retention_years: e.target.value })}
                      placeholder="e.g. 5" className="w-full mt-1 border rounded-lg px-3 py-2 text-sm bg-background outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <div>
                    <label className="text-xs font-medium uppercase text-muted-foreground">{translate('One-line Summary')}</label>
                    <input type="text" value={newPolicy.summary} onChange={e => setNewPolicy({ ...newPolicy, summary: e.target.value })}
                      placeholder="Brief description..." className="w-full mt-1 border rounded-lg px-3 py-2 text-sm bg-background outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium uppercase text-muted-foreground">{translate('Full Policy Text *')}</label>
                  <textarea rows={6} value={newPolicy.content} onChange={e => setNewPolicy({ ...newPolicy, content: e.target.value })}
                    placeholder={translate('Paste the full regulatory text here...')}
                    className="w-full mt-1 border rounded-lg px-3 py-2.5 text-sm bg-background outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
                </div>
                <div className="flex gap-3 pt-1">
                  <button onClick={handleAddPolicy} disabled={isSavingPolicy}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-primary/90 disabled:opacity-50">
                    {isSavingPolicy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    {translate('Save Policy')}
                  </button>
                  <button onClick={() => setShowAddPolicy(false)} className="px-5 py-2.5 border rounded-lg text-sm font-medium hover:bg-accent">
                    {translate('Cancel')}
                  </button>
                </div>
              </div>
            )}

            {/* Policy Grid */}
            {loadingPolicies ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredPolicies.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <BookOpen className="h-12 w-12 text-muted-foreground/20 mb-3" />
                <p className="font-semibold text-muted-foreground">{translate('No policies found')}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {policies.length === 0
                    ? translate('Click "Seed UAE/GCC Policies" to populate the knowledge base with built-in regulatory documents.')
                    : translate('No policies match your current filters.')
                  }
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredPolicies.map(policy => (
                  <div key={policy.id} className="bg-card border rounded-2xl p-5 space-y-3 hover:shadow-md transition-shadow group">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-sm line-clamp-2 flex-1">{policy.title}</h3>
                      <button
                        onClick={() => handleDeletePolicy(policy.id)}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {policy.jurisdiction && (
                        <span className={cn('text-[10px] font-bold uppercase px-2 py-0.5 rounded-full', jurisdictionColors[policy.jurisdiction] || 'bg-slate-100 text-slate-600')}>
                          <Globe className="h-2.5 w-2.5 inline mr-0.5" />
                          {policy.jurisdiction}
                        </span>
                      )}
                      {policy.category && (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
                          {policy.category}
                        </span>
                      )}
                      {policy.has_embedding && (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
                          <Sparkles className="h-2.5 w-2.5 inline mr-0.5" />AI
                        </span>
                      )}
                    </div>

                    {policy.summary && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{policy.summary}</p>
                    )}

                    <div className="flex items-center justify-between pt-1 border-t">
                      {policy.retention_years ? (
                        <div className="flex items-center gap-1 text-amber-600">
                          <Clock className="h-3.5 w-3.5" />
                          <span className="text-xs font-bold">{policy.retention_years} years</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Retention: varies</span>
                      )}
                      {policy.source && (
                        <span className="text-[10px] text-muted-foreground truncate max-w-24" title={policy.source}>
                          <ExternalLink className="h-2.5 w-2.5 inline mr-0.5" />{policy.source.split('(')[0].trim()}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Query History Tab ── */}
        {activeTab === 'history' && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                {translate('Recent Queries')} ({history.length})
              </h3>
              <button onClick={fetchHistory} className="text-sm text-primary hover:underline flex items-center gap-1">
                <RefreshCw className="h-3.5 w-3.5" /> {translate('Refresh')}
              </button>
            </div>

            {loadingHistory ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <History className="h-12 w-12 text-muted-foreground/20 mb-3" />
                <p className="text-muted-foreground">{translate('No queries yet. Start asking the advisor!')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map(item => (
                  <div key={item.id} className="bg-card border rounded-xl p-5 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <p className="font-semibold text-sm flex-1">&ldquo;{item.query_text}&rdquo;</p>
                      <div className="flex items-center gap-3 shrink-0">
                        {item.suggested_retention_years && (
                          <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {item.suggested_retention_years}y
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(item.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    {item.ai_response && (
                      <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                        {item.ai_response}
                      </p>
                    )}
                    <button
                      onClick={() => {
                        setQueryText(item.query_text)
                        setActiveTab('advisor')
                      }}
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      {translate('Re-ask this question →')}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
