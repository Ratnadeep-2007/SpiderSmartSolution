import { useState, useEffect } from 'react'
import { 
  History, 
  RotateCcw, 
  ChevronDown, 
  ChevronUp, 
  Eye, 
  Clock,
  User,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import api from '@/lib/api'

interface Version {
  id: string
  version: number
  data_snapshot: any
  created_by: string
  created_at: string
}

interface VersionHistoryProps {
  recordId: string
  currentVersion: number
  onRevert: () => void
}

export default function VersionHistory({ recordId, currentVersion, onRevert }: VersionHistoryProps) {
  const [versions, setVersions] = useState<Version[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedVersion, setExpandedVersion] = useState<number | null>(null)
  const [isReverting, setIsReverting] = useState(false)

  useEffect(() => {
    const fetchVersions = async () => {
      try {
        const res = await api.get(`/records/${recordId}/versions`)
        setVersions(res.data)
      } catch (err) {
        console.error('Failed to fetch versions:', err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchVersions()
  }, [recordId])

  const handleRevert = async (version: number) => {
    if (!confirm(`Are you sure you want to revert to Version ${version}? This will create a new version.`)) return
    
    setIsReverting(true)
    try {
      await api.post(`/records/${recordId}/versions/${version}/revert`)
      onRevert()
    } catch (err) {
      alert('Failed to revert version. You may need Administrator privileges.')
    } finally {
      setIsReverting(false)
    }
  }

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading history...</div>

  return (
    <div className="space-y-4">
      {versions.map((v, index) => {
        const isCurrent = v.version === currentVersion
        const prevVersion = versions[index + 1]
        const isExpanded = expandedVersion === v.version

        return (
          <div key={v.id} className={cn(
            "group border rounded-xl overflow-hidden transition-all",
            isCurrent ? "border-primary/30 bg-primary/5 shadow-sm" : "bg-card hover:border-muted-foreground/30"
          )}>
            <div 
              className="p-4 flex items-center justify-between cursor-pointer"
              onClick={() => setExpandedVersion(isExpanded ? null : v.version)}
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  "h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm",
                  isCurrent ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}>
                  v{v.version}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">
                      {isCurrent ? "Current Version" : `Version ${v.version}`}
                    </span>
                    {isCurrent && (
                      <span className="bg-primary/20 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 font-mono">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(v.created_at).toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] bg-muted px-1.5 py-0.5 rounded uppercase">
                      ID: {v.id.split('-')[0]}...
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!isCurrent && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRevert(v.version)
                    }}
                    disabled={isReverting}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Restore
                  </button>
                )}
                <div className="p-2 text-muted-foreground">
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </div>
            </div>

            {isExpanded && (
              <div className="px-4 pb-4 border-t pt-4 bg-muted/20 animate-in fade-in slide-in-from-top-1 duration-200">
                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Snapshot Data</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(v.data_snapshot).map(([key, val]: [string, any]) => {
                    const isDiff = prevVersion && JSON.stringify(val) !== JSON.stringify(prevVersion.data_snapshot[key])
                    
                    if (['id', 'created_at', 'updated_at', 'version', 'search_vector'].includes(key)) return null

                    return (
                      <div key={key} className={cn(
                        "p-2 rounded border text-xs",
                        isDiff ? "bg-amber-50/50 border-amber-100" : "bg-background/50 border-muted"
                      )}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">{key.replace(/_/g, ' ')}</span>
                          {isDiff && <span className="text-[9px] font-bold text-amber-600 bg-amber-100 px-1 rounded">CHANGED</span>}
                        </div>
                        <div className="font-medium truncate" title={String(val)}>
                          {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                        </div>
                        {isDiff && (
                          <div className="mt-1 pt-1 border-t border-amber-100 text-[10px] text-muted-foreground line-through opacity-50">
                            {typeof prevVersion.data_snapshot[key] === 'object' 
                              ? JSON.stringify(prevVersion.data_snapshot[key]) 
                              : String(prevVersion.data_snapshot[key])}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
