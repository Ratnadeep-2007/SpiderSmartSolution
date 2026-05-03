import { useState, useEffect } from 'react'
import { 
  Building2, 
  Home, 
  MapPin, 
  Plus, 
  Trash2, 
  Edit2, 
  Loader2,
  CheckCircle2,
  X,
  FileText,
  Layout,
  Settings2,
  FolderTree,
  Download,
  ChevronRight
} from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'
import { cn } from '@/lib/utils'

export default function AdminMaster() {
  const [activeTab, setActiveTab] = useState('entities')
  const [entityTypes, setEntityTypes] = useState<any[]>([])
  const [entities, setEntities] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [recordTypes, setRecordTypes] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [newItemName, setNewItemName] = useState('')
  const [newItemEntityId, setNewItemEntityId] = useState('')
  const [newItemEntityCode, setNewItemEntityCode] = useState('')
  const [newItemParentId, setNewItemParentId] = useState('')
  
  // Field Builder State
  const [selectedRt, setSelectedRt] = useState<any>(null)
  const [showFieldModal, setShowFieldModal] = useState(false)
  const [newFieldName, setNewFieldName] = useState('')
  const [newFieldLabel, setNewFieldLabel] = useState('')
  const [newFieldType, setNewFieldType] = useState('text')
  const [newFieldRequired, setNewFieldRequired] = useState(false)
  const [newFieldOptions, setNewFieldOptions] = useState('')

  const fetchMasterData = async () => {
    setLoading(true)
    try {
      const [etRes, eRes, dRes, rtRes, catRes] = await Promise.all([
        api.get('/master/entity-types'),
        api.get('/master/entities'),
        api.get('/master/departments'),
        api.get('/master/record-types'),
        api.get('/master/categories')
      ])
      setEntityTypes(etRes.data)
      setEntities(eRes.data)
      setDepartments(dRes.data)
      setRecordTypes(rtRes.data)
      
      // Flatten categories for table view
      const flattenedCats: any[] = []
      const flatten = (items: any[]) => {
        items.forEach(item => {
          flattenedCats.push(item)
          if (item.children && item.children.length > 0) {
            flatten(item.children)
          }
        })
      }
      flatten(catRes.data)
      setCategories(flattenedCats)
      
      // Update selectedRt if it exists to reflect schema changes
      if (selectedRt) {
        const updatedRt = rtRes.data.find((rt: any) => rt.id === selectedRt.id)
        if (updatedRt) setSelectedRt(updatedRt)
      }
    } catch (err) {
      toast.error('Failed to fetch master data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMasterData()
  }, [])

  const getAddLabel = () => {
    switch (activeTab) {
      case 'entities': return 'Entity'
      case 'departments': return 'Department'
      case 'entity-types': return 'Entity Type'
      case 'record-types': return 'Record Type'
      case 'categories': return 'Category'
      case 'schemas': return 'Schema'
      default: return 'Item'
    }
  }

  const handleAdd = async () => {
    setIsSubmitting(true)
    try {
      if (activeTab === 'entity-types') {
        await api.post('/master/entity-types', { name: newItemName, is_active: true })
      } else if (activeTab === 'entities') {
        if (!/^\d{2}$/.test(newItemEntityCode)) {
          toast.error('Entity Code must be exactly 2 digits')
          setIsSubmitting(false)
          return
        }
        await api.post('/master/entities', { name: newItemName, entity_code: newItemEntityCode, is_active: true })
      } else if (activeTab === 'departments') {
        await api.post('/master/departments', { 
          name: newItemName, 
          entity_id: newItemEntityId, 
          is_active: true 
        })
      } else if (activeTab === 'categories') {
        await api.post('/master/categories', { 
          name: newItemName, 
          parent_id: newItemParentId || null 
        })
      } else if (activeTab === 'record-types' || activeTab === 'schemas') {
        await api.post('/master/record-types', { name: newItemName, description: 'Created via admin' })
      }
      toast.success(`${getAddLabel()} added successfully`)
      setNewItemName('')
      setNewItemParentId('')
      setShowAddModal(false)
      fetchMasterData()
    } catch (err) {
      toast.error(`Failed to add ${getAddLabel()}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = async () => {
    if (!selectedItem) return
    setIsSubmitting(true)
    try {
      const endpoint = activeTab === 'entity-types' ? 'entity-types' : 
                       activeTab === 'entities' ? 'entities' : 
                       activeTab === 'departments' ? 'departments' : 
                       activeTab === 'categories' ? 'categories' :
                       'record-types'
      
      const payload: any = { name: newItemName, is_active: true }
      if (activeTab === 'entities') {
        if (!/^\d{2}$/.test(newItemEntityCode)) {
          toast.error('Entity Code must be exactly 2 digits')
          setIsSubmitting(false)
          return
        }
        payload.entity_code = newItemEntityCode
      }
      if (activeTab === 'departments') payload.entity_id = newItemEntityId
      if (activeTab === 'categories') payload.parent_id = newItemParentId || null
      if (activeTab === 'record-types') payload.description = selectedItem.description

      await api.put(`/master/${endpoint}/${selectedItem.id}`, payload)
      
      toast.success(`${getAddLabel()} updated successfully`)
      setNewItemName('')
      setNewItemEntityCode('')
      setNewItemParentId('')
      setSelectedItem(null)
      setShowEditModal(false)
      fetchMasterData()
    } catch (err) {
      toast.error(`Failed to update ${getAddLabel()}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (item: any) => {
    if (!window.confirm(`Are you sure you want to delete this ${getAddLabel()}?`)) return
    try {
      const endpoint = activeTab === 'entity-types' ? 'entity-types' : 
                       activeTab === 'entities' ? 'entities' : 
                       activeTab === 'departments' ? 'departments' : 
                       activeTab === 'categories' ? 'categories' :
                       'record-types'
      
      await api.delete(`/master/${endpoint}/${item.id}`)
      toast.success(`${getAddLabel()} deleted successfully`)
      fetchMasterData()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || `Failed to delete ${getAddLabel()}`)
    }
  }

  const handleAddField = async () => {
    if (!selectedRt) return
    try {
      const payload: any = {
        name: newFieldName,
        label: newFieldLabel,
        field_type: newFieldType,
        is_required: newFieldRequired
      }

      if (newFieldType === 'enum' && newFieldOptions) {
        payload.validation_rules = {
          options: newFieldOptions.split(',').map(s => s.trim()).filter(s => s !== '')
        }
      }

      await api.post(`/master/record-types/${selectedRt.id}/fields`, payload)
      toast.success('Field added to schema')
      setShowFieldModal(false)
      setNewFieldName('')
      setNewFieldLabel('')
      setNewFieldOptions('')
      fetchMasterData()
    } catch (err) {
      toast.error('Failed to add field')
    }
  }

  const handleExport = () => {
    let headers: string[] = []
    let csvData: any[][] = []
    const filename = `${activeTab}_export_${new Date().getTime()}.csv`

    switch (activeTab) {
      case 'entity-types':
        headers = ['ID', 'Name', 'Status']
        csvData = entityTypes.map(i => [i.id, i.name, 'Active'])
        break
      case 'entities':
        headers = ['ID', 'Code', 'Name', 'Status']
        csvData = entities.map(i => [i.id, i.entity_code, i.name, 'Active'])
        break
      case 'departments':
        headers = ['ID', 'Name', 'Entity', 'Status']
        csvData = departments.map(i => [
          i.id, 
          i.name, 
          entities.find(e => e.id === i.entity_id)?.name || 'N/A', 
          'Active'
        ])
        break
      case 'categories':
        headers = ['ID', 'Name', 'Parent ID', 'Status']
        csvData = categories.map(i => [i.id, i.name, i.parent_id || 'Root', 'Active'])
        break
      case 'record-types':
      case 'schemas':
        headers = ['ID', 'Name', 'Fields Count', 'Status']
        csvData = recordTypes.map(i => [i.id, i.name, i.fields?.length || 0, 'Active'])
        break
    }

    const csvContent = [headers, ...csvData].map(e => e.join(",")).join("\n")
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Master Data Management</h1>
          <p className="text-muted-foreground mt-1 text-sm">Configure Entities, Departments, and Record Type Schemas.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 bg-muted text-muted-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-muted/80 transition-all border"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium shadow-sm hover:bg-primary/90 transition-all"
          >
            <Plus className="h-4 w-4" />
            Add {getAddLabel()}
          </button>
        </div>
      </div>

      <div className="flex gap-2 border-b pb-px">
        {[
          { id: 'entity-types', name: 'Entity Types', icon: MapPin },
          { id: 'entities', name: 'Entities', icon: Building2 },
          { id: 'departments', name: 'Departments', icon: Home },
          { id: 'categories', name: 'Categories', icon: FolderTree },
          { id: 'record-types', name: 'Record Types', icon: FileText },
          { id: 'schemas', name: 'Field Schemas', icon: Layout },
        ].map((tab) => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-6 py-3 text-sm font-medium transition-all border-b-2",
              activeTab === tab.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <tab.icon className="inline-block mr-2 h-4 w-4" />
            {tab.name}
          </button>
        ))}
      </div>

      <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : activeTab === 'schemas' ? (
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-4 border-r pr-8">
              <h3 className="font-bold text-sm uppercase tracking-widest text-muted-foreground mb-4">Record Types</h3>
              {recordTypes.map(rt => (
                <button
                  key={rt.id}
                  onClick={() => setSelectedRt(rt)}
                  className={cn(
                    "w-full text-left p-3 rounded-lg border transition-all flex items-center justify-between group",
                    selectedRt?.id === rt.id ? "bg-primary/5 border-primary ring-1 ring-primary/20" : "hover:border-primary/50"
                  )}
                >
                  <div>
                    <div className="font-bold text-sm">{rt.name}</div>
                    <div className="text-[10px] text-muted-foreground uppercase">{rt.fields?.length || 0} Custom Fields</div>
                  </div>
                  <ChevronRight className={cn("h-4 w-4 transition-transform", selectedRt?.id === rt.id ? "text-primary translate-x-1" : "text-muted-foreground")} />
                </button>
              ))}
            </div>
            
            <div className="md:col-span-2">
              {selectedRt ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-left-2 duration-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold">{selectedRt.name} Schema</h3>
                      <p className="text-xs text-muted-foreground mt-1">Fields assigned to this record type definition.</p>
                    </div>
                    <button 
                      onClick={() => setShowFieldModal(true)}
                      className="flex items-center gap-1.5 bg-muted hover:bg-muted-foreground/10 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Field
                    </button>
                  </div>

                  <div className="space-y-2">
                    {selectedRt.fields?.map((f: any) => (
                      <div key={f.id} className="flex items-center justify-between p-4 bg-muted/20 border rounded-xl group">
                        <div className="flex items-center gap-4">
                          <div className="bg-background p-2 rounded-lg border shadow-sm">
                            <Settings2 className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <div className="font-bold text-sm flex items-center gap-2">
                              {f.label}
                              {f.is_required && <span className="text-[9px] bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded uppercase font-black">Required</span>}
                            </div>
                            <div className="text-[10px] text-muted-foreground font-mono flex items-center gap-2">
                              <span>KEY: {f.name}</span>
                              <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                              <span className="uppercase">{f.field_type}</span>
                            </div>
                          </div>
                        </div>
                        <button className="opacity-0 group-hover:opacity-100 p-2 text-muted-foreground hover:text-rose-600 transition-all">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    {(!selectedRt.fields || selectedRt.fields.length === 0) && (
                      <div className="text-center py-12 border-2 border-dashed rounded-2xl">
                        <Layout className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">No custom fields defined for this record type.</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-50 py-24">
                  <div className="bg-muted p-4 rounded-full mb-4">
                    <Layout className="h-8 w-8" />
                  </div>
                  <h3 className="font-bold">Select a Record Type</h3>
                  <p className="text-xs max-w-[200px] mt-1 mx-auto">Pick a definition from the left to manage its metadata schema.</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-muted/50 border-b font-bold text-muted-foreground">
                <tr>
                  <th className="px-6 py-4">Name</th>
                  {(activeTab === 'departments' || activeTab === 'categories') && (
                    <th className="px-6 py-4">{activeTab === 'departments' ? 'Parent Entity' : 'Parent Category'}</th>
                  )}
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(
                  activeTab === 'entities' ? entities : 
                  activeTab === 'entity-types' ? entityTypes : 
                  activeTab === 'record-types' ? recordTypes :
                  activeTab === 'categories' ? categories :
                  departments
                ).map((item) => (
                  <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-medium">
                      {activeTab === 'categories' && item.parent_id && <span className="text-muted-foreground mr-2">—</span>}
                      {item.name}
                      {activeTab === 'entities' && <span className="ml-2 text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{item.entity_code}</span>}
                    </td>
                    {activeTab === 'departments' && (
                      <td className="px-6 py-4">
                        <span className="text-xs bg-muted px-2 py-1 rounded">
                          {entities.find(e => e.id === item.entity_id)?.name || 'N/A'}
                        </span>
                      </td>
                    )}
                    {activeTab === 'categories' && (
                      <td className="px-6 py-4">
                        <span className="text-xs bg-muted px-2 py-1 rounded">
                          {categories.find(c => c.id === item.parent_id)?.name || 'None (Root)'}
                        </span>
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-emerald-600">
                        <CheckCircle2 className="h-3 w-3" /> Active
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => {
                            setSelectedItem(item)
                            setNewItemName(item.name)
                            if (activeTab === 'departments') setNewItemEntityId(item.entity_id)
                            if (activeTab === 'categories') setNewItemParentId(item.parent_id || '')
                            setShowEditModal(true)
                          }}
                          className="p-1.5 hover:bg-muted rounded transition-colors text-muted-foreground"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button 
                          onClick={() => handleDelete(item)}
                          className="p-1.5 hover:bg-muted rounded transition-colors text-rose-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-md rounded-2xl border shadow-2xl p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">Add New {getAddLabel()}</h3>
              <button onClick={() => setShowAddModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-muted-foreground">Name</label>
                <input 
                  type="text" 
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="w-full rounded-lg border bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Enter name..."
                />
              </div>

              {activeTab === 'entities' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Entity Code (2 Digits)</label>
                  <input 
                    type="text" 
                    maxLength={2}
                    value={newItemEntityCode}
                    onChange={(e) => setNewItemEntityCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full rounded-lg border bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 font-mono"
                    placeholder="e.g. 10"
                  />
                </div>
              )}

              {activeTab === 'departments' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Parent Entity</label>
                  <select 
                    value={newItemEntityId}
                    onChange={(e) => setNewItemEntityId(e.target.value)}
                    className="w-full rounded-lg border bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">Select Entity...</option>
                    {entities.map(e => (
                      <option key={e.id} value={e.id}>{e.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {activeTab === 'categories' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Parent Category</label>
                  <select 
                    value={newItemParentId}
                    onChange={(e) => setNewItemParentId(e.target.value)}
                    className="w-full rounded-lg border bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">None (Root Category)</option>
                    {categories.filter(c => c.id !== selectedItem?.id).map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="pt-4 flex gap-3">
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border rounded-lg text-sm font-medium hover:bg-muted"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAdd}
                  disabled={!newItemName || isSubmitting}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium shadow-sm hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save Entry
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-md rounded-2xl border shadow-2xl p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">Edit {getAddLabel()}</h3>
              <button onClick={() => { setShowEditModal(false); setSelectedItem(null); setNewItemName(''); }} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-muted-foreground">Name</label>
                <input 
                  type="text" 
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="w-full rounded-lg border bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Enter name..."
                />
              </div>

              {activeTab === 'entities' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Entity Code (2 Digits)</label>
                  <input 
                    type="text" 
                    maxLength={2}
                    value={newItemEntityCode}
                    onChange={(e) => setNewItemEntityCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full rounded-lg border bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 font-mono"
                    placeholder="e.g. 10"
                  />
                </div>
              )}

              {activeTab === 'departments' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Parent Entity</label>
                  <select 
                    value={newItemEntityId}
                    onChange={(e) => setNewItemEntityId(e.target.value)}
                    className="w-full rounded-lg border bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">Select Entity...</option>
                    {entities.map(e => (
                      <option key={e.id} value={e.id}>{e.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {activeTab === 'categories' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Parent Category</label>
                  <select 
                    value={newItemParentId}
                    onChange={(e) => setNewItemParentId(e.target.value)}
                    className="w-full rounded-lg border bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">None (Root Category)</option>
                    {categories.filter(c => c.id !== selectedItem?.id).map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="pt-4 flex gap-3">
                <button 
                  onClick={() => { setShowEditModal(false); setSelectedItem(null); setNewItemName(''); }}
                  className="flex-1 px-4 py-2 border rounded-lg text-sm font-medium hover:bg-muted"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleEdit}
                  disabled={!newItemName || isSubmitting}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium shadow-sm hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Update Entry
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Field Modal */}
      {showFieldModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-md rounded-2xl border shadow-2xl p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">Add Custom Field to {selectedRt.name}</h3>
              <button onClick={() => setShowFieldModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-muted-foreground">Display Label</label>
                <input 
                  type="text" 
                  value={newFieldLabel}
                  onChange={(e) => setNewFieldLabel(e.target.value)}
                  className="w-full rounded-lg border bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="e.g. Account Number"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-muted-foreground">Field Key (Permanent)</label>
                <input 
                  type="text" 
                  value={newFieldName}
                  onChange={(e) => setNewFieldName(e.target.value.toLowerCase().replace(/ /g, '_'))}
                  className="w-full rounded-lg border bg-background px-4 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="e.g. account_number"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-muted-foreground">Data Type</label>
                <select 
                  value={newFieldType}
                  onChange={(e) => setNewFieldType(e.target.value)}
                  className="w-full rounded-lg border bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="text">Short Text</option>
                  <option value="textarea">Paragraph</option>
                  <option value="number">Number</option>
                  <option value="date">Date</option>
                  <option value="boolean">Yes/No Toggle</option>
                  <option value="enum">Dropdown (Select One)</option>
                  <option value="user">User Picker</option>
                  <option value="link">Web Link (URL)</option>
                </select>
              </div>

              {newFieldType === 'enum' && (
                <div className="space-y-1.5 animate-in slide-in-from-top-1 duration-200">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Options (Comma separated)</label>
                  <input 
                    type="text" 
                    value={newFieldOptions}
                    onChange={(e) => setNewFieldOptions(e.target.value)}
                    className="w-full rounded-lg border bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="e.g. High, Medium, Low"
                  />
                </div>
              )}

              <div className="flex items-center gap-2 py-2">
                <input 
                  type="checkbox" 
                  id="required"
                  checked={newFieldRequired}
                  onChange={(e) => setNewFieldRequired(e.target.checked)}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor="required" className="text-sm font-medium">Mandatory Field</label>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  onClick={() => setShowFieldModal(false)}
                  className="flex-1 px-4 py-2 border rounded-lg text-sm font-medium hover:bg-muted"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAddField}
                  disabled={!newFieldName || !newFieldLabel}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium shadow-sm hover:bg-primary/90 disabled:opacity-50"
                >
                  Add Field
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
