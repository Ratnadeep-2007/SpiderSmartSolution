import { useState, useEffect } from 'react'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { 
  FileText, 
  Users, 
  Calendar, 
  MapPin, 
  ShieldCheck, 
  AlertTriangle,
  Download,
  Loader2,
  RefreshCcw,
  Settings,
  Table as TableIcon,
  Filter,
  Save,
  Plus,
  Clock,
  Mail,
  X
} from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'
import { cn } from '@/lib/utils'

const COLORS = ['#0ea5e9', '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e']

const ALL_COLUMNS = [
  { id: 'box_barcode', label: 'Box Barcode' },
  { id: 'file_barcode', label: 'File Barcode' },
  { id: 'entity', label: 'Entity' },
  { id: 'department', label: 'Department' },
  { id: 'location', label: 'Location' },
  { id: 'year', label: 'Year' },
  { id: 'disposition_status', label: 'Status' },
  { id: 'retention_due_date', label: 'Due Date' },
  { id: 'created_at', label: 'Created At' },
]

export default function Reports() {
  const [activeReport, setActiveReport] = useState('entity')
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [upcoming, setUpcoming] = useState<any[]>([])
  const [holds, setHolds] = useState<any[]>([])
  
  // Custom Report Builder State
  const [selectedColumns, setSelectedColumns] = useState<string[]>(['box_barcode', 'file_barcode', 'entity', 'disposition_status'])
  const [customReportData, setCustomReportData] = useState<any[]>([])
  const [isGenerating, setIsGenerating] = useState(false)

  const reports = [
    { id: 'entity', name: 'Records by Entity', icon: MapPin, endpoint: '/reports/by-entity' },
    { id: 'dept', name: 'Records by Department', icon: Users, endpoint: '/reports/by-department' },
    { id: 'year', name: 'Records by Year', icon: Calendar, endpoint: '/reports/by-year' },
    { id: 'location', name: 'Records by Location', icon: MapPin, endpoint: '/reports/by-location' },
    { id: 'compliance', name: 'Retention Compliance', icon: ShieldCheck, endpoint: '/reports/compliance' },
    { id: 'upcoming', name: 'Upcoming Dispositions', icon: AlertTriangle, endpoint: '/reports/upcoming-dispositions' },
    { id: 'user', name: 'Activity by User', icon: Users, endpoint: '/reports/user-activity' },
    { id: 'holds', name: 'Legal Holds Active', icon: FileText, endpoint: '/reports/active-holds' },
    { id: 'custom', name: 'Custom Report Builder', icon: Settings, endpoint: null },
    { id: 'schedules', name: 'Export Schedules', icon: Clock, endpoint: '/schedules' },
  ]

  const [schedules, setSchedules] = useState<any[]>([])
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [newSchType, setNewSchType] = useState('records')
  const [newSchFormat, setNewSchFormat] = useState('csv')
  const [newSchCron, setNewSchCron] = useState('0 0 * * *')
  const [newSchEmails, setNewSchEmails] = useState('')

  const handleExport = async (format: 'csv' | 'pdf') => {
    try {
      const response = await api.get('/search/export', { 
        params: { format },
        responseType: 'blob'
      })
      
      const extensions = { csv: 'csv', pdf: 'pdf' }
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `report_export_${new Date().getTime()}.${extensions[format]}`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      alert(`Failed to export ${format.toUpperCase()}`)
    }
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      if (activeReport === 'custom') return
      
      const report = reports.find(r => r.id === activeReport)
      if (!report) return

      const res = await api.get(report.endpoint!)
      if (activeReport === 'upcoming') {
        setUpcoming(res.data)
      } else if (activeReport === 'holds') {
        setHolds(res.data)
      } else if (activeReport === 'schedules') {
        setSchedules(res.data)
      } else {
        setData(res.data)
      }
    } catch (err) {
      toast.error('Failed to fetch report data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [activeReport])

  const handleGenerateCustom = async () => {
    setIsGenerating(true)
    try {
      const res = await api.post('/reports/custom', { 
        columns: selectedColumns 
      })
      setCustomReportData(res.data)
      toast.success('Custom report generated')
    } catch (err) {
      toast.error('Failed to generate report')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCreateSchedule = async () => {
    try {
      await api.post('/schedules', {
        report_type: newSchType,
        format: newSchFormat,
        schedule_cron: newSchCron,
        email_list: newSchEmails.split(',').map(e => e.trim())
      })
      toast.success('Schedule created')
      setShowScheduleModal(false)
      fetchData()
    } catch (err) {
      toast.error('Failed to create schedule')
    }
  }

  const renderChart = () => {
    if (activeReport === 'schedules') {
      return (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button 
              onClick={() => setShowScheduleModal(true)}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-primary/90 transition-all"
            >
              <Plus className="h-4 w-4" /> Create New Schedule
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {schedules.map(sch => (
              <div key={sch.id} className="bg-muted/20 border rounded-xl p-6 space-y-4 hover:border-primary/50 transition-colors group">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <h4 className="font-black text-xs uppercase tracking-widest text-primary">{sch.report_type} Report</h4>
                    <p className="text-xl font-bold font-mono tracking-tighter">{sch.schedule_cron}</p>
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700 uppercase">
                      {sch.format}
                    </span>
                  </div>
                  <button 
                    onClick={async () => { 
                      if (confirm('Delete this schedule?')) {
                        await api.delete(`/schedules/${sch.id}`); 
                        fetchData(); 
                      }
                    }} 
                    className="p-2 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 pt-2 border-t">
                  {sch.email_list.map((email: string) => (
                    <span key={email} className="flex items-center gap-1.5 text-[10px] bg-background border rounded px-2 py-1 font-medium">
                      <Mail className="h-3 w-3" /> {email}
                    </span>
                  ))}
                </div>
              </div>
            ))}
            {schedules.length === 0 && (
              <div className="col-span-full py-12 text-center bg-muted/10 border-2 border-dashed rounded-2xl">
                <Clock className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-20" />
                <p className="text-sm text-muted-foreground">No recurring exports scheduled yet.</p>
              </div>
            )}
          </div>
        </div>
      )
    }

    if (activeReport === 'custom') {
      return (
        <div className="space-y-6">
          <div className="bg-muted/30 p-6 rounded-xl border border-dashed flex flex-col md:flex-row gap-6 items-start">
            <div className="flex-1 space-y-4 w-full">
              <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <TableIcon className="h-3 w-3" /> Select Columns
              </h4>
              <div className="flex flex-wrap gap-2">
                {ALL_COLUMNS.map(col => (
                  <button
                    key={col.id}
                    onClick={() => {
                      if (selectedColumns.includes(col.id)) {
                        setSelectedColumns(selectedColumns.filter(c => c !== col.id))
                      } else {
                        setSelectedColumns([...selectedColumns, col.id])
                      }
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                      selectedColumns.includes(col.id)
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-background text-muted-foreground border-input hover:border-primary/50"
                    )}
                  >
                    {col.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="shrink-0 w-full md:w-auto">
              <button 
                onClick={handleGenerateCustom}
                disabled={isGenerating || selectedColumns.length === 0}
                className="w-full bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-bold shadow-md hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                Run Report
              </button>
            </div>
          </div>

          {customReportData.length > 0 && (
            <div className="overflow-x-auto border rounded-xl animate-in fade-in slide-in-from-bottom-2">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 border-b font-bold">
                  <tr>
                    {selectedColumns.map(id => (
                      <th key={id} className="px-6 py-4 capitalize">{id.replace(/_/g, ' ')}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {customReportData.map((r, i) => (
                    <tr key={i} className="hover:bg-muted/30">
                      {selectedColumns.map(id => (
                        <td key={id} className="px-6 py-4">
                          {id.includes('at') || id.includes('date') 
                            ? (r[id] ? new Date(r[id]).toLocaleDateString() : 'N/A')
                            : String(r[id] || 'N/A')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )
    }

    if (activeReport === 'upcoming') {
      return (
        <div className="overflow-x-auto border rounded-xl">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 border-b font-bold">
              <tr>
                <th className="px-6 py-4">Box Barcode</th>
                <th className="px-6 py-4">File Barcode</th>
                <th className="px-6 py-4">Due Date</th>
                <th className="px-6 py-4">Entity</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {upcoming.map((r, i) => (
                <tr key={i} className="hover:bg-muted/30">
                  <td className="px-6 py-4 font-mono text-xs">{r.box_barcode}</td>
                  <td className="px-6 py-4 font-mono text-xs">{r.file_barcode}</td>
                  <td className="px-6 py-4 text-rose-600 font-medium">{new Date(r.due_date).toLocaleDateString()}</td>
                  <td className="px-6 py-4">{r.entity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }

    if (activeReport === 'holds') {
      return (
        <div className="overflow-x-auto border rounded-xl">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 border-b font-bold">
              <tr>
                <th className="px-6 py-4">Box Barcode</th>
                <th className="px-6 py-4">File Barcode</th>
                <th className="px-6 py-4">Hold Date</th>
                <th className="px-6 py-4">Entity</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {holds.map((r, i) => (
                <tr key={i} className="hover:bg-muted/30">
                  <td className="px-6 py-4 font-mono text-xs">{r.box_barcode}</td>
                  <td className="px-6 py-4 font-mono text-xs">{r.file_barcode}</td>
                  <td className="px-6 py-4 font-medium">{new Date(r.legal_hold_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4">{r.entity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }

    const isPie = activeReport === 'compliance' || activeReport === 'entity'

    return (
      <div className="h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          {isPie ? (
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={150}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          ) : (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
              <Tooltip cursor={{ fill: '#f1f5f9' }} />
              <Bar dataKey="value" fill="#0ea5e9" radius={[4, 4, 0, 0]} barSize={40} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics & Reports</h1>
          <p className="text-muted-foreground mt-1 text-sm">Real-time inventory insights and compliance metrics.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchData}
            className="p-2 border rounded-md hover:bg-muted transition-colors"
            title="Refresh Data"
          >
            <RefreshCcw className={loading && activeReport !== 'custom' ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          </button>
          <div className="relative group">
            <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium shadow-sm hover:bg-primary/90 transition-all">
              <Download className="h-4 w-4" />
              Export Report
            </button>
            <div className="absolute right-0 top-full mt-2 w-40 bg-card border rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all z-20 overflow-hidden">
              <button 
                onClick={() => handleExport('csv')}
                className="w-full text-left px-4 py-2 text-xs font-bold hover:bg-muted transition-colors flex items-center gap-2"
              >
                <FileText className="h-3 w-3" /> CSV Format
              </button>
              <button 
                onClick={() => handleExport('pdf')}
                className="w-full text-left px-4 py-2 text-xs font-bold hover:bg-muted transition-colors flex items-center gap-2 border-t"
              >
                <AlertTriangle className="h-3 w-3 text-rose-500" /> PDF Document
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar */}
        <div className="space-y-2">
          {reports.map((r) => (
            <button
              key={r.id}
              onClick={() => setActiveReport(r.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all text-left",
                activeReport === r.id 
                  ? "bg-primary text-primary-foreground shadow-md" 
                  : "bg-card border hover:border-primary/50"
              )}
            >
              <r.icon className="h-4 w-4" />
              {r.name}
            </button>
          ))}
        </div>

        {/* Chart Area */}
        <div className="lg:col-span-3">
          <div className="bg-card rounded-2xl border shadow-sm p-8">
            <h3 className="text-lg font-bold mb-8 flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {reports.find(r => r.id === activeReport)?.name}
            </h3>

            {loading && activeReport !== 'custom' ? (
              <div className="h-[400px] flex items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
              </div>
            ) : (
              renderChart()
            )}
          </div>
        </div>
      </div>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-md rounded-2xl border shadow-2xl p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Schedule Recurring Export
              </h3>
              <button onClick={() => setShowScheduleModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-muted-foreground">Report Type</label>
                <select 
                  value={newSchType} onChange={e => setNewSchType(e.target.value)}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                >
                  <option value="records">Complete Inventory</option>
                  <option value="audit">Audit Trails</option>
                  <option value="compliance">Compliance Report</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Format</label>
                  <select 
                    value={newSchFormat} onChange={e => setNewSchFormat(e.target.value)}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  >
                    <option value="csv">CSV (Spreadsheet)</option>
                    <option value="pdf">PDF (Document)</option>
                    <option value="xlsx">Excel (XLSX)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Schedule (Cron)</label>
                  <input 
                    type="text" value={newSchCron} onChange={e => setNewSchCron(e.target.value)}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                    placeholder="0 0 * * *"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-muted-foreground">Recipients (Comma separated)</label>
                <textarea 
                  value={newSchEmails} onChange={e => setNewSchEmails(e.target.value)}
                  className="w-full rounded-lg border bg-background px-4 py-2 text-sm min-h-[100px]"
                  placeholder="admin@spidersmart.com, manager@spidersmart.com"
                />
              </div>

              <button 
                onClick={handleCreateSchedule}
                className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-bold shadow-sm hover:bg-primary/90 transition-all"
              >
                Create Automated Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
