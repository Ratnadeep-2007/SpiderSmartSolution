import { useState, useEffect } from 'react'
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  ArrowLeft,
  Loader2,
  Table as TableIcon,
  Settings,
  Database
} from 'lucide-react'
import { cn } from '@/lib/utils'
import api from '@/lib/api'

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

export default function Import() {
  const [step, setStep] = useState(1)
  const [file, setFile] = useState<File | null>(null)
  const [headers, setHeaders] = useState<string[]>([])
  const [previewRows, setPreviewRows] = useState<string[][]>([])
  const [fieldMap, setFieldMap] = useState<Record<string, string>>({})
  const [defaults, setDefaults] = useState<Record<string, any>>({})
  const [isProcessing, setIsProcessing] = useState(false)
  const [importResult, setImportResult] = useState<any>(null)

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
      } catch (err) {
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
      setStep(3)
    } catch (err) {
      alert('Import failed')
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
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={cn(
              "h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold border transition-all",
              step === s ? "bg-primary text-primary-foreground border-primary" : 
              step > s ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-muted text-muted-foreground"
            )}>
              {step > s ? <CheckCircle2 className="h-5 w-5" /> : s}
            </div>
            <span className={cn(
              "text-sm font-medium",
              step === s ? "text-foreground" : "text-muted-foreground"
            )}>
              {s === 1 ? "Upload" : s === 2 ? "Map Fields" : "Review"}
            </span>
            {s < 3 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
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
              <button 
                onClick={handleProcess}
                disabled={isProcessing}
                className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-lg font-bold shadow-sm hover:bg-primary/90 transition-all disabled:opacity-50"
              >
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Start Import Process"}
              </button>
              <button 
                onClick={() => setStep(1)}
                className="w-full text-xs text-muted-foreground hover:text-foreground"
              >
                Cancel and Choose Another File
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 3 && importResult && (
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
