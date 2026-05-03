import { useState, useEffect, useCallback } from 'react'
import { Filter, X, ChevronDown, ChevronUp } from 'lucide-react'
import api from '@/lib/api'

interface FilterPanelProps {
  onFilterChange: (filters: any) => void
  activeFilters: any
}

export default function FilterPanel({ onFilterChange, activeFilters }: FilterPanelProps) {
  const [entityTypes, setEntityTypes] = useState<any[]>([])
  const [entities, setEntities] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [recordTypes, setRecordTypes] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [isOpen, setIsOpen] = useState(true)

  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const [etRes, eRes, rtRes, catRes] = await Promise.all([
          api.get('/master/entity-types'),
          api.get('/master/entities'),
          api.get('/master/record-types'),
          api.get('/master/categories')
        ])
        setEntityTypes(etRes.data)
        setEntities(eRes.data)
        setRecordTypes(rtRes.data)
        setCategories(catRes.data)
      } catch (err) {
        console.error('Failed to fetch filters:', err)
      }
    }
    fetchMeta()
  }, [])

  // Fetch departments when entity changes
  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const params = activeFilters.entity_id ? { entity_id: activeFilters.entity_id } : {}
        const res = await api.get('/master/departments', { params })
        setDepartments(res.data)
      } catch (err) {
        console.error('Failed to fetch departments:', err)
      }
    }
    fetchDepts()
  }, [activeFilters.entity_id])

  const handleSelectChange = (field: string, value: string) => {
    const updates: any = { [field]: value || undefined }
    
    // If entity changes, clear department
    if (field === 'entity_id') {
      updates.department_id = undefined
    }

    onFilterChange({
      ...activeFilters,
      ...updates
    })
  }

  const clearFilters = () => {
    onFilterChange({})
  }

  return (
    <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between bg-muted/20 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2 font-semibold">
          <Filter className="h-4 w-4" />
          Faceted Filters
        </div>
        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {isOpen && (
        <div className="p-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase">Keyword Search</label>
            <input 
              type="text"
              value={activeFilters.q || ''}
              onChange={(e) => handleSelectChange('q', e.target.value)}
              placeholder="Search descriptions, tags..."
              className="w-full rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase">Entity Type</label>
            <select 
              value={activeFilters.entity_type_id || ''}
              onChange={(e) => handleSelectChange('entity_type_id', e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">All Types</option>
              {entityTypes.map(et => <option key={et.id} value={et.id}>{et.name}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase">Entity</label>
            <select 
              value={activeFilters.entity_id || ''}
              onChange={(e) => handleSelectChange('entity_id', e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">All Entities</option>
              {entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase">Department</label>
            <select 
              value={activeFilters.department_id || ''}
              onChange={(e) => handleSelectChange('department_id', e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">All Departments</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase">Location</label>
            <input 
              type="text"
              maxLength={16}
              value={activeFilters.location || ''}
              onChange={(e) => handleSelectChange('location', e.target.value)}
              placeholder="Filter by location..."
              className="w-full rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase">Record Type</label>
            <select 
              value={activeFilters.record_type_id || ''}
              onChange={(e) => handleSelectChange('record_type_id', e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">All Types</option>
              {recordTypes.map(rt => <option key={rt.id} value={rt.id}>{rt.name}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase">Status</label>
            <select 
              value={activeFilters.disposition_status || ''}
              onChange={(e) => handleSelectChange('disposition_status', e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="DUE">Due for Disposition</option>
              <option value="DISPOSED">Disposed</option>
              <option value="LEGAL_HOLD">Legal Hold</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase">Record Date</label>
            <input 
              type="date"
              value={activeFilters.record_date || ''}
              onChange={(e) => handleSelectChange('record_date', e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase">Tags</label>
            <input 
              type="text"
              value={activeFilters.tags || ''}
              onChange={(e) => handleSelectChange('tags', e.target.value)}
              placeholder="e.g. Finance, Vital..."
              className="w-full rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase">Category</label>
            <select 
              value={activeFilters.category_id || ''}
              onChange={(e) => handleSelectChange('category_id', e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <optgroup key={cat.id} label={cat.name}>
                  <option value={cat.id}>{cat.name} (Parent)</option>
                  {cat.children?.map((child: any) => (
                    <option key={child.id} value={child.id}>&nbsp;&nbsp;{child.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <button 
            onClick={clearFilters}
            className="w-full py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground border rounded-md transition-colors"
          >
            Clear All Filters
          </button>
        </div>
      )}
    </div>
  )
}
