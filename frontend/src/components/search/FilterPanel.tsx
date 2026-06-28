import { useState, useEffect } from 'react'
import { Filter, ChevronDown, ChevronUp } from 'lucide-react'
import api from '@/lib/api'
import { useLanguageStore } from '@/store/languageStore'

interface FilterItem {
  id: string
  name: string
  children?: FilterItem[]
}

interface FilterPanelProps {
  onFilterChange: (filters: Record<string, string | undefined>) => void
  activeFilters: Record<string, string | undefined>
}

export default function FilterPanel({ onFilterChange, activeFilters }: FilterPanelProps) {
  const { translate } = useLanguageStore()
  const [entityTypes, setEntityTypes] = useState<FilterItem[]>([])
  const [entities, setEntities] = useState<FilterItem[]>([])
  const [departments, setDepartments] = useState<FilterItem[]>([])
  const [recordTypes, setRecordTypes] = useState<FilterItem[]>([])
  const [isOpen, setIsOpen] = useState(true)

  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const [etRes, eRes, rtRes] = await Promise.all([
          api.get('/master/entity-types'),
          api.get('/master/entities'),
          api.get('/master/record-types')
        ])
        setEntityTypes(etRes.data)
        setEntities(eRes.data)
        setRecordTypes(rtRes.data)
      } catch (_err) {
        console.error('Failed to fetch filters')
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
      } catch (_err) {
        console.error('Failed to fetch departments')
      }
    }
    fetchDepts()
  }, [activeFilters.entity_id])

  const handleSelectChange = (field: string, value: string) => {
    const updates: Record<string, string | undefined> = { [field]: value || undefined }
    
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
          {translate('Faceted Filters')}
        </div>
        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {isOpen && (
        <div className="p-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase">{translate('Keyword Search')}</label>
            <input 
              type="text"
              value={activeFilters.q || ''}
              onChange={(e) => handleSelectChange('q', e.target.value)}
              placeholder={translate('Search descriptions, tags...')}
              className="w-full rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase">{translate('Entity Type')}</label>
            <select 
              value={activeFilters.entity_type_id || ''}
              onChange={(e) => handleSelectChange('entity_type_id', e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">{translate('All Types')}</option>
              {entityTypes.map(et => <option key={et.id} value={et.id}>{et.name}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase">{translate('Entity')}</label>
            <select 
              value={activeFilters.entity_id || ''}
              onChange={(e) => handleSelectChange('entity_id', e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">{translate('All Entities')}</option>
              {entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase">{translate('Department')}</label>
            <select 
              value={activeFilters.department_id || ''}
              onChange={(e) => handleSelectChange('department_id', e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">{translate('All Departments')}</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase">{translate('Location')}</label>
            <input 
              type="text"
              maxLength={16}
              value={activeFilters.location || ''}
              onChange={(e) => handleSelectChange('location', e.target.value)}
              placeholder={translate('Filter by location...')}
              className="w-full rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase">{translate('Record Type')}</label>
            <select 
              value={activeFilters.record_type_id || ''}
              onChange={(e) => handleSelectChange('record_type_id', e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">{translate('All Types')}</option>
              {recordTypes.map(rt => <option key={rt.id} value={rt.id}>{rt.name}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase">{translate('Status')}</label>
            <select 
              value={activeFilters.disposition_status || ''}
              onChange={(e) => handleSelectChange('disposition_status', e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">{translate('All Statuses')}</option>
              <option value="ACTIVE">{translate('Active')}</option>
              <option value="DUE">{translate('Due for Disposition')}</option>
              <option value="DISPOSED">{translate('Disposed')}</option>
              <option value="LEGAL_HOLD">{translate('Legal Hold')}</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase">{translate('Record Date')}</label>
            <input 
              type="date"
              value={activeFilters.record_date || ''}
              onChange={(e) => handleSelectChange('record_date', e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase">{translate('Tags')}</label>
            <input 
              type="text"
              value={activeFilters.tags || ''}
              onChange={(e) => handleSelectChange('tags', e.target.value)}
              placeholder={translate('e.g. Finance, Vital...')}
              className="w-full rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <button 
            onClick={clearFilters}
            className="w-full py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground border rounded-md transition-colors"
          >
            {translate('Clear All Filters')}
          </button>
        </div>
      )}
    </div>
  )
}
