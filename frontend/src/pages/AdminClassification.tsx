import React, { useState, useEffect } from 'react'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import { Download, Plus, FolderTree, Workflow, ChevronDown, ChevronRight, Trash2, Loader2, X, AlertCircle, Sparkles } from 'lucide-react'

interface Category {
  id: string
  name: string
  parent_id?: string | null
  children?: Category[]
}

interface Rule {
  id: string
  name: string
  condition: {
    field: string
    operator: string
    value: string
  }
  action: {
    type: string
    value: string
  }
  priority: number
  is_active: boolean
}

export default function AdminClassification() {
  const [activeTab, setActiveTab] = useState('categories')
  const [categories, setCategories] = useState<Category[]>([])
  const [rules, setRules] = useState<Rule[]>([])
  const [loading, setLoading] = useState(true)
  const [discoveries, setDiscoveries] = useState<{keyword: string, count: number}[]>([])
  const [simulation, setSimulation] = useState<{total_count: number, sample_records: string[]} | null>(null)

  // Modal states
  const [showModal, setShowModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Category Modal State
  const [catName, setCatName] = useState('')
  const [catParentId, setCatParentId] = useState<string | null>(null)

  // Rule Modal State
  const [ruleName, setRuleName] = useState('')
  const [ruleField, setRuleField] = useState('description')
  const [ruleOp, setRuleOperator] = useState('contains')
  const [ruleVal, setRuleValue] = useState('')
  const [ruleActionType, setRuleActionType] = useState('SET_CATEGORY')
  const [ruleActionVal, setRuleActionValue] = useState('')
  const [rulePriority, setRulePriority] = useState(0)
  const [applyRetroactive, setApplyRetroactive] = useState(false)

  const fetchDiscoveries = async () => {
    try {
      const res = await api.get('/master/classification/discover')
      setDiscoveries(res.data)
    } catch (_err) {
      console.error('Discovery failed')
    }
  }

  const fetchData = async () => {
    try {
      const [cRes, rRes] = await Promise.all([
        api.get('/master/categories'),
        api.get('/master/classification-rules')
      ])
      setCategories(cRes.data)
      setRules(rRes.data)
      if (activeTab === 'rules') await fetchDiscoveries()
    } catch (_err) {
      console.error('Failed to fetch classification data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await fetchData()
    }
    init()
  }, [])

  useEffect(() => {
    if (activeTab === 'rules' && showModal && ruleVal.length > 2) {
      const timer = setTimeout(async () => {
        try {
          const res = await api.post('/master/classification/simulate', {
            field: ruleField,
            operator: ruleOp,
            value: ruleVal
          })
          setSimulation(res.data)
        } catch (_err) {
          setSimulation(null)
        }
      }, 500)
      return () => clearTimeout(timer)
    } else {
      setSimulation(null)
    }
  }, [ruleVal, ruleField, ruleOp, activeTab, showModal])

  const handleExport = () => {
    let headers: string[] = []
    let csvData: (string | number)[][] = []
    const filename = `${activeTab}_export_${new Date().getTime()}.csv`

    if (activeTab === 'categories') {
      headers = ['ID', 'Name', 'Parent ID']
      const flatten = (items: Category[]) => {
        let rows: (string | number)[][] = []
        items.forEach(item => {
          rows.push([item.id, item.name, item.parent_id || 'Root'])
          if (item.children) rows = [...rows, ...flatten(item.children)]
        })
        return rows
      }
      csvData = flatten(categories)
    } else {
      headers = ['Rule Name', 'Field', 'Operator', 'Value', 'Action Type', 'Action Value', 'Priority']
      csvData = rules.map(r => [
        r.name,
        r.condition.field,
        r.condition.operator,
        r.condition.value,
        r.action.type,
        r.action.value,
        r.priority
      ])
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

  const resetForms = () => {
    setCatName('')
    setCatParentId(null)
    setRuleName('')
    setRuleField('description')
    setRuleOperator('contains')
    setRuleValue('')
    setRuleActionType('SET_CATEGORY')
    setRuleActionValue('')
    setRulePriority(0)
    setApplyRetroactive(false)
    setShowModal(false)
  }

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await api.post('/master/categories', { name: catName, parent_id: catParentId })
      resetForms()
      await fetchData()
    } catch (_err) {
      alert('Failed to add category')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const payload = {
        name: ruleName,
        condition: { field: ruleField, operator: ruleOp, value: ruleVal },
        action: { type: ruleActionType, value: ruleActionVal },
        priority: rulePriority,
        is_active: true,
        apply_retroactive: applyRetroactive
      }
      await api.post('/master/classification-rules', payload)
      resetForms()
      await fetchData()
    } catch (_err) {
      alert('Failed to add rule')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category? Sub-categories will also be deleted.')) return
    try {
      await api.delete(`/master/categories/${id}`)
      await fetchData()
    } catch (_err) {
      alert('Failed to delete category')
    }
  }

  const handleDeleteRule = async (id: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return
    try {
      await api.delete(`/master/classification-rules/${id}`)
      await fetchData()
    } catch (_err) {
      alert('Failed to delete rule')
    }
  }

  const openModal = (parentId: string | null = null) => {
    if (activeTab === 'categories') setCatParentId(parentId)
    setShowModal(true)
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Classification & Tags</h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage category taxonomy and auto-classification logic.</p>
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
            onClick={() => openModal()}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium shadow-sm hover:bg-primary/90 transition-all"
          >
            <Plus className="h-4 w-4" />
            Add {activeTab === 'categories' ? 'Category' : 'Rule'}
          </button>
        </div>
      </div>

      <div className="flex gap-2 border-b pb-px">
        <button 
          onClick={() => setActiveTab('categories')}
          className={cn(
            "px-6 py-3 text-sm font-medium transition-all border-b-2",
            activeTab === 'categories' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <FolderTree className="inline-block mr-2 h-4 w-4" />
          Taxonomy Tree
        </button>
        <button 
          onClick={() => {
            setActiveTab('rules');
            fetchDiscoveries();
          }}
          className={cn(
            "px-6 py-3 text-sm font-medium transition-all border-b-2",
            activeTab === 'rules' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Workflow className="inline-block mr-2 h-4 w-4" />
          Auto-Classification Rules
        </button>
      </div>

      {activeTab === 'rules' && discoveries.length > 0 && (
        <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 flex flex-wrap items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-500">
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider mr-2">
            <Sparkles className="h-4 w-4" />
            Discovery
          </div>
          {discoveries.map((disc, idx) => (
            <button 
              key={idx}
              onClick={() => {
                setRuleValue(disc.keyword);
                openModal();
              }}
              className="bg-background border rounded-full px-3 py-1 text-xs flex items-center gap-2 hover:border-primary hover:text-primary transition-all shadow-sm group"
            >
              <span className="font-semibold">{disc.keyword}</span>
              <span className="text-muted-foreground group-hover:text-primary/70 bg-muted px-1.5 py-0.5 rounded-full text-[10px]">{disc.count}</span>
            </button>
          ))}
        </div>
      )}

      <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : activeTab === 'categories' ? (
          <div className="p-6 space-y-4">
            {categories.map((cat) => (
              <div key={cat.id} className="space-y-2">
                <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg border group">
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  <span className="font-bold">{cat.name}</span>
                  <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openModal(cat.id)} className="p-1 hover:text-primary" title="Add Sub-category"><Plus className="h-3.5 w-3.5" /></button>
                    <button onClick={() => handleDeleteCategory(cat.id)} className="p-1 hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
                <div className="ml-6 space-y-2 border-l pl-4">
                  {cat.children?.map((child: Category) => (
                    <div key={child.id} className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded transition-colors group">
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm">{child.name}</span>
                      <button onClick={() => handleDeleteCategory(child.id)} className="ml-auto p-1 opacity-0 group-hover:opacity-100 hover:text-rose-600 transition-opacity">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-muted/50 border-b font-bold text-muted-foreground">
                <tr>
                  <th className="px-6 py-4">Rule Name</th>
                  <th className="px-6 py-4">Condition</th>
                  <th className="px-6 py-4">Action</th>
                  <th className="px-6 py-4 text-center">Priority</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold">{rule.name}</div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Active</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100 font-mono">{rule.condition.field}</span>
                        <span className="text-muted-foreground">{rule.condition.operator}</span>
                        <span className="font-bold">"{rule.condition.value}"</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-100 uppercase font-bold">{rule.action.type.replace('_', ' ')}</span>
                        <span className="font-medium text-primary">
                          {rule.action.type === 'SET_CATEGORY' 
                            ? categories.flatMap(c => [c, ...(c.children || [])]).find(c => c.id === rule.action.value)?.name || rule.action.value
                            : rule.action.value}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="bg-muted px-2 py-1 rounded font-mono text-xs font-bold">{rule.priority}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleDeleteRule(rule.id)}
                        className="p-2 hover:bg-rose-50 hover:text-rose-600 rounded-md transition-colors text-muted-foreground"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Shared Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-md rounded-2xl border shadow-2xl p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2">
                {activeTab === 'categories' ? <FolderTree className="h-5 w-5 text-primary" /> : <Workflow className="h-5 w-5 text-primary" />}
                {activeTab === 'categories' ? (catParentId ? 'Add Sub-category' : 'Add New Category') : 'Add Auto-Classification Rule'}
              </h3>
              <button onClick={resetForms} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {activeTab === 'categories' ? (
              <form onSubmit={handleAddCategory} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Category Name</label>
                  <input 
                    type="text" required autoFocus
                    value={catName}
                    onChange={(e) => setCatName(e.target.value)}
                    className="w-full rounded-lg border bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="e.g. Legal Documents"
                  />
                </div>
                <button type="submit" disabled={isSubmitting} className="w-full bg-primary text-primary-foreground py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 shadow-sm hover:bg-primary/90 transition-all">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Category"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleAddRule} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Rule Name</label>
                  <input 
                    type="text" required
                    value={ruleName}
                    onChange={(e) => setRuleName(e.target.value)}
                    className="w-full rounded-lg border bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="e.g. Identify Invoices"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Field</label>
                    <select value={ruleField} onChange={e => setRuleField(e.target.value)} className="w-full rounded-lg border bg-background px-3 py-2 text-sm">
                      <option value="description">Description</option>
                      <option value="entity">Entity</option>
                      <option value="department">Department</option>
                      <option value="location">Location</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Operator</label>
                    <select value={ruleOp} onChange={e => setRuleOperator(e.target.value)} className="w-full rounded-lg border bg-background px-3 py-2 text-sm">
                      <option value="contains">Contains</option>
                      <option value="equals">Equals</option>
                      <option value="starts_with">Starts With</option>
                      <option value="ends_with">Ends With</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Value to match</label>
                  <input 
                    type="text" required
                    value={ruleVal}
                    onChange={(e) => setRuleValue(e.target.value)}
                    className="w-full rounded-lg border bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="e.g. INVOICE"
                  />
                </div>

                {simulation && (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-2 animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase text-primary flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        Simulation Impact
                      </span>
                      <span className="text-xs font-bold text-primary">{simulation.total_count} records affected</span>
                    </div>
                    {simulation.sample_records.length > 0 && (
                      <div className="space-y-1">
                        {simulation.sample_records.map((sample, i) => (
                          <div key={i} className="text-[10px] text-muted-foreground truncate bg-background/50 px-2 py-1 rounded border border-primary/10 italic">
                            "{sample}"
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="border-t pt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase text-primary">Action</label>
                      <select value={ruleActionType} onChange={e => setRuleActionType(e.target.value)} className="w-full rounded-lg border bg-background px-3 py-2 text-sm">
                        <option value="SET_CATEGORY">Set Category</option>
                        <option value="ADD_TAGS">Add Tags</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase text-muted-foreground">Priority</label>
                      <input 
                        type="number" value={rulePriority} onChange={e => setRulePriority(parseInt(e.target.value))}
                        className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-primary">Resulting Value</label>
                    {ruleActionType === 'SET_CATEGORY' ? (
                      <select required value={ruleActionVal} onChange={e => setRuleActionValue(e.target.value)} className="w-full rounded-lg border bg-background px-3 py-2 text-sm">
                        <option value="">Select Category...</option>
                        {categories.flatMap(c => [c, ...(c.children || [])]).map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    ) : (
                      <input 
                        type="text" required placeholder="e.g. urgent, finance"
                        value={ruleActionVal} onChange={e => setRuleActionValue(e.target.value)}
                        className="w-full rounded-lg border bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <input 
                      type="checkbox" id="retroactive"
                      checked={applyRetroactive}
                      onChange={(e) => setApplyRetroactive(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <label htmlFor="retroactive" className="text-xs font-medium text-foreground cursor-pointer select-none">
                      Apply retroactively to existing records
                    </label>
                  </div>
                </div>

                <button type="submit" disabled={isSubmitting} className="w-full bg-primary text-primary-foreground py-2 mt-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 shadow-sm hover:bg-primary/90 transition-all">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Rule"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 flex gap-4">
        <AlertCircle className="h-6 w-6 text-amber-600 shrink-0" />
        <div>
          <h4 className="text-amber-800 font-bold text-sm">Pro Tip: Auto-Classification</h4>
          <p className="text-amber-700 text-xs mt-1 leading-relaxed">
            Rules are processed instantly when a record is created or updated. High priority rules (larger numbers) are evaluated first. If multiple rules apply, their actions are cumulative.
          </p>
        </div>
      </div>
    </div>
  )
}
