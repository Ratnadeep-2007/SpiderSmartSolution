import { useState } from 'react'
import { 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  Loader2,
  Table as TableIcon,
  Settings,
  Database,
  Sparkles
} from 'lucide-react'
import { cn } from '@/lib/utils'
import api from '@/lib/api'
import { toast } from 'sonner'

const RECORD_FIELDS = [
  { name: 'box_barcode', label: 'Box Barcode', required: true },
  { name: 'file_barcode', label: 'File Barcode', required: true },
  { name: 'description', label: 'Description', required: true },
  { name: 'entity', label: 'Entity', required: true },
  { name: 'entity_code', label: 'Entity Code', required: true },
  { name: 'department', label: 'Department', required: true },
  { name: 'location', label: 'Location', required: true },
  { name: 'record_date', label: 'Record Date (YYYY-MM-DD)', required: true },
  { name: 'year', label: 'Year (4 Digits)', required: true },
  { name: 'record_type_id', label: 'Record Type ID', required: false },
  { name: 'category_id', label: 'Category ID', required: false },
]

interface ImportResult {
  success_count: number
  error_count: number
  errors: { row: number; error: string }[]
}

interface HarmDiff {
  row_index: number
  has_changes: boolean
  changes: Record<string, { original: string; corrected: string }>
  corrected_row: Record<string, string>
}

interface HarmResult {
  method: string
  total_rows: number
  changed_rows: number
  unchanged_rows: number
  diffs: HarmDiff[]
}

export default function Import() {
  const [step, setStep] = useState(1)
  const [file, setFile] = useState<File | null>(null)
  const [headers, setHeaders] = useState<string[]>([])
  const [previewRows, setPreviewRows] = useState<string[][]>([])
  const [fieldMap, setFieldMap] = useState<Record<string, string>>({})
  const [defaults, setDefaults] = useState<Record<string, string>>({})
  const [isProcessing, setIsProcessing] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)

  // Harmonization state
  const [harmResult, setHarmResult] = useState<HarmResult | null>(null)
  const [editedRows, setEditedRows] = useState<Record<string, string>[]>([])
  const [isHarmonizing, setIsHarmonizing] = useState(false)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      setFile(selectedFile)
      
      const formData = new FormData()
      formData.append('file', selectedFile)
      
      try {
        const res = await api.post('/import/preview', formData)
        setHeaders(res.data.headers)
        setPreviewRows(res.data.preview_rows)
        
        // Auto-map based on exact name match
        const initialMap: Record<string, string> = {}
        RECORD_FIELDS.forEach(f => {
          const match = res.data.headers.find((h: string) => h.toLowerCase() === f.label.toLowerCase() || h.toLowerCase() === f.name.toLowerCase())
          if (match) initialMap[f.name] = match
        })
        setFieldMap(initialMap)
        setStep(2)
      } catch (_err) {
        alert('Failed to parse CSV')
      }
    }
  }

  const handleProcess = async () => {
    if (!file) return
    setIsProcessing(true)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('field_map', JSON.stringify(fieldMap))
    formData.append('defaults', JSON.stringify(defaults))
    
    try {
      const res = await api.post('/import/process', formData)
      setImportResult(res.data)
      setStep(4) // skip harmonization for full import, go to result
    } catch (_err) {
      toast.error('Import failed')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleHarmonize = async () => {
    if (!file) return
    setIsHarmonizing(true)
    try {
      // Parse full CSV to rows for harmonization
      const text = await file.text()
      const lines = text.split('\n').filter(Boolean)
      const hdrs = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
      const rows: Record<string, string>[] = lines.slice(1).map(line => {
        const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
        const obj: Record<string, string> = {}
        hdrs.forEach((h, i) => { obj[h] = vals[i] || '' })
        // Also map to record field names
        RECORD_FIELDS.forEach(f => {
          const col = fieldMap[f.name]
          if (col && obj[col] !== undefined) obj[f.name] = obj[col]
        })
        return { ...defaults, ...obj }
      })
      const res = await api.post('/harmonize/preview', { rows: rows.slice(0, 200) })
      setHarmResult(res.data)
      setEditedRows(res.data.diffs.map((d: HarmDiff) => d.corrected_row))
      setStep(3)
    } catch {
      toast.error('Harmonization failed')
    } finally {
      setIsHarmonizing(false)
    }
  }

  const handleCommitHarmonized = async () => {
    setIsProcessing(true)
    try {
      const res = await api.post('/harmonize/commit', { rows: editedRows })
      setImportResult(res.data)
      setStep(4)
    } catch {
      toast.error('Commit failed')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Bulk Data Import</h1>
        <p className="text-muted-foreground mt-1">Upload CSV files to create multiple records at once.</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-4">
        {[
          { n: 1, label: 'Upload' },
          { n: 2, label: 'Map Fields' },
          { n: 3, label: 'Harmonize' },
          { n: 4, label: 'Review' },
        ].map(({ n, label }) => (
          <div key={n} className="flex items-center gap-2">
            <div className={cn(
              "h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold border transition-all",
              step === n ? "bg-primary text-primary-foreground border-primary" : 
              step > n ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-muted text-muted-foreground"
            )}>
              {step > n ? <CheckCircle2 className="h-5 w-5" /> : n}
            </div>
            <span className={cn(
              "text-sm font-medium",
              step === n ? "text-foreground" : "text-muted-foreground"
            )}>
              {label}
            </span>
            {n < 4 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="bg-card rounded-xl border-2 border-dashed p-12 flex flex-col items-center justify-center gap-4 hover:border-primary/50 transition-colors cursor-pointer relative">
          <input 
            type="file" 
            accept=".csv" 
            onChange={handleFileChange}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
          <div className="bg-primary/10 p-4 rounded-full">
            <Upload className="h-8 w-8 text-primary" />
          </div>
          <div className="text-center">
            <h3 className="font-semibold text-lg">Select CSV File</h3>
            <p className="text-sm text-muted-foreground">Click or drag and drop your inventory CSV</p>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b bg-muted/20 flex items-center gap-2 font-semibold">
                <TableIcon className="h-4 w-4" />
                Column Mapping
              </div>
              <div className="p-6 space-y-4">
                {RECORD_FIELDS.map(field => (
                  <div key={field.name} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2 border-b last:border-0">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">
                        {field.label}
                        {field.required && <span className="text-destructive ml-1">*</span>}
                      </span>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{field.name}</span>
                    </div>
                    <select
                      value={fieldMap[field.name] || ''}
                      onChange={(e) => setFieldMap({ ...fieldMap, [field.name]: e.target.value })}
                      className="w-full sm:w-64 rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="">Select CSV Column...</option>
                      {headers.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b bg-muted/20 flex items-center gap-2 font-semibold text-amber-700">
                <Settings className="h-4 w-4" />
                Default Values (Applied if missing in CSV)
              </div>
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium uppercase text-muted-foreground">Entity</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Spider Smart"
                    onChange={(e) => setDefaults({...defaults, entity: e.target.value})}
                    className="w-full rounded-md border bg-background px-3 py-1.5 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium uppercase text-muted-foreground">Location</label>
                  <input 
                    type="text" 
                    maxLength={16}
                    placeholder="e.g. Warehouse B"
                    onChange={(e) => setDefaults({...defaults, location: e.target.value})}
                    className="w-full rounded-md border bg-background px-3 py-1.5 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-card rounded-xl border shadow-sm p-6 space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Database className="h-4 w-4 text-primary" />
                Data Preview
              </h3>
              <p className="text-xs text-muted-foreground">Showing first 5 rows of {file?.name}</p>
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-[10px] text-left">
                  <thead className="bg-muted">
                    <tr>
                      {headers.slice(0, 3).map(h => <th key={h} className="px-2 py-1.5">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {previewRows.map((row, i) => (
                      <tr key={i}>
                        {row.slice(0, 3).map((cell, j) => <td key={j} className="px-2 py-1.5 truncate max-w-[80px]">{cell}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-col gap-2">
                <button 
                  onClick={handleHarmonize}
                  disabled={isHarmonizing || isProcessing}
                  className="w-full flex items-center justify-center gap-2 bg-violet-600 text-white py-2.5 rounded-lg font-bold shadow-sm hover:bg-violet-700 transition-all disabled:opacity-50"
                >
                  {isHarmonizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Harmonize with AI
                </button>
                <button 
                  onClick={handleProcess}
                  disabled={isProcessing || isHarmonizing}
                  className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-lg font-bold shadow-sm hover:bg-primary/90 transition-all disabled:opacity-50"
                >
                  {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Import Directly"}
                </button>
                <button 
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={isProcessing || isHarmonizing}
                  className="w-full border bg-background py-2 rounded-lg font-medium text-sm hover:bg-accent text-center transition-colors"
                >
                  Go Back & Change File
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 3 && harmResult && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-lg">Data Harmonization Review</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Method: <span className="font-medium capitalize">{harmResult.method.replace('_', ' ')}</span>
                {' · '}{harmResult.changed_rows} of {harmResult.total_rows} rows corrected
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleCommitHarmonized}
                disabled={isProcessing}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2 rounded-lg text-sm font-bold hover:bg-primary/90 disabled:opacity-50"
              >
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Accept & Import
              </button>
              <button onClick={() => setStep(2)} className="border px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent">
                Back
              </button>
            </div>
          </div>

          {/* Summary chips */}
          <div className="flex gap-4">
            <div className="bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-lg text-center">
              <span className="text-lg font-black text-emerald-700">{harmResult.unchanged_rows}</span>
              <span className="block text-[10px] font-bold text-emerald-600 uppercase">Unchanged</span>
            </div>
            <div className="bg-amber-50 border border-amber-100 px-4 py-2 rounded-lg text-center">
              <span className="text-lg font-black text-amber-700">{harmResult.changed_rows}</span>
              <span className="block text-[10px] font-bold text-amber-600 uppercase">Corrected</span>
            </div>
          </div>

          {/* Diff table — only rows with changes */}
          <div className="bg-card border rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b bg-muted/20 text-sm font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet-500" />
              Corrections Preview
              <span className="text-muted-foreground font-normal">(only modified rows shown)</span>
            </div>
            <div className="divide-y max-h-96 overflow-y-auto">
              {harmResult.diffs.filter(d => d.has_changes).length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No corrections needed — data looks clean!
                </div>
              ) : (
                harmResult.diffs.filter(d => d.has_changes).map(diff => (
                  <div key={diff.row_index} className="px-5 py-3 space-y-2">
                    <div className="text-xs font-bold text-muted-foreground uppercase">Row {diff.row_index + 1}</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {Object.entries(diff.changes).map(([field, change]) => (
                        <div key={field} className="bg-amber-50 border border-amber-100 rounded-lg p-2 space-y-1">
                          <div className="text-[10px] font-bold uppercase text-amber-700">{field}</div>
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="line-through text-rose-500">{String(change.original) || '(empty)'}</span>
                            <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span className="font-medium text-emerald-700">{String(change.corrected)}</span>
                          </div>
                          {/* Allow manual override */}
                          <input
                            value={editedRows[diff.row_index]?.[field] ?? String(change.corrected)}
                            onChange={e => {
                              const updated = [...editedRows]
                              updated[diff.row_index] = { ...updated[diff.row_index], [field]: e.target.value }
                              setEditedRows(updated)
                            }}
                            className="w-full text-xs border rounded px-2 py-0.5 bg-white focus:ring-1 focus:ring-primary outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {step === 4 && importResult && (
        <div className="bg-card rounded-xl border shadow-lg p-8 space-y-6 animate-in zoom-in-95 duration-300">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className={cn(
              "h-16 w-16 rounded-full flex items-center justify-center",
              importResult.error_count === 0 ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
            )}>
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Import Completed</h2>
              <p className="text-muted-foreground">Processed all rows from {file?.name}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
            <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl text-center">
              <span className="block text-2xl font-black text-emerald-700">{importResult.success_count}</span>
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Success</span>
            </div>
            <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl text-center">
              <span className="block text-2xl font-black text-rose-700">{importResult.error_count}</span>
              <span className="text-[10px] font-bold text-rose-600 uppercase tracking-widest">Errors</span>
            </div>
          </div>

          {importResult.errors.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-bold flex items-center gap-2 text-rose-700">
                <AlertCircle className="h-4 w-4" />
                Error Log
              </h4>
              <div className="max-h-48 overflow-y-auto rounded-lg border bg-muted/30 p-4 font-mono text-xs">
                {importResult.errors.map((err: any, i: number) => (
                  <div key={i} className="py-1 border-b last:border-0">
                    <span className="font-bold text-rose-600">Row {err.row}:</span> {err.error}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-center gap-4 pt-4">
            <button 
              onClick={() => setStep(1)}
              className="px-6 py-2 border rounded-lg text-sm font-medium hover:bg-accent"
            >
              Import Another File
            </button>
            <button 
              onClick={() => window.location.href = '/records'}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 shadow-sm"
            >
              View Inventory
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
