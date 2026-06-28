import { useState, useEffect } from 'react'
import {
  Warehouse as WarehouseIcon,
  Plus,
  MapPin,
  Box,
  Layers,
  ChevronDown,
  ChevronRight,
  Loader2,
  Sparkles,
  BarChart3,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import api from '@/lib/api'
import { toast } from 'sonner'

interface Bin { id: string; bin_code: string; is_occupied: boolean; record_id: string | null; pos_x: number | null; pos_y: number | null }
interface Shelf { id: string; level: number; max_capacity: number; bins: Bin[] }
interface Aisle { id: string; label: string; shelves: Shelf[] }
interface Zone { id: string; name: string; description: string; aisles: Aisle[] }
interface WarehouseData { id: string; name: string; address: string; is_active: boolean; zones: Zone[] }
interface Stats { total_bins: number; occupied_bins: number; empty_bins: number; occupancy_rate: number }
interface Recommendation { bin_id: string; bin_code: string; score: number; location: string; distance_to_entry: number }

export default function Warehouse() {
  const [warehouses, setWarehouses] = useState<WarehouseData[]>([])
  const [selected, setSelected] = useState<WarehouseData | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [expandedZones, setExpandedZones] = useState<Set<string>>(new Set())
  const [expandedAisles, setExpandedAisles] = useState<Set<string>>(new Set())

  // Forms
  const [showNewWarehouse, setShowNewWarehouse] = useState(false)
  const [whName, setWhName] = useState('')
  const [whAddress, setWhAddress] = useState('')

  // Recommend bin
  const [recDept, setRecDept] = useState('')
  const [recommendation, setRecommendation] = useState<{ recommendation: Recommendation | null; reason: string } | null>(null)
  const [isRecommending, setIsRecommending] = useState(false)

  // Layout Builder State
  const [modalType, setModalType] = useState<'zone' | 'aisle' | 'shelf' | 'bin' | null>(null)
  const [parentId, setParentId] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [zoneForm, setZoneForm] = useState({ name: '', description: '' })
  const [aisleForm, setAisleForm] = useState({ label: '' })
  const [shelfForm, setShelfForm] = useState({ level: '', maxCapacity: 100 })
  const [binForm, setBinForm] = useState({ binCode: '', posX: '', posY: '' })

  const fetchWarehouses = async () => {
    try {
      const res = await api.get('/warehouse/')
      setWarehouses(res.data)
      if (res.data.length > 0) {
        const currentSelectedId = selected?.id || res.data[0].id;
        const updatedSelected = res.data.find((w: WarehouseData) => w.id === currentSelectedId) || res.data[0];
        setSelected(updatedSelected);
        fetchStats(updatedSelected.id);
      }
    } catch {
      toast.error('Failed to load warehouses')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchStats = async (id: string) => {
    try {
      const res = await api.get(`/warehouse/${id}/stats`)
      setStats(res.data)
    } catch { /* ignore */ }
  }

  useEffect(() => { fetchWarehouses() }, [])

  const handleSelectWarehouse = (wh: WarehouseData) => {
    setSelected(wh)
    fetchStats(wh.id)
    setRecommendation(null)
  }

  const handleCreateWarehouse = async () => {
    if (!whName.trim()) return
    try {
      await api.post('/warehouse/', { name: whName, address: whAddress })
      toast.success('Warehouse created')
      setShowNewWarehouse(false)
      setWhName('')
      setWhAddress('')
      fetchWarehouses()
    } catch {
      toast.error('Failed to create warehouse')
    }
  }

  const handleRecommend = async () => {
    if (!recDept.trim() || !selected) return
    setIsRecommending(true)
    try {
      const res = await api.get('/warehouse/recommend', {
        params: { department: recDept, entry_x: 0, entry_y: 0 }
      })
      setRecommendation(res.data)
    } catch {
      toast.error('Could not get recommendation')
    } finally {
      setIsRecommending(false)
    }
  }

  const handleAddZone = async () => {
    if (!zoneForm.name.trim() || !selected) return
    setIsSubmitting(true)
    try {
      await api.post(`/warehouse/${selected.id}/zones`, {
        name: zoneForm.name,
        description: zoneForm.description || null
      })
      toast.success('Zone created successfully')
      setModalType(null)
      setZoneForm({ name: '', description: '' })
      await fetchWarehouses()
    } catch {
      toast.error('Failed to create zone')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddAisle = async () => {
    if (!aisleForm.label.trim() || !parentId) return
    setIsSubmitting(true)
    try {
      await api.post(`/warehouse/zones/${parentId}/aisles`, {
        label: aisleForm.label
      })
      toast.success('Aisle created successfully')
      setModalType(null)
      setAisleForm({ label: '' })
      await fetchWarehouses()
    } catch {
      toast.error('Failed to create aisle')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddShelf = async () => {
    if (!shelfForm.level || !parentId) return
    setIsSubmitting(true)
    try {
      await api.post(`/warehouse/aisles/${parentId}/shelves`, {
        level: parseInt(shelfForm.level),
        max_capacity: shelfForm.maxCapacity
      })
      toast.success('Shelf created successfully')
      setModalType(null)
      setShelfForm({ level: '', maxCapacity: 100 })
      await fetchWarehouses()
    } catch {
      toast.error('Failed to create shelf')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddBin = async () => {
    if (!binForm.binCode.trim() || !parentId) return
    setIsSubmitting(true)
    try {
      await api.post(`/warehouse/shelves/${parentId}/bins`, {
        bin_code: binForm.binCode,
        pos_x: binForm.posX ? parseFloat(binForm.posX) : null,
        pos_y: binForm.posY ? parseFloat(binForm.posY) : null
      })
      toast.success('Bin created successfully')
      setModalType(null)
      setBinForm({ binCode: '', posX: '', posY: '' })
      await fetchWarehouses()
    } catch {
      toast.error('Failed to create bin')
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleZone = (id: string) => {
    setExpandedZones(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleAisle = (id: string) => {
    setExpandedAisles(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const totalBins = (wh: WarehouseData) =>
    wh.zones.reduce((a, z) =>
      a + z.aisles.reduce((b, ai) =>
        b + ai.shelves.reduce((c, s) => c + s.bins.length, 0), 0), 0)

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <WarehouseIcon className="h-8 w-8 text-primary" />
            Warehouse Layout
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage spatial storage layouts and get optimized bin recommendations.
          </p>
        </div>
        <button
          onClick={() => setShowNewWarehouse(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 shadow-sm"
        >
          <Plus className="h-4 w-4" />
          New Warehouse
        </button>
      </div>

      {showNewWarehouse && (
        <div className="bg-card border rounded-xl p-5 space-y-4 animate-in fade-in slide-in-from-top-4">
          <h3 className="font-semibold">New Warehouse</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase">Name *</label>
              <input value={whName} onChange={e => setWhName(e.target.value)}
                placeholder="e.g. Main Storage Vault"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase">Address</label>
              <input value={whAddress} onChange={e => setWhAddress(e.target.value)}
                placeholder="e.g. 123 Storage Lane"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleCreateWarehouse}
              className="bg-primary text-primary-foreground px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary/90">
              Create
            </button>
            <button onClick={() => setShowNewWarehouse(false)}
              className="border px-5 py-2 rounded-lg text-sm font-medium hover:bg-accent">
              Cancel
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : warehouses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-card border rounded-xl border-dashed">
          <WarehouseIcon className="h-12 w-12 text-muted-foreground/20 mb-4" />
          <p className="text-muted-foreground">No warehouses configured yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar: Warehouse List */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Warehouses</h3>
            {warehouses.map(wh => (
              <button key={wh.id} onClick={() => handleSelectWarehouse(wh)}
                className={cn(
                  "w-full text-left bg-card border rounded-xl p-4 hover:shadow-md transition-all",
                  selected?.id === wh.id && "border-primary ring-1 ring-primary/20"
                )}>
                <div className="font-semibold text-sm">{wh.name}</div>
                {wh.address && <div className="text-xs text-muted-foreground mt-0.5">{wh.address}</div>}
                <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                  <span>{wh.zones.length} zones</span>
                  <span>{totalBins(wh)} bins</span>
                </div>
              </button>
            ))}
          </div>

          {/* Main: selected warehouse */}
          {selected && (
            <div className="lg:col-span-3 space-y-5">
              {/* Stats Row */}
              {stats && (
                <div className="grid grid-cols-4 gap-4">
                  {[
                    { label: 'Total Bins', value: stats.total_bins, icon: Box },
                    { label: 'Occupied', value: stats.occupied_bins, icon: Layers },
                    { label: 'Available', value: stats.empty_bins, icon: MapPin },
                    { label: 'Occupancy', value: `${stats.occupancy_rate}%`, icon: BarChart3 },
                  ].map(s => (
                    <div key={s.label} className="bg-card border rounded-xl p-4 text-center">
                      <s.icon className="h-4 w-4 text-primary mx-auto mb-1" />
                      <div className="text-xl font-black">{s.value}</div>
                      <div className="text-[10px] uppercase font-bold text-muted-foreground mt-0.5">{s.label}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Bin Recommendation */}
              <div className="bg-gradient-to-r from-violet-500/5 to-indigo-500/5 border border-violet-200/50 rounded-xl p-5 space-y-3">
                <h3 className="font-semibold flex items-center gap-2 text-sm">
                  <Sparkles className="h-4 w-4 text-violet-500" />
                  Layout Optimization — Recommend Bin
                </h3>
                <div className="flex gap-3">
                  <input
                    value={recDept}
                    onChange={e => setRecDept(e.target.value)}
                    placeholder="Department name (e.g. Finance)"
                    className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <button
                    onClick={handleRecommend}
                    disabled={isRecommending || !recDept.trim()}
                    className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50"
                  >
                    {isRecommending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    Recommend
                  </button>
                </div>
                {recommendation && (
                  <div className="animate-in fade-in">
                    {recommendation.recommendation ? (
                      <div className="bg-white dark:bg-card border border-violet-200 rounded-lg p-4 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-violet-700">{recommendation.recommendation.bin_code}</span>
                          <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-medium">Optimal</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{recommendation.recommendation.location}</p>
                        <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                          <span>Distance to entry: {recommendation.recommendation.distance_to_entry}</span>
                          <span>Score: {recommendation.recommendation.score}</span>
                        </div>
                        <p className="text-xs text-muted-foreground italic mt-1">{recommendation.reason}</p>
                      </div>
                    ) : (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
                        No empty bins available in this warehouse.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Layout Tree */}
              <div className="bg-card border rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b bg-muted/20 font-semibold text-sm flex items-center justify-between">
                  <span>Layout: {selected.name}</span>
                  <button
                    onClick={() => {
                      setParentId('');
                      setModalType('zone');
                    }}
                    className="flex items-center gap-1 text-xs bg-primary text-primary-foreground px-2.5 py-1 rounded hover:bg-primary/95 transition-all shadow-sm font-medium"
                  >
                    <Plus className="h-3 w-3" />
                    Add Zone
                  </button>
                </div>
                <div className="divide-y">
                  {selected.zones.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground text-sm">
                      No zones configured. Click "Add Zone" to begin creating your layout.
                    </div>
                  ) : (
                    selected.zones.map(zone => (
                      <div key={zone.id}>
                        <div
                          onClick={() => toggleZone(zone.id)}
                          className="w-full flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors group cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            {expandedZones.has(zone.id)
                              ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            }
                            <Layers className="h-4 w-4 text-primary" />
                            <span className="font-semibold text-sm">{zone.name}</span>
                            {zone.description && (
                              <span className="text-xs text-muted-foreground">— {zone.description}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                            <span className="text-xs text-muted-foreground">{zone.aisles.length} aisles</span>
                            <button
                              onClick={() => {
                                setParentId(zone.id);
                                setModalType('aisle');
                              }}
                              className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded border border-primary/20 hover:bg-primary/20 transition-all font-bold uppercase"
                            >
                              <Plus className="h-2.5 w-2.5" />
                              Add Aisle
                            </button>
                          </div>
                        </div>

                        {expandedZones.has(zone.id) && (
                          <div className="pl-8 border-t bg-muted/5">
                            {zone.aisles.map(aisle => (
                              <div key={aisle.id} className="border-b last:border-0">
                                <div
                                  onClick={() => toggleAisle(aisle.id)}
                                  className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors group cursor-pointer"
                                >
                                  <div className="flex items-center gap-3">
                                    {expandedAisles.has(aisle.id)
                                      ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                      : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                                    }
                                    <MapPin className="h-3.5 w-3.5 text-amber-500" />
                                    <span className="text-sm font-medium">Aisle {aisle.label}</span>
                                  </div>
                                  <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                                    <span className="text-xs text-muted-foreground">
                                      {aisle.shelves.length} shelves
                                    </span>
                                    <button
                                      onClick={() => {
                                        setParentId(aisle.id);
                                        setModalType('shelf');
                                      }}
                                      className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-[10px] bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded border border-amber-500/20 hover:bg-amber-500/20 transition-all font-bold uppercase"
                                    >
                                      <Plus className="h-2.5 w-2.5" />
                                      Add Shelf
                                    </button>
                                  </div>
                                </div>

                                {expandedAisles.has(aisle.id) && (
                                  <div className="pl-8 pb-2">
                                    {aisle.shelves.map(shelf => {
                                      const occupied = shelf.bins.filter(b => b.is_occupied).length
                                      return (
                                        <div key={shelf.id} className="py-2 border-b last:border-0 group/shelf">
                                          <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                              <Box className="h-3 w-3" />
                                              <span className="font-medium">Shelf Level {shelf.level}</span>
                                              <span>— {occupied}/{shelf.bins.length} occupied</span>
                                            </div>
                                            <button
                                              onClick={() => {
                                                setParentId(shelf.id);
                                                setModalType('bin');
                                              }}
                                              className="opacity-0 group-hover/shelf:opacity-100 flex items-center gap-1 text-[9px] bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded border border-emerald-500/20 hover:bg-emerald-500/20 transition-all font-bold uppercase"
                                            >
                                              <Plus className="h-2.5 w-2.5" />
                                              Add Bin
                                            </button>
                                          </div>
                                          <div className="flex flex-wrap gap-1.5">
                                            {shelf.bins.map(bin => (
                                              <span
                                                key={bin.id}
                                                title={bin.is_occupied ? `Record: ${bin.record_id}` : 'Empty'}
                                                className={cn(
                                                  "font-mono text-[10px] px-2 py-1 rounded border font-bold",
                                                  bin.is_occupied
                                                    ? "bg-primary/10 text-primary border-primary/20"
                                                    : "bg-muted text-muted-foreground border-border"
                                                )}
                                              >
                                                {bin.bin_code}
                                              </span>
                                            ))}
                                            {shelf.bins.length === 0 && (
                                              <span className="text-xs text-muted-foreground italic">No bins</span>
                                            )}
                                          </div>
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Configuration Modal */}
      {modalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-card border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b bg-muted/20 flex items-center justify-between">
              <h3 className="font-bold text-sm uppercase tracking-wider">
                {modalType === 'zone' && 'Add Spatial Zone'}
                {modalType === 'aisle' && 'Add Storage Aisle'}
                {modalType === 'shelf' && 'Add Shelf Level'}
                {modalType === 'bin' && 'Add Warehouse Bin'}
              </h3>
              <button 
                onClick={() => setModalType(null)} 
                className="text-muted-foreground hover:text-foreground rounded-full p-1 hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {modalType === 'zone' && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Zone Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Zone A, High Security Vault"
                      value={zoneForm.name}
                      onChange={e => setZoneForm({ ...zoneForm, name: e.target.value })}
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Description</label>
                    <input
                      type="text"
                      placeholder="e.g. Temperature controlled, financial records only"
                      value={zoneForm.description}
                      onChange={e => setZoneForm({ ...zoneForm, description: e.target.value })}
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={handleAddZone}
                      disabled={isSubmitting || !zoneForm.name.trim()}
                      className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                    >
                      {isSubmitting ? 'Creating...' : 'Create Zone'}
                    </button>
                  </div>
                </>
              )}

              {modalType === 'aisle' && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Aisle Label *</label>
                    <input
                      type="text"
                      placeholder="e.g. A, B, 01, 02"
                      value={aisleForm.label}
                      onChange={e => setAisleForm({ label: e.target.value })}
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={handleAddAisle}
                      disabled={isSubmitting || !aisleForm.label.trim()}
                      className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                    >
                      {isSubmitting ? 'Creating...' : 'Create Aisle'}
                    </button>
                  </div>
                </>
              )}

              {modalType === 'shelf' && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Shelf Level *</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="e.g. 1 (Ground), 2, 3"
                      value={shelfForm.level}
                      onChange={e => setShelfForm({ ...shelfForm, level: e.target.value })}
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Max Box Capacity</label>
                    <input
                      type="number"
                      min="1"
                      value={shelfForm.maxCapacity}
                      onChange={e => setShelfForm({ ...shelfForm, maxCapacity: parseInt(e.target.value) || 100 })}
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={handleAddShelf}
                      disabled={isSubmitting || !shelfForm.level}
                      className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                    >
                      {isSubmitting ? 'Creating...' : 'Create Shelf'}
                    </button>
                  </div>
                </>
              )}

              {modalType === 'bin' && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Bin Code *</label>
                    <input
                      type="text"
                      placeholder="e.g. A-1-1, BIN-042"
                      value={binForm.binCode}
                      onChange={e => setBinForm({ ...binForm, binCode: e.target.value })}
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground uppercase">Spatial X Coord</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="e.g. 1.5 (meters)"
                        value={binForm.posX}
                        onChange={e => setBinForm({ ...binForm, posX: e.target.value })}
                        className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground uppercase">Spatial Y Coord</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="e.g. 3.2 (meters)"
                        value={binForm.posY}
                        onChange={e => setBinForm({ ...binForm, posY: e.target.value })}
                        className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    X and Y coordinates represent physical distances from the entry point. The spatial routing engine uses these to compute retrieval travel optimization.
                  </p>
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={handleAddBin}
                      disabled={isSubmitting || !binForm.binCode.trim()}
                      className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                    >
                      {isSubmitting ? 'Creating...' : 'Create Bin'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
