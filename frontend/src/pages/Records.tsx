import { useState, useEffect, useCallback } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Download,
  ExternalLink,
  History,
  Lock,
  Loader2,
  X,
  ChevronLeft,
  ChevronRight,
  Edit,
  Trash2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import RecordForm from '@/components/records/RecordForm'
import FilterPanel from '@/components/search/FilterPanel'
import SavedSearches from '@/components/search/SavedSearches'
import CategoryTree from '@/components/records/CategoryTree'
import api from '@/lib/api'

interface InventoryRecord {
  id: string
  box_barcode: string
  file_barcode: string
  entity: string
  department: string
  location: string
  disposition_status: string
  record_date: string
  description: string
  updated_at: string
  record_type?: { name: string }
  entity_code?: string
  year?: number
}

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  DUE: 'bg-amber-100 text-amber-700',
  DISPOSED: 'bg-slate-100 text-slate-700',
  LEGAL_HOLD: 'bg-rose-100 text-rose-700',
}

export default function Records() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  
  const [records, setRecords] = useState<InventoryRecord[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<InventoryRecord | null>(null)
  const [barcodeLookup, setBarcodeLookup] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isExporting, setIsExporting] = useState(false)

  // Read state from URL
  const filters = Object.fromEntries(searchParams.entries())
  const page = parseInt(searchParams.get('page') || '1')
  const q = searchParams.get('q') || ''

  const fetchRecords = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams(searchParams)
      const res = await api.get('/search/', { params })
      setRecords(res.data.data)
      setTotal(res.data.total)
    } catch (err) {
      setError('Failed to load records. Make sure the backend is running.')
    } finally {
      setIsLoading(false)
    }
  }, [searchParams])

  useEffect(() => {
    fetchRecords()
  }, [fetchRecords])

  const updateFilters = (newFilters: any) => {
    const cleaned = Object.fromEntries(
      Object.entries(newFilters).filter(([_, v]) => v !== undefined && v !== '')
    )
    setSearchParams({ ...cleaned, page: '1' }) // Reset to page 1 on filter change
  }

  const handleBarcodeLookup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!barcodeLookup) return
    try {
      const res = await api.get(`/records/barcode/${barcodeLookup}`)
      navigate(`/records/${res.data.id}`)
    } catch (err) {
      alert('Barcode not found')
    }
  }

  const handleCreateRecord = async (data: any) => {
    try {
      await api.post('/records/', data)
      setIsCreateModalOpen(false)
      fetchRecords()
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to create record')
    }
  }

  const handleEditRecord = async (data: any) => {
    if (!selectedRecord) return
    try {
      await api.put(`/records/${selectedRecord.id}`, data, {
        headers: { 'If-Match': selectedRecord.updated_at }
      })
      setIsEditModalOpen(false)
      setSelectedRecord(null)
      fetchRecords()
    } catch (err: any) {
      if (err.response?.status === 409) {
        alert('CONFLICT: This record was modified by another user. Please refresh.')
      } else {
        alert(err.response?.data?.detail || 'Failed to update record')
      }
    }
  }

  const handleDeleteRecord = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this record?')) return
    try {
      await api.delete(`/records/${id}`)
      fetchRecords()
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete record')
    }
  }

  const handleExportZip = async () => {
    if (selectedIds.length === 0) return
    setIsExporting(true)
    try {
      const response = await api.post('/ediscovery/export-zip', selectedIds, {
        responseType: 'blob'
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `ediscovery_export_${new Date().getTime()}.zip`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (err) {
      alert('Failed to generate export')
    } finally {
      setIsExporting(false)
    }
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === records.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(records.map(r => r.id))
    }
  }

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id))
    } else {
      setSelectedIds([...selectedIds, id])
    }
  }

  const handleExport = async (format: 'csv' | 'pdf' | 'xlsx') => {
    try {
      const params = new URLSearchParams(searchParams)
      params.set('format', format)
      const response = await api.get('/search/export', { 
        params,
        responseType: 'blob'
      })
      
      const extensions = { csv: 'csv', pdf: 'pdf', xlsx: 'xlsx' }
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `inventory_export_${new Date().getTime()}.${extensions[format]}`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (err) {
      alert(`Failed to export ${format.toUpperCase()}`)
    }
  }

  return (
    <div className="p-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
      {/* Sidebar - Filters & Saved Searches */}
      <div className="space-y-6">
        <div className="bg-card rounded-xl border shadow-sm p-4 space-y-4">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Search className="h-4 w-4" />
            Barcode Lookup
          </h3>
          <form onSubmit={handleBarcodeLookup} className="relative">
            <input 
              type="text"
              placeholder="Type barcode..."
              className="w-full rounded-md border bg-background py-1.5 pl-3 pr-8 text-xs outline-none focus:ring-1 focus:ring-primary"
              value={barcodeLookup}
              onChange={(e) => setBarcodeLookup(e.target.value)}
            />
            <button type="submit" className="absolute right-2 top-1.5 text-muted-foreground hover:text-primary">
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>

        <FilterPanel 
          activeFilters={filters}
          onFilterChange={updateFilters}
        />

        <SavedSearches 
          currentParams={filters}
          onApply={(params) => setSearchParams(params)}
        />

        <div className="bg-card rounded-xl border shadow-sm p-4 space-y-4">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Browse Taxonomy
          </h3>
          <CategoryTree 
            selectedId={searchParams.get('category_id')}
            onSelect={(id) => {
              const newParams = new URLSearchParams(searchParams)
              if (id) newParams.set('category_id', id)
              else newParams.delete('category_id')
              newParams.set('page', '1')
              setSearchParams(newParams)
            }}
          />
        </div>
      </div>

      {/* Main Content - Search Bar & Results */}
      <div className="lg:col-span-3 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Records</h1>
            <p className="text-muted-foreground mt-1">Found {total} records matching criteria.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative group/export">
              <button 
                className="flex items-center justify-center rounded-md border bg-background px-3 py-2 text-sm font-medium hover:bg-accent transition-colors"
              >
                <Download className="mr-2 h-4 w-4" />
                Export
              </button>
              <div className="absolute right-0 top-full mt-1 w-40 bg-card border rounded-lg shadow-xl opacity-0 invisible group-hover/export:opacity-100 group-hover/export:visible transition-all z-20 overflow-hidden">
                <button onClick={() => handleExport('csv')} className="w-full text-left px-4 py-2 text-xs font-medium hover:bg-muted transition-colors flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" /> CSV Spreadsheet
                </button>
                <button onClick={() => handleExport('xlsx')} className="w-full text-left px-4 py-2 text-xs font-medium hover:bg-muted transition-colors flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" /> Excel (XLSX)
                </button>
                <button onClick={() => handleExport('pdf')} className="w-full text-left px-4 py-2 text-xs font-medium hover:bg-muted transition-colors flex items-center gap-2 border-t">
                  <div className="w-2 h-2 rounded-full bg-rose-500" /> PDF Report
                </button>
              </div>
            </div>
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center justify-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-all shadow-sm"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Record
            </button>
          </div>
        </div>

        {/* Global Full-Text Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search everything: barcodes, description, entity, department..."
            className="w-full h-11 rounded-xl border border-input bg-background py-2 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
            value={q}
            onChange={(e) => {
              const newParams = new URLSearchParams(searchParams)
              if (e.target.value) newParams.set('q', e.target.value)
              else newParams.delete('q')
              newParams.set('page', '1')
              setSearchParams(newParams)
            }}
          />
          {q && (
            <button 
              onClick={() => {
                const p = new URLSearchParams(searchParams)
                p.delete('q')
                setSearchParams(p)
              }}
              className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Active Filter Chips */}
        {Object.keys(filters).length > (filters.page ? 1 : 0) && (
          <div className="flex flex-wrap gap-2">
            {Object.entries(filters).map(([k, v]) => {
              if (k === 'page' || k === 'q') return null
              return (
                <div key={k} className="flex items-center gap-1.5 bg-primary/10 text-primary px-2.5 py-1 rounded-full text-xs font-medium border border-primary/20">
                  <span className="capitalize">{k.replace('_id', '')}</span>: {v}
                  <button 
                    onClick={() => {
                      const p = new URLSearchParams(searchParams)
                      p.delete(k)
                      setSearchParams(p)
                    }}
                    className="hover:bg-primary/20 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* Table / Results */}
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden relative">
          {selectedIds.length > 0 && (
            <div className="absolute top-0 left-0 right-0 bg-primary text-primary-foreground px-4 py-2 z-10 flex items-center justify-between animate-in slide-in-from-top-full">
              <span className="text-xs font-bold uppercase tracking-widest">{selectedIds.length} Records Selected</span>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleExportZip}
                  disabled={isExporting}
                  className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-3 py-1 rounded text-xs font-bold transition-colors"
                >
                  {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                  eDiscovery ZIP
                </button>
                <button 
                  onClick={() => setSelectedIds([])}
                  className="text-white/60 hover:text-white p-1"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center p-24">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-24">
              <Search className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground">No records found</h3>
              <p className="text-sm text-muted-foreground/60">Try adjusting your search terms or filters.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="px-4 py-3 w-10">
                        <input 
                          type="checkbox" 
                          className="rounded border-gray-300 text-primary focus:ring-primary h-3.5 w-3.5"
                          checked={selectedIds.length === records.length && records.length > 0}
                          onChange={toggleSelectAll}
                        />
                      </th>
                      <th className="px-4 py-3 font-semibold text-muted-foreground">Barcodes</th>
                      <th className="px-4 py-3 font-semibold text-muted-foreground">Classification</th>
                      <th className="px-4 py-3 font-semibold text-muted-foreground">Details</th>
                      <th className="px-4 py-3 font-semibold text-muted-foreground text-center">Status</th>
                      <th className="px-4 py-3 font-semibold text-muted-foreground text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {records.map((record) => (
                      <tr key={record.id} className={cn(
                        "hover:bg-muted/30 transition-colors group",
                        selectedIds.includes(record.id) && "bg-primary/5"
                      )}>
                        <td className="px-4 py-4">
                          <input 
                            type="checkbox" 
                            className="rounded border-gray-300 text-primary focus:ring-primary h-3.5 w-3.5"
                            checked={selectedIds.includes(record.id)}
                            onChange={() => toggleSelect(record.id)}
                          />
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-mono text-xs font-bold text-primary">{record.box_barcode}</div>
                          <div className="font-mono text-[10px] text-muted-foreground mt-1">{record.file_barcode}</div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{record.entity}</span>
                            <span className="text-[10px] font-mono bg-muted/50 px-1.5 py-0.5 rounded text-muted-foreground">{record.entity_code}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">{record.department}</div>
                        </td>
                        <td className="px-4 py-4 max-w-[200px]">
                          <div className="text-xs font-medium truncate">{record.description}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded uppercase font-bold text-muted-foreground tracking-tighter">
                              {record.record_type?.name || 'Standard'}
                            </span>
                            <span className="text-[10px] text-muted-foreground">{record.record_date} ({record.year})</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
                            statusColors[record.disposition_status] || 'bg-gray-100 text-gray-700'
                          )}>
                            {record.disposition_status}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Link 
                              to={`/records/${record.id}`}
                              className="p-2 hover:bg-muted rounded-md transition-colors"
                              title="View Details"
                            >
                              <ExternalLink className="h-4 w-4 text-muted-foreground" />
                            </Link>
                            <button 
                              onClick={() => {
                                setSelectedRecord(record)
                                setIsEditModalOpen(true)
                              }}
                              className="p-2 hover:bg-muted rounded-md transition-colors text-muted-foreground"
                              title="Edit Record"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteRecord(record.id)}
                              className="p-2 hover:bg-rose-50 rounded-md transition-colors text-muted-foreground hover:text-rose-600"
                              title="Delete Record"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Footer */}
              <div className="px-4 py-3 bg-muted/20 border-t flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  Showing {(page - 1) * 50 + 1} to {Math.min(page * 50, total)} of {total} records
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    disabled={page === 1}
                    onClick={() => {
                      const p = new URLSearchParams(searchParams)
                      p.set('page', (page - 1).toString())
                      setSearchParams(p)
                    }}
                    className="p-1.5 rounded border bg-background hover:bg-muted disabled:opacity-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-xs font-medium px-2">Page {page}</span>
                  <button 
                    disabled={page * 50 >= total}
                    onClick={() => {
                      const p = new URLSearchParams(searchParams)
                      p.set('page', (page + 1).toString())
                      setSearchParams(p)
                    }}
                    className="p-1.5 rounded border bg-background hover:bg-muted disabled:opacity-50"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal for Record Creation */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <RecordForm 
              title="Create New Inventory Record"
              onSubmit={handleCreateRecord}
              onCancel={() => setIsCreateModalOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Modal for Record Editing */}
      {isEditModalOpen && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <RecordForm 
              title="Edit Inventory Record"
              initialData={selectedRecord}
              onSubmit={handleEditRecord}
              onCancel={() => {
                setIsEditModalOpen(false)
                setSelectedRecord(null)
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
