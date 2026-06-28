import { useState, useEffect } from 'react'
import {
  Scale,
  Plus,
  Search,
  Shield,
  Download,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import api from '@/lib/api'
import { toast } from 'sonner'
import { useLanguageStore } from '@/store/languageStore'

interface Case {
  id: string
  title: string
  description: string
  query_keywords: string[]
  created_by: string
  created_at: string
  status: string
  matched_record_ids: string[]
  hold_applied: boolean
}

const statusColors: Record<string, string> = {
  OPEN: 'bg-blue-100 text-blue-700',
  HOLD_APPLIED: 'bg-amber-100 text-amber-700',
  CLOSED: 'bg-slate-100 text-slate-600',
}

export default function EDiscovery() {
  const { translate } = useLanguageStore()
  const [cases, setCases] = useState<Case[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [activeCase, setActiveCase] = useState<Case | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const [form, setForm] = useState({
    title: '',
    description: '',
    keywords: ''
  })

  const fetchCases = async () => {
    try {
      const res = await api.get('/ediscovery/cases')
      setCases(res.data)
    } catch {
      // cases endpoint may return empty array if no cases yet
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchCases() }, [])

  const handleCreate = async () => {
    if (!form.title.trim() || !form.keywords.trim()) {
      toast.error('Title and keywords are required')
      return
    }
    setIsCreating(true)
    try {
      const res = await api.post('/ediscovery/cases', {
        title: form.title,
        description: form.description,
        query_keywords: form.keywords.split(',').map(k => k.trim()).filter(Boolean)
      })
      setCases(prev => [res.data, ...prev])
      setShowForm(false)
      setForm({ title: '', description: '', keywords: '' })
      toast.success('Case created')
    } catch {
      toast.error('Failed to create case')
    } finally {
      setIsCreating(false)
    }
  }

  const handleScanAndHold = async (caseId: string) => {
    setIsScanning(true)
    try {
      const res = await api.post(`/ediscovery/cases/${caseId}/scan-and-hold`)
      toast.success(`${translate('Legal hold applied to')} ${res.data.matched_count} ${translate('records')}`)
      fetchCases()
      if (activeCase?.id === caseId) {
        const updated = await api.get(`/ediscovery/cases/${caseId}`)
        setActiveCase(updated.data)
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Scan failed')
    } finally {
      setIsScanning(false)
    }
  }

  const handleExportZip = async (caseId: string) => {
    setIsExporting(true)
    try {
      const res = await api.post(`/ediscovery/cases/${caseId}/export-zip`, null, {
        responseType: 'blob'
      })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `ediscovery_case_${caseId.slice(0, 8)}.zip`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success('Forensic archive downloaded')
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Export failed')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Scale className="h-8 w-8 text-primary" />
            {translate('e-Discovery Case Manager')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {translate('Initiate legal holds, scan for matching records, and generate forensic archives.')}
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 shadow-sm transition-all"
        >
          <Plus className="h-4 w-4" />
          {translate('New Case')}
        </button>
      </div>

      {/* Create Case Form */}
      {showForm && (
        <div className="bg-card border rounded-xl shadow-sm p-6 space-y-4 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg">{translate('New e-Discovery Case')}</h2>
            <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase text-muted-foreground">{translate('Case Title *')}</label>
              <input
                type="text"
                placeholder={translate('e.g. Q3 Finance Litigation Hold')}
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase text-muted-foreground">{translate('Case Description')}</label>
              <input
                type="text"
                placeholder={translate('Brief case description...')}
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase text-muted-foreground">
              {translate('Search Keywords *')} <span className="normal-case font-normal text-muted-foreground">{translate('(comma-separated)')}</span>
            </label>
            <input
              type="text"
              placeholder={translate('e.g. invoice, tax filing, financial report, Q3 2023')}
              value={form.keywords}
              onChange={e => setForm({ ...form, keywords: e.target.value })}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
            <p className="text-xs text-muted-foreground">
              {translate('Records matching any of these keywords in description, entity, or department will be flagged.')}
            </p>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleCreate}
              disabled={isCreating}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {translate('Create Case')}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-5 py-2 border rounded-lg text-sm font-medium hover:bg-accent"
            >
              {translate('Cancel')}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cases List */}
        <div className="lg:col-span-1 space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {translate('Cases')} ({cases.length})
          </h3>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : cases.length === 0 ? (
            <div className="text-center py-12 bg-card border rounded-xl">
              <Scale className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">{translate('No cases yet.')}</p>
            </div>
          ) : (
            cases.map(c => (
              <button
                key={c.id}
                onClick={() => setActiveCase(c)}
                className={cn(
                  "w-full text-left bg-card border rounded-xl p-4 hover:shadow-md transition-all space-y-2",
                  activeCase?.id === c.id && "border-primary ring-1 ring-primary/20"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold text-sm line-clamp-1">{c.title}</span>
                  <span className={cn(
                    'shrink-0 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full',
                    statusColors[c.status] || 'bg-gray-100 text-gray-600'
                  )}>
                    {translate(c.status.replace('_', ' '))}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {c.query_keywords.slice(0, 3).map(k => (
                    <span key={k} className="text-[10px] bg-primary/5 text-primary border border-primary/10 px-1.5 py-0.5 rounded">
                      {k}
                    </span>
                  ))}
                  {c.query_keywords.length > 3 && (
                    <span className="text-[10px] text-muted-foreground">+{c.query_keywords.length - 3}</span>
                  )}
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>{translate(String(c.matched_record_ids.length))} {translate('records matched')}</span>
                  <ChevronRight className="h-3 w-3" />
                </div>
              </button>
            ))
          )}
        </div>

        {/* Case Detail Panel */}
        <div className="lg:col-span-2">
          {!activeCase ? (
            <div className="flex flex-col items-center justify-center h-full min-h-64 bg-card border rounded-xl border-dashed text-muted-foreground">
              <Scale className="h-10 w-10 mb-3 opacity-20" />
              <p className="text-sm">{translate('Select a case to view details')}</p>
            </div>
          ) : (
            <div className="bg-card border rounded-xl shadow-sm overflow-hidden animate-in fade-in">
              <div className="px-6 py-4 border-b bg-muted/20 flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-lg">{activeCase.title}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {translate('Case ID:')} {activeCase.id.slice(0, 8)}... · {translate('Created')} {new Date(activeCase.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span className={cn(
                  'text-xs font-bold uppercase px-3 py-1 rounded-full',
                  statusColors[activeCase.status] || 'bg-gray-100 text-gray-600'
                )}>
                  {translate(activeCase.status.replace('_', ' '))}
                </span>
              </div>

              <div className="p-6 space-y-6">
                {activeCase.description && (
                  <p className="text-sm text-muted-foreground">{activeCase.description}</p>
                )}

                {/* Keywords */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">{translate('Search Keywords')}</h4>
                  <div className="flex flex-wrap gap-2">
                    {activeCase.query_keywords.map(k => (
                      <span key={k} className="bg-primary/10 text-primary border border-primary/20 px-3 py-1 rounded-full text-xs font-medium">
                        <Search className="h-3 w-3 inline mr-1" />
                        {k}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-muted/30 rounded-lg p-4 text-center">
                    <div className="text-2xl font-black">{translate(String(activeCase.query_keywords.length))}</div>
                    <div className="text-[10px] uppercase font-bold text-muted-foreground mt-1">{translate('Keywords')}</div>
                  </div>
                  <div className={cn(
                    "rounded-lg p-4 text-center",
                    activeCase.matched_record_ids.length > 0 ? "bg-amber-50 text-amber-700" : "bg-muted/30"
                  )}>
                    <div className="text-2xl font-black">{translate(String(activeCase.matched_record_ids.length))}</div>
                    <div className="text-[10px] uppercase font-bold mt-1 opacity-70">{translate('Records Held')}</div>
                  </div>
                  <div className={cn(
                    "rounded-lg p-4 text-center",
                    activeCase.hold_applied ? "bg-emerald-50 text-emerald-700" : "bg-muted/30"
                  )}>
                    {activeCase.hold_applied
                      ? <CheckCircle2 className="h-6 w-6 mx-auto" />
                      : <AlertCircle className="h-6 w-6 mx-auto text-muted-foreground/40" />
                    }
                    <div className="text-[10px] uppercase font-bold mt-1 opacity-70">
                      {activeCase.hold_applied ? translate('Hold Active') : translate('No Hold')}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    onClick={() => handleScanAndHold(activeCase.id)}
                    disabled={isScanning || activeCase.hold_applied}
                    className="flex-1 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white py-2.5 rounded-lg text-sm font-bold disabled:opacity-50 transition-colors"
                  >
                    {isScanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                    {activeCase.hold_applied ? translate('Hold Already Applied') : translate('Scan & Apply Legal Hold')}
                  </button>

                  <button
                    onClick={() => handleExportZip(activeCase.id)}
                    disabled={isExporting || !activeCase.hold_applied}
                    className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-bold disabled:opacity-50 hover:bg-primary/90 transition-colors"
                  >
                    {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    {translate('Export Forensic ZIP')}
                  </button>
                </div>

                {!activeCase.hold_applied && (
                  <p className="text-xs text-muted-foreground text-center">
                    {translate('Run "Scan & Apply Legal Hold" first to lock matching records, then export the forensic archive.')}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
