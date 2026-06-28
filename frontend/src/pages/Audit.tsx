import { useState, useEffect, useCallback } from 'react'
import { 
  ShieldCheck, 
  ShieldAlert, 
  Eye, 
  Loader2,
  Calendar,
  User,
  Activity,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Download,
  X
} from 'lucide-react'
import api from '@/lib/api'
import { useLanguageStore } from '@/store/languageStore'

interface AuditLog {
  id: string
  record_id?: string
  action: string
  performed_by: string
  user_email?: string
  app_user_id?: string
  performed_at: string
  ip_address?: string
  changes?: Record<string, unknown>
  tamper_hash: string
}

interface VerificationResult {
  is_valid: boolean
  total_checked: number
  invalid_log_ids: string[]
}

export default function Audit() {
  const { translate } = useLanguageStore()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null)
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)

  // Filters
  const [actionFilter, setActionFilter] = useState('')
  const [userFilter, setUserFilter] = useState('')

  const handleExport = async () => {
    try {
      const response = await api.get('/audit/export', { 
        responseType: 'blob'
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `audit_logs_${new Date().getTime()}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (_err) {
      alert(translate('Failed to export audit logs') || 'Failed to export audit logs')
    }
  }

  const fetchLogs = useCallback(async () => {
    try {
      const res = await api.get('/audit/', {
        params: {
          page,
          size: 20,
          action: actionFilter || undefined,
          user_id: userFilter || undefined
        }
      })
      setLogs(res.data.data)
      setTotal(res.data.total)
    } catch (err) {
      console.error('Failed to fetch audit logs:', err)
    } finally {
      setIsLoading(false)
    }
  }, [page, actionFilter, userFilter])

  useEffect(() => {
    const init = async () => {
      setIsLoading(true)
      await fetchLogs()
    }
    init()
  }, [fetchLogs])

  const handleVerify = async () => {
    setIsVerifying(true)
    setVerificationResult(null)
    try {
      const res = await api.get('/audit/verify')
      setVerificationResult(res.data)
    } catch (err) {
      alert(translate('Verification failed') || 'Verification failed')
    } finally {
      setIsVerifying(false)
    }
  }

  const formatLogDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      })
    } catch (e) {
      return dateStr
    }
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{translate('Compliance Audit Trail')}</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {translate('Immutable log of all system actions with cryptographic tamper-evidence.')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExport}
            className="flex items-center justify-center rounded-md border bg-background px-4 py-2 text-sm font-medium hover:bg-muted transition-all shadow-sm"
          >
            <Download className="mr-2 h-4 w-4" />
            {translate('Export CSV')}
          </button>
          <button 
            onClick={handleVerify}
            disabled={isVerifying}
            className={`flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-all shadow-sm ${
              isVerifying ? 'bg-muted text-muted-foreground' : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
          >
            {isVerifying ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="mr-2 h-4 w-4" />
            )}
            {translate('Verify Log Integrity')}
          </button>
        </div>
      </div>

      {/* Verification Status Banner */}
      {verificationResult && (
        <div className={`p-4 rounded-xl border flex items-center gap-4 animate-in fade-in slide-in-from-top-2 ${
          verificationResult.is_valid 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {verificationResult.is_valid ? (
            <ShieldCheck className="h-6 w-6 text-emerald-600" />
          ) : (
            <ShieldAlert className="h-6 w-6 text-rose-600" />
          )}
          <div>
            <h3 className="font-bold">
              {verificationResult.is_valid ? translate('Integrity Verified') : translate('TAMPERING DETECTED')}
            </h3>
            <p className="text-sm opacity-90">
              {verificationResult.is_valid 
                ? `${translate('All')} ${translate(String(verificationResult.total_checked))} ${translate('logs have been mathematically verified against their cryptographic hashes.')}`
                : `${translate('Found')} ${translate(String(verificationResult.invalid_log_ids.length))} ${translate('invalid entries out of')} ${translate(String(verificationResult.total_checked))} ${translate('logs checked. Immediate investigation required.')}`}
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <Activity className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <select 
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full rounded-md border bg-background py-2 pl-10 pr-4 text-sm focus:ring-1 focus:ring-primary outline-none appearance-none"
          >
            <option value="">{translate('All Actions')}</option>
            <option value="CREATE">{translate('CREATE')}</option>
            <option value="UPDATE">{translate('UPDATE')}</option>
            <option value="DELETE">{translate('DELETE')}</option>
            <option value="LOGIN">{translate('LOGIN')}</option>
          </select>
        </div>
        <div className="relative">
          <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input 
            type="text"
            placeholder={translate('Filter by User ID...')}
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            className="w-full rounded-md border bg-background py-2 pl-10 pr-4 text-sm focus:ring-1 focus:ring-primary outline-none"
          />
        </div>
      </div>

      {/* Audit Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center p-24">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-muted/50 border-b text-muted-foreground font-semibold">
                  <tr>
                    <th className="px-6 py-4">{translate('Timestamp')}</th>
                    <th className="px-6 py-4">{translate('Action')}</th>
                    <th className="px-6 py-4">{translate('User')}</th>
                    <th className="px-6 py-4">{translate('Resource ID')}</th>
                    <th className="px-6 py-4 text-right">{translate('Details')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {logs.map((log) => {
                    const isInvalid = verificationResult?.invalid_log_ids.includes(log.id)
                    return (
                      <tr key={log.id} className={`hover:bg-muted/30 transition-colors ${isInvalid ? 'bg-rose-50/50' : ''}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                            {formatLogDate(log.performed_at)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            log.action === 'CREATE' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                            log.action === 'UPDATE' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                            log.action === 'DELETE' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                            'bg-slate-50 text-slate-700 border-slate-100'
                          }`}>
                            {log.action}
                          </span>
                          {isInvalid && (
                            <span className="ml-2 text-rose-600 inline-flex items-center" title="Tampered Row">
                              <AlertTriangle className="h-3.5 w-3.5" />
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium">{log.app_user_id || translate('System')}</div>
                          <div className="text-[10px] text-muted-foreground">{log.user_email}</div>
                          <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{log.ip_address}</div>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-muted-foreground">
                          {log.record_id || translate('N/A')}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => setSelectedLog(log)}
                            className="p-2 hover:bg-muted rounded-md transition-colors inline-flex items-center gap-1.5 text-primary font-medium"
                          >
                            <Eye className="h-4 w-4" />
                            <span className="text-xs">{translate('Inspect')}</span>
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 bg-muted/20 border-t flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                {translate('Total Logs:')} {translate(String(total))}
              </div>
              <div className="flex items-center gap-2">
                <button 
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  className="p-1.5 rounded border bg-background hover:bg-muted disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-xs font-medium px-2">{translate('Page')} {translate(String(page))}</span>
                <button 
                  disabled={page * 20 >= total}
                  onClick={() => setPage(p => p + 1)}
                  className="p-1.5 rounded border bg-background hover:bg-muted disabled:opacity-50"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* JSON Inspector Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-2xl rounded-xl border shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="px-6 py-4 border-b bg-muted/20 flex items-center justify-between">
              <h2 className="font-bold flex items-center gap-2">
                <Eye className="h-4 w-4" />
                {translate('Payload Inspection')}
              </h2>
              <button onClick={() => setSelectedLog(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-muted-foreground block mb-1 uppercase font-bold tracking-widest text-[9px]">{translate('Log ID')}</span>
                    <span className="font-mono">{selectedLog.id}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-1 uppercase font-bold tracking-widest text-[9px]">{translate('Tamper Hash')}</span>
                    <span className="font-mono break-all">{selectedLog.tamper_hash}</span>
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-2 uppercase font-bold tracking-widest text-[9px]">{translate('Data Changes (JSON)')}</span>
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-[11px] font-mono leading-relaxed">
                    {JSON.stringify(selectedLog.changes, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t bg-muted/20 text-right">
              <button 
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md"
              >
                {translate('Close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
