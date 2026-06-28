import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, 
  Edit, 
  History, 
  Info, 
  Lock, 
  Unlock, 
  Trash2,
  Calendar,
  MapPin,
  Tag as TagIcon,
  Loader2,
  AlertTriangle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import api from '@/lib/api'
import VersionHistory from '@/components/versions/VersionHistory'
import { useLanguageStore } from '@/store/languageStore'

interface Record {
  id: string
  box_barcode: string
  file_barcode: string
  entity: string
  entity_type?: string
  department: string
  location: string
  description: string
  record_date: string
  disposition_status: string
  legal_hold: boolean
  retention_due_date?: string
  version: number
  created_at: string
  updated_at: string
  tags: string[]
  category?: { id: string, name: string }
}

import { toast } from 'sonner'
import RecordForm from '@/components/records/RecordForm'

export default function RecordDetail() {
  const { translate } = useLanguageStore()
  const { id } = useParams()
  const navigate = useNavigate()
  const [record, setRecord] = useState<Record | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details')

  const fetchRecord = useCallback(async () => {
    try {
      const response = await api.get(`/records/${id}`)
      setRecord(response.data)
    } catch (err) {
      console.error('Error fetching record:', err)
      toast.error('Failed to load record details')
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    const init = async () => {
      setIsLoading(true)
      await fetchRecord()
    }
    init()
  }, [fetchRecord])

  const handleLegalHold = async () => {
    if (!record) return
    const reason = window.prompt(`Reason for ${record.legal_hold ? 'releasing' : 'applying'} hold:`)
    if (reason === null) return
    
    setIsProcessing(true)
    try {
      if (record.legal_hold) {
        await api.delete(`/retention/records/${id}/legal-hold`, { data: { reason } })
        toast.success('Legal hold released')
      } else {
        await api.post(`/retention/records/${id}/legal-hold`, { reason })
        toast.success('Legal hold applied')
      }
      fetchRecord()
    } catch (err) {
      toast.error('Failed to update legal hold status')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDispose = async () => {
    if (!record || !confirm('Are you sure you want to permanently dispose of this record? This action is irreversible.')) return
    setIsProcessing(true)
    try {
      await api.post(`/retention/records/${id}/dispose`)
      toast.success('Record disposed successfully')
      fetchRecord()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Disposal failed')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleUpdateRecord = async (data: any) => {
    if (!record) return
    try {
      const { bin_id, location_mode, old_bin_id, ...recordData } = data
      await api.put(`/records/${id}`, recordData, {
        headers: { 'If-Match': record.updated_at }
      })

      // Update spatial bin mapping if changed
      if (bin_id !== old_bin_id) {
        if (old_bin_id) {
          await api.delete(`/warehouse/bins/${old_bin_id}/assign`)
        }
        if (location_mode !== 'custom' && bin_id) {
          await api.post(`/warehouse/bins/${bin_id}/assign`, { record_id: id })
        }
      }

      toast.success('Record updated successfully')
      setIsEditModalOpen(false)
      fetchRecord()
    } catch (err: any) {
      if (err.response?.status === 409) {
        toast.error('CONFLICT: This record was modified by another user. Please refresh.')
      } else {
        toast.error(err.response?.data?.detail || 'Update failed')
      }
    }
  }

  if (isLoading) return (
    <div className="flex h-screen items-center justify-center">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
    </div>
  )

  if (!record) return (
    <div className="p-8 text-center">
      <h2 className="text-2xl font-bold">{translate('Record not found')}</h2>
      <button onClick={() => navigate('/records')} className="mt-4 text-primary hover:underline flex items-center justify-center mx-auto">
        <ArrowLeft className="mr-2 h-4 w-4" /> {translate('Back to Records')}
      </button>
    </div>
  )

  const isDue = record.disposition_status === 'DUE'
  const isDisposed = record.disposition_status === 'DISPOSED'

  return (
    <div className="p-8 space-y-6 max-w-6xl mx-auto">
      <button 
        onClick={() => navigate('/records')}
        className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        {translate('Back to Inventory')}
      </button>

      {/* Compliance Banners */}
      {record.legal_hold && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center gap-4 text-amber-900 shadow-sm animate-in fade-in slide-in-from-top-2">
          <div className="bg-amber-100 p-2 rounded-full">
            <Lock className="h-5 w-5 text-amber-700" />
          </div>
          <div>
            <h3 className="font-bold text-sm uppercase tracking-tight">{translate('Active Legal Hold')}</h3>
            <p className="text-xs opacity-90">{translate('This record is legally protected. Retention disposition and modification are suspended.')}</p>
          </div>
        </div>
      )}

      {isDue && !record.legal_hold && (
        <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl flex items-center gap-4 text-rose-900 shadow-sm animate-in fade-in slide-in-from-top-2">
          <div className="bg-rose-100 p-2 rounded-full">
            <AlertTriangle className="h-5 w-5 text-rose-700" />
          </div>
          <div>
            <h3 className="font-bold text-sm uppercase tracking-tight">{translate('Retention Expired')}</h3>
            <p className="text-xs opacity-90">{translate('This record has reached its mandatory retention limit and is eligible for final disposition.')}</p>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{record.box_barcode}</h1>
            {isDisposed && (
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600 border border-slate-200 uppercase tracking-widest">
                {translate('Disposed')}
              </span>
            )}
          </div>
          <p className="text-muted-foreground mt-1">{translate('File:')} {record.file_barcode} • {translate('Version')} {translate(String(record.version))}</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleLegalHold}
            disabled={isProcessing || isDisposed}
            className={cn(
              "flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium transition-all shadow-sm",
              record.legal_hold ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100" : "bg-background hover:bg-accent",
              isDisposed && "opacity-50 cursor-not-allowed"
            )}
          >
            {record.legal_hold ? <Unlock className="mr-2 h-4 w-4" /> : <Lock className="mr-2 h-4 w-4" />}
            {record.legal_hold ? translate('Release Hold') : translate('Apply Legal Hold')}
          </button>
          {!isDisposed && (
            <button 
              onClick={() => setIsEditModalOpen(true)}
              className="flex items-center justify-center rounded-md border bg-background px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
            >
              <Edit className="mr-2 h-4 w-4" />
              {translate('Edit Record')}
            </button>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <RecordForm 
              title="Edit Inventory Record"
              initialData={record}
              onSubmit={handleUpdateRecord}
              onCancel={() => setIsEditModalOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b">
        <button 
          onClick={() => setActiveTab('details')}
          className={cn(
            "px-6 py-3 text-sm font-medium border-b-2 transition-colors",
            activeTab === 'details' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <div className="flex items-center">
            <Info className="mr-2 h-4 w-4" />
            {translate('General Information')}
          </div>
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={cn(
            "px-6 py-3 text-sm font-medium border-b-2 transition-colors",
            activeTab === 'history' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <div className="flex items-center">
            <History className="mr-2 h-4 w-4" />
            {translate('Version History')}
          </div>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {activeTab === 'details' ? (
            <div className="bg-card rounded-xl border shadow-sm p-6 space-y-6">
              <div>
                <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">{translate('Description')}</h3>
                <p className="text-lg leading-relaxed">{translate(record.description)}</p>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-tighter">{translate('Entity Type')}</p>
                  <p className="font-medium text-sm">{translate(record.entity_type) || translate('N/A')}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-tighter">{translate('Entity')}</p>
                  <p className="font-medium flex items-center text-sm"><MapPin className="mr-2 h-4 w-4 text-muted-foreground" /> {translate(record.entity)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-tighter">{translate('Department')}</p>
                  <p className="font-medium text-sm">{translate(record.department)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-tighter">{translate('Category')}</p>
                  <p className="font-medium text-sm text-primary">{record.category?.name ? translate(record.category.name) : translate('Uncategorized')}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-tighter">{translate('Location')}</p>
                  <p className="font-medium text-sm">{translate(record.location)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-tighter">{translate('Record Date')}</p>
                  <p className="font-medium flex items-center text-sm"><Calendar className="mr-2 h-4 w-4 text-muted-foreground" /> {translate(record.record_date)}</p>
                </div>
              </div>

              <div className="pt-4 border-t">
                <p className="text-xs text-muted-foreground mb-3 uppercase font-bold tracking-tighter">{translate('Classification Tags')}</p>
                <div className="flex flex-wrap gap-2">
                  {record.tags.length > 0 ? record.tags.map(tag => (
                    <span key={tag} className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium border shadow-sm">
                      <TagIcon className="mr-1.5 h-3 w-3" />
                      {translate(tag)}
                    </span>
                  )) : <span className="text-sm italic text-muted-foreground">{translate('No tags applied')}</span>}
                </div>
              </div>
            </div>
          ) : (
            <VersionHistory 
              recordId={record.id} 
              currentVersion={record.version} 
              onRevert={() => {
                setActiveTab('details')
                fetchRecord()
              }} 
            />
          )}
        </div>

        {/* Right Column: Status & Timeline */}
        <div className="space-y-6">
          <div className="bg-card rounded-xl border shadow-sm p-6">
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">{translate('Compliance Status')}</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">{translate('Lifecycle State')}</span>
                <span className={cn(
                  "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                  record.disposition_status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' :
                  record.disposition_status === 'DUE' ? 'bg-amber-100 text-amber-700' :
                  'bg-slate-100 text-slate-700'
                )}>
                  {translate(record.disposition_status)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">{translate('Record Age')}</span>
                <span className="text-sm font-mono">{translate((new Date().getFullYear() - new Date(record.record_date).getFullYear()).toString())} {translate('years')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">{translate('Retention Due')}</span>
                <span className="text-xs font-mono">{translate(record.retention_due_date) || translate('N/A')}</span>
              </div>
              
              {!isDisposed && (
                <div className="pt-4 border-t">
                  <button 
                    onClick={handleDispose}
                    disabled={isProcessing || record.legal_hold || !isDue}
                    className={cn(
                      "w-full flex items-center justify-center rounded-md px-4 py-2 text-sm font-bold transition-all shadow-sm",
                      isDue && !record.legal_hold 
                        ? "bg-rose-600 text-white hover:bg-rose-700 shadow-rose-200" 
                        : "bg-muted text-muted-foreground cursor-not-allowed"
                    )}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {translate('Final Disposition')}
                  </button>
                  {!isDue && !record.legal_hold && (
                    <p className="mt-2 text-[10px] text-center text-muted-foreground italic">{translate('Eligible for disposal on')} {translate(record.retention_due_date)}</p>
                  )}
                  {record.legal_hold && (
                    <p className="mt-2 text-[10px] text-center text-amber-600 font-medium italic">{translate('Disposal blocked by Legal Hold')}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="bg-muted/30 rounded-xl border p-6">
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">{translate('Metadata')}</h3>
            <div className="text-[10px] space-y-2 text-muted-foreground font-mono">
              <p>{translate('ID:')} {record.id}</p>
              <p>{translate('Created:')} {new Date(record.created_at).toLocaleString()}</p>
              <p>{translate('Updated:')} {new Date(record.updated_at).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
