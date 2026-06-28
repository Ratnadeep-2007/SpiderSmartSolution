import { useState, useEffect, useMemo, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Save, X, Loader2, Sparkles, MapPin, Layers, Check } from 'lucide-react'
import api from '@/lib/api'
import { cn } from '@/lib/utils'

// Core Required Fields Schema
const baseRecordSchema = z.object({
  entity_type_id: z.string().min(1, 'Entity Type is required'),
  entity_id: z.string().min(1, 'Entity is required'),
  department_id: z.string().min(1, 'Department is required'),
  entity: z.string().optional(),
  entity_code: z.string().optional(),
  department: z.string().optional(),
  location: z.string().min(1, 'Location is required').max(16, 'Location must be max 16 characters'),
  box_barcode: z.string().min(5, 'Box Barcode must be at least 5 characters').max(50, 'Box Barcode must be max 50 characters'),
  file_barcode: z.string().min(5, 'File Barcode must be at least 5 characters').max(50, 'File Barcode must be max 50 characters'),
  description: z.string().min(1, 'Description is required'),
  record_date: z.string().min(1, 'Date is required'),
  year: z.string().regex(/^\d{4}$/, 'Year must be exactly 4 digits'),
  record_type_id: z.string().optional().nullable().or(z.literal('')),
  category_id: z.string().optional().nullable().or(z.literal('')),
  custom_fields: z.record(z.string(), z.unknown()).default({}),
  tags: z.array(z.string()).default([]),
})

type RecordFormValues = {
  entity_type_id: string
  entity_id: string
  department_id: string
  entity?: string
  entity_code?: string
  department?: string
  location: string
  box_barcode: string
  file_barcode: string
  description: string
  record_date: string
  year: string
  record_type_id?: string | null
  category_id?: string | null
  custom_fields: Record<string, unknown>
  tags: string[]
}

interface RecordTypeField {
  id: string
  name: string
  label: string
  field_type: string
  is_required: boolean
  default_value?: string
  validation_rules?: {
    options?: string[]
    [key: string]: unknown
  }
}

interface RecordType {
  id: string
  name: string
  description?: string
  fields: RecordTypeField[]
}

interface Category {
  id: string
  name: string
  parent_id?: string
  children: Category[]
}

interface EntityType {
  id: string
  name: string
}

interface Entity {
  id: string
  name: string
  entity_code: string
}

interface Department {
  id: string
  name: string
}

interface User {
  id: string
  email: string
  user_id?: string
}

interface RecordFormProps {
  initialData?: Partial<RecordFormValues>
  onSubmit: (data: any) => void
  onCancel: () => void
  title: string
}

export default function RecordForm({ initialData, onSubmit, onCancel, title }: RecordFormProps) {
  const [recordTypes, setRecordTypes] = useState<RecordType[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [entityTypes, setEntityTypes] = useState<EntityType[]>([])
  const [entities, setEntities] = useState<Entity[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(initialData?.record_type_id || null)
  const [tagInput, setTagInput] = useState('')
  const isFirstRender = useRef(true)

  // Warehouse Spatial Layout States
  const [warehouses, setWarehouses] = useState<any[]>([])
  const [locationMode, setLocationMode] = useState<'ai' | 'manual' | 'custom'>('ai')
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('')
  const [selectedZoneId, setSelectedZoneId] = useState<string>('')
  const [selectedAisleId, setSelectedAisleId] = useState<string>('')
  const [selectedShelfId, setSelectedShelfId] = useState<string>('')
  const [selectedBinId, setSelectedBinId] = useState<string>('')
  const [oldBinId, setOldBinId] = useState<string>('')

  // AI Recommendation State
  const [aiRecommendation, setAiRecommendation] = useState<any>(null)
  const [isRecommending, setIsRecommending] = useState(false)

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [rtRes, catRes, etRes, eRes, uRes] = await Promise.all([
          api.get('/master/record-types'),
          api.get('/master/categories'),
          api.get('/master/entity-types'),
          api.get('/master/entities'),
          api.get('/master/users')
        ])
        setRecordTypes(rtRes.data)
        setCategories(catRes.data)
        setEntityTypes(etRes.data)
        setEntities(eRes.data)
        setUsers(uRes.data)
      } catch (err) {
        console.error('Failed to fetch metadata:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchMetadata()
  }, [])

  const selectedType = useMemo(() => 
    recordTypes.find(t => t.id === selectedTypeId),
    [selectedTypeId, recordTypes]
  )

  // Dynamically build the schema based on selected Record Type
  const dynamicSchema = useMemo(() => {
    if (!selectedType) return baseRecordSchema

    const customFieldsObj: Record<string, z.ZodTypeAny> = {}
    selectedType.fields.forEach(f => {
      let fieldSchema: z.ZodTypeAny
      
      switch (f.field_type) {
        case 'number': {
          fieldSchema = z.preprocess((val) => {
            if (val === '' || val === undefined || val === null) return null;
            const parsed = typeof val === 'string' ? parseFloat(val) : val;
            return isNaN(parsed as number) ? null : parsed;
          }, z.number({ message: 'Must be a number' }).nullable())
          break
        }
        case 'boolean': {
          fieldSchema = z.boolean()
          break
        }
        case 'date': {
          fieldSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
          break
        }
        case 'enum': {
          const options = f.validation_rules?.options || []
          fieldSchema = options.length > 0 ? z.enum(options as [string, ...string[]]) : z.string()
          break
        }
        case 'user':
        case 'link': {
          let s = z.string()
          if (f.field_type === 'link') s = s.url('Must be a valid URL')
          fieldSchema = s
          break
        }
        default: {
          fieldSchema = z.string()
        }
      }

      if (f.is_required) {
        if (f.field_type === 'text' || f.field_type === 'textarea' || f.field_type === 'link') {
          fieldSchema = (fieldSchema as z.ZodString).min(1, `${f.label} is required`)
        } else if (f.field_type === 'number') {
          fieldSchema = (fieldSchema as any).refine((val: any) => val !== null, `${f.label} is required`)
        }
      } else {
        fieldSchema = fieldSchema.optional().nullable().or(z.literal(''))
      }
      
      customFieldsObj[f.name] = fieldSchema
    })

    return baseRecordSchema.extend({
      custom_fields: z.object(customFieldsObj)
    })
  }, [selectedType])

  const defaultValues = useMemo(() => ({
    entity_type_id: '',
    entity_id: '',
    department_id: '',
    location: '',
    box_barcode: '',
    file_barcode: '',
    description: '',
    record_date: new Date().toISOString().split('T')[0],
    year: new Date().getFullYear().toString(),
    record_type_id: '',
    category_id: '',
    tags: [],
    custom_fields: {},
    ...initialData,
  }), [initialData])

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RecordFormValues>({
    resolver: zodResolver(dynamicSchema) as any,
    defaultValues: defaultValues as any
  })

  // Synchronize form with initialData if it changes
  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      reset({ 
        ...defaultValues, 
        ...initialData,
        year: initialData.year || new Date().getFullYear().toString()
      } as any)
    }
  }, [initialData, reset, defaultValues])

  // Watch record_type_id to update dynamic fields
  const watchedRecordTypeId = watch('record_type_id')

  useEffect(() => {
    setSelectedTypeId(watchedRecordTypeId || null)
    if (isFirstRender.current) {
      isFirstRender.current = false
    } else {
      // We don't necessarily want to reset ALL custom fields, 
      // but zod might fail if old fields remain in the data but not in the schema.
      // Resetting is the safest way to ensure the schema and data stay in sync.
      setValue('custom_fields', {}) 
    }
  }, [watchedRecordTypeId, setValue])

  // Watch entity to trigger department fetch
  const watchedEntityId = watch('entity_id')

  useEffect(() => {
    const fetchDepts = async () => {
      if (!watchedEntityId) {
        setDepartments([])
        return
      }
      try {
        const entity = entities.find(e => e.id === watchedEntityId)
        if (entity) {
          setValue('entity_code', entity.entity_code)
          const res = await api.get('/master/departments', { 
            params: { entity_id: entity.id } 
          })
          setDepartments(res.data)
        }
      } catch (err) {
        console.error('Failed to fetch departments:', err)
      }
    }
    fetchDepts()
  }, [watchedEntityId, entities, setValue])

  // Fetch warehouses layout and find matching bin for initialData
  useEffect(() => {
    const fetchWarehouseLayouts = async () => {
      try {
        const res = await api.get('/warehouse/')
        setWarehouses(res.data)
        
        const initialDataAny = initialData as any
        if (initialDataAny?.id) {
          let foundBin: any = null
          let foundShelf: any = null
          let foundAisle: any = null
          let foundZone: any = null
          let foundWarehouse: any = null

          for (const wh of res.data) {
            for (const zone of wh.zones) {
              for (const aisle of zone.aisles) {
                for (const shelf of aisle.shelves) {
                  for (const bin of shelf.bins) {
                    if (bin.record_id === initialDataAny.id) {
                      foundBin = bin
                      foundShelf = shelf
                      foundAisle = aisle
                      foundZone = zone
                      foundWarehouse = wh
                      break
                    }
                  }
                }
              }
            }
          }

          if (foundBin) {
            setLocationMode('manual')
            setSelectedWarehouseId(foundWarehouse.id)
            setSelectedZoneId(foundZone.id)
            setSelectedAisleId(foundAisle.id)
            setSelectedShelfId(foundShelf.id)
            setSelectedBinId(foundBin.id)
            setOldBinId(foundBin.id)
          } else if (initialData?.location) {
            setLocationMode('custom')
          }
        }
      } catch (err) {
        console.error('Failed to fetch warehouse layouts:', err)
      }
    }
    fetchWarehouseLayouts()
  }, [initialData])

  // Computed layout structures for selects
  const zones = useMemo(() => {
    const wh = warehouses.find(w => w.id === selectedWarehouseId)
    return wh ? wh.zones : []
  }, [selectedWarehouseId, warehouses])

  const aisles = useMemo(() => {
    const zone = zones.find((z: any) => z.id === selectedZoneId)
    return zone ? zone.aisles : []
  }, [selectedZoneId, zones])

  const shelves = useMemo(() => {
    const aisle = aisles.find((a: any) => a.id === selectedAisleId)
    return aisle ? aisle.shelves : []
  }, [selectedAisleId, aisles])

  const shelfBins = useMemo(() => {
    const shelf = shelves.find((s: any) => s.id === selectedShelfId)
    return shelf ? shelf.bins : []
  }, [selectedShelfId, shelves])

  // Dropdown change handlers to reset children selections
  const handleWarehouseChange = (id: string) => {
    setSelectedWarehouseId(id)
    setSelectedZoneId('')
    setSelectedAisleId('')
    setSelectedShelfId('')
    setSelectedBinId('')
  }

  const handleZoneChange = (id: string) => {
    setSelectedZoneId(id)
    setSelectedAisleId('')
    setSelectedShelfId('')
    setSelectedBinId('')
  }

  const handleAisleChange = (id: string) => {
    setSelectedAisleId(id)
    setSelectedShelfId('')
    setSelectedBinId('')
  }

  const handleShelfChange = (id: string) => {
    setSelectedShelfId(id)
    setSelectedBinId('')
  }

  // AI Recommendation Trigger
  const watchedDepartmentId = watch('department_id')

  const getAIRecommendation = async (deptId: string) => {
    if (!deptId) return
    const dept = departments.find(d => d.id === deptId)
    if (!dept) return
    
    setIsRecommending(true)
    try {
      const res = await api.get('/warehouse/recommend', {
        params: { department: dept.name }
      })
      setAiRecommendation(res.data)
      
      if (res.data?.recommendation?.bin_id) {
        const rec = res.data.recommendation
        setSelectedBinId(rec.bin_id)
        
        let foundShelf: any = null
        let foundAisle: any = null
        let foundZone: any = null
        let foundWarehouse: any = null

        for (const wh of warehouses) {
          for (const zone of wh.zones) {
            for (const aisle of zone.aisles) {
              for (const shelf of aisle.shelves) {
                if (shelf.bins.some((b: any) => b.id === rec.bin_id)) {
                  foundShelf = shelf
                  foundAisle = aisle
                  foundZone = zone
                  foundWarehouse = wh
                  break
                }
              }
            }
          }
        }

        if (foundWarehouse) {
          setSelectedWarehouseId(foundWarehouse.id)
          setSelectedZoneId(foundZone.id)
          setSelectedAisleId(foundAisle.id)
          setSelectedShelfId(foundShelf.id)
        }
      } else {
        setAiRecommendation(null)
      }
    } catch (err) {
      console.error('Failed to get AI recommendation:', err)
      setAiRecommendation(null)
    } finally {
      setIsRecommending(false)
    }
  }

  useEffect(() => {
    if (locationMode === 'ai' && watchedDepartmentId && departments.length > 0 && warehouses.length > 0) {
      getAIRecommendation(watchedDepartmentId)
    }
  }, [locationMode, watchedDepartmentId, departments, warehouses])

  // Automatically update the location field based on selected bin code
  useEffect(() => {
    if (locationMode !== 'custom' && selectedBinId && warehouses.length > 0) {
      const binCode = warehouses
        .flatMap((w: any) => w.zones)
        .flatMap((z: any) => z.aisles)
        .flatMap((a: any) => a.shelves)
        .flatMap((s: any) => s.bins)
        .find((b: any) => b.id === selectedBinId)?.bin_code || ''
      setValue('location', binCode ? binCode.substring(0, 16) : 'Bin Location')
    }
  }, [locationMode, selectedBinId, warehouses, setValue])

  const onFormSubmit = async (data: RecordFormValues) => {
    if (locationMode !== 'custom' && !selectedBinId) {
      alert('Please select a physical storage bin slot or switch to Custom location mode.')
      return
    }

    const payload = {
      ...data,
      record_type_id: data.record_type_id === '' ? null : data.record_type_id,
      category_id: data.category_id === '' ? null : data.category_id,
      bin_id: locationMode !== 'custom' ? selectedBinId : null,
      location_mode: locationMode,
      old_bin_id: oldBinId || null
    }
    await onSubmit(payload)
  }

  if (loading) {
    return (
      <div className="bg-card rounded-xl border shadow-sm p-12 flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading form configuration...</p>
      </div>
    )
  }

  // Debug: Log validation errors to console
  if (Object.keys(errors).length > 0) {
    console.warn('Form Validation Errors:', errors)
  }

  return (
    <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
      <div className="border-b px-6 py-4 flex items-center justify-between bg-muted/20">
        <h2 className="text-xl font-bold">{title}</h2>
        <button onClick={onCancel} className="text-muted-foreground hover:text-foreground">
          <X className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit(onFormSubmit)} className="p-6 space-y-6">
        {/* Error Summary (Helpful if errors are hidden) */}
        {Object.keys(errors).length > 0 && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
            <p className="font-bold mb-1">Please fix the following errors:</p>
            <ul className="list-disc list-inside">
              {Object.entries(errors).map(([key, error]: [string, any]) => (
                <li key={key}>
                  {key === 'custom_fields' 
                    ? 'Check custom fields for missing data' 
                    : error.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Core Fields */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Entity Type</label>
            <select
              {...register('entity_type_id')}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
            >
              <option value="">Select Type</option>
              {entityTypes.map(et => (
                <option key={et.id} value={et.id}>{et.name}</option>
              ))}
            </select>
            {errors.entity_type_id && <p className="text-xs text-destructive">{errors.entity_type_id.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Entity</label>
            <select
              {...register('entity_id')}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
            >
              <option value="">Select Entity</option>
              {entities.map(e => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
            {errors.entity_id && <p className="text-xs text-destructive">{errors.entity_id.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Entity Code</label>
            <input
              type="text"
              {...register('entity_code')}
              readOnly
              className="w-full rounded-md border border-input bg-muted px-3 py-2 text-sm outline-none cursor-not-allowed"
              placeholder="Auto-populated"
            />
            {errors.entity_code && <p className="text-xs text-destructive">{errors.entity_code.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Department</label>
            <select
              {...register('department_id')}
              disabled={!watchedEntityId}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none disabled:bg-muted disabled:cursor-not-allowed"
            >
              <option value="">Select Department</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            {errors.department_id && <p className="text-xs text-destructive">{errors.department_id.message}</p>}
          </div>

          {/* Physical Location Selector & Visual Grid Map */}
          <div className="col-span-1 md:col-span-2 border rounded-xl p-5 bg-muted/10 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
              <label className="text-sm font-semibold flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                Physical Storage Layout Mapping
              </label>
              <div className="flex bg-muted rounded-lg p-0.5 text-xs font-medium self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setLocationMode('ai')}
                  className={cn(
                    "px-3 py-1.5 rounded-md transition-all flex items-center gap-1",
                    locationMode === 'ai' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Sparkles className="h-3 w-3 text-violet-500" />
                  AI Recommended
                </button>
                <button
                  type="button"
                  onClick={() => setLocationMode('manual')}
                  className={cn(
                    "px-3 py-1.5 rounded-md transition-all",
                    locationMode === 'manual' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Manual Select
                </button>
                <button
                  type="button"
                  onClick={() => setLocationMode('custom')}
                  className={cn(
                    "px-3 py-1.5 rounded-md transition-all",
                    locationMode === 'custom' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Custom / Legacy
                </button>
              </div>
            </div>

            {/* A. AI Recommendation View */}
            {locationMode === 'ai' && (
              <div className="space-y-3">
                {!watchedDepartmentId ? (
                  <p className="text-xs text-muted-foreground italic bg-background border rounded-lg p-4 text-center">
                    Please select a Department first to load the optimal storage slot recommendation.
                  </p>
                ) : isRecommending ? (
                  <div className="flex items-center justify-center py-6 bg-background border rounded-lg">
                    <Loader2 className="h-5 w-5 animate-spin text-primary mr-2" />
                    <span className="text-xs text-muted-foreground">Calculating optimal warehouse bin...</span>
                  </div>
                ) : aiRecommendation?.recommendation ? (
                  <div className="bg-gradient-to-r from-violet-500/10 to-indigo-500/10 border border-violet-200/50 dark:border-violet-850/30 rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-sm text-violet-700 dark:text-violet-400 bg-violet-100 dark:bg-violet-950/50 px-2.5 py-1 rounded border border-violet-200 dark:border-violet-900/50">
                          {aiRecommendation.recommendation.bin_code}
                        </span>
                        <span className="text-[10px] bg-violet-600 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                          ✨ Optimal Cluster
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono">Score: {aiRecommendation.recommendation.score}</span>
                    </div>
                    <div className="text-xs text-muted-foreground flex flex-col gap-1">
                      <p className="font-medium text-foreground">{aiRecommendation.recommendation.location}</p>
                      <p>Distance to main entry: {aiRecommendation.recommendation.distance_to_entry}m</p>
                      <p className="italic text-[11px] text-violet-600 dark:text-violet-400 mt-1">{aiRecommendation.reason}</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-lg p-4 text-xs text-amber-800 dark:text-amber-300 text-center">
                    No vacant bins available matching layouts. Please switch to "Manual Select" or "Custom/Legacy".
                  </div>
                )}
              </div>
            )}

            {/* B. Manual Selection Dropdowns */}
            {locationMode === 'manual' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Warehouse</label>
                  <select
                    value={selectedWarehouseId}
                    onChange={e => handleWarehouseChange(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                  >
                    <option value="">Select Warehouse</option>
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Zone</label>
                  <select
                    value={selectedZoneId}
                    onChange={e => handleZoneChange(e.target.value)}
                    disabled={!selectedWarehouseId}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none disabled:bg-muted disabled:cursor-not-allowed"
                  >
                    <option value="">Select Zone</option>
                    {zones.map((z: any) => (
                      <option key={z.id} value={z.id}>{z.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Aisle</label>
                  <select
                    value={selectedAisleId}
                    onChange={e => handleAisleChange(e.target.value)}
                    disabled={!selectedZoneId}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none disabled:bg-muted disabled:cursor-not-allowed"
                  >
                    <option value="">Select Aisle</option>
                    {aisles.map((a: any) => (
                      <option key={a.id} value={a.id}>Aisle {a.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Shelf Level</label>
                  <select
                    value={selectedShelfId}
                    onChange={e => handleShelfChange(e.target.value)}
                    disabled={!selectedAisleId}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none disabled:bg-muted disabled:cursor-not-allowed"
                  >
                    <option value="">Select Shelf</option>
                    {shelves.map((s: any) => (
                      <option key={s.id} value={s.id}>Level {s.level} ({s.bins.filter((b: any) => b.is_occupied).length}/{s.bins.length})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1 col-span-full">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Warehouse Bin</label>
                  <select
                    value={selectedBinId}
                    onChange={e => setSelectedBinId(e.target.value)}
                    disabled={!selectedShelfId}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none disabled:bg-muted disabled:cursor-not-allowed font-mono"
                  >
                    <option value="">Select Bin Slot</option>
                    {shelfBins.map((b: any) => (
                      <option key={b.id} value={b.id} disabled={b.is_occupied && b.id !== oldBinId}>
                        {b.bin_code} {b.is_occupied ? (b.id === oldBinId ? '(Current slot)' : '(Occupied)') : '(Available)'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* C. Interactive Visual Shelf Grid Map */}
            {locationMode !== 'custom' && selectedShelfId && (
              <div className="border rounded-lg bg-background p-4 space-y-3 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground border-b pb-2">
                  <span className="flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-primary" />
                    Shelf Level Layout Map
                  </span>
                  <span>Click to select an empty bin slot</span>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                  {shelfBins.map((bin: any) => {
                    const isSelected = selectedBinId === bin.id
                    const isOccupied = bin.is_occupied && bin.id !== oldBinId
                    const isRecommended = aiRecommendation?.recommendation?.bin_id === bin.id

                    return (
                      <button
                        key={bin.id}
                        type="button"
                        onClick={() => {
                          if (!isOccupied) setSelectedBinId(bin.id)
                        }}
                        disabled={isOccupied}
                        title={isOccupied ? 'Occupied' : isSelected ? 'Selected' : 'Available'}
                        className={cn(
                          "relative p-2.5 rounded-lg border font-mono text-xs font-black text-center flex flex-col items-center justify-center transition-all min-h-[50px] shadow-sm select-none",
                          isOccupied
                            ? "bg-slate-100 dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-800 cursor-not-allowed opacity-60"
                            : isSelected
                              ? "bg-primary text-primary-foreground border-primary ring-2 ring-primary/30 scale-105"
                              : isRecommended
                                ? "bg-violet-50 dark:bg-violet-950/20 text-violet-700 dark:text-violet-400 border-violet-300 dark:border-violet-850 hover:border-violet-400"
                                : "bg-card text-foreground border-border hover:border-primary/50 hover:bg-muted/30"
                        )}
                      >
                        <span>{bin.bin_code}</span>
                        {isRecommended && !isSelected && (
                          <span className="absolute -top-1 -right-1 flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500"></span>
                          </span>
                        )}
                        {isSelected && <Check className="h-3 w-3 mt-1 text-primary-foreground animate-bounce" />}
                      </button>
                    )
                  })}
                  {shelfBins.length === 0 && (
                    <div className="col-span-full py-4 text-center text-xs text-muted-foreground italic">
                      No bins created on this shelf.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* D. Custom Legacy View */}
            {locationMode === 'custom' && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Legacy Location Text Field</label>
                <input
                  type="text"
                  {...register('location')}
                  maxLength={16}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                  placeholder="e.g. Warehouse A"
                />
                {errors.location && <p className="text-xs text-destructive">{errors.location.message}</p>}
                <p className="text-[10px] text-muted-foreground">
                  Use this field ONLY for offsite storage or legacy system references that do not map to the current 5-tier spatial inventory.
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Box Barcode (11 chars)</label>
            <input
              {...register('box_barcode')}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
              placeholder="e.g. BOX00000001"
            />
            {errors.box_barcode && <p className="text-xs text-destructive">{errors.box_barcode.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">File Barcode (13 chars)</label>
            <input
              {...register('file_barcode')}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
              placeholder="e.g. FILE000000001"
            />
            {errors.file_barcode && <p className="text-xs text-destructive">{errors.file_barcode.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Record Date</label>
            <input
              type="date"
              {...register('record_date')}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
            />
            {errors.record_date && <p className="text-xs text-destructive">{errors.record_date.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Year (4 Digits)</label>
            <input
              type="text"
              maxLength={4}
              {...register('year')}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none font-mono"
              placeholder="e.g. 2024"
            />
            {errors.year && <p className="text-xs text-destructive">{errors.year.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Record Type</label>
            <select
              {...register('record_type_id')}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
            >
              <option value="">Standard / Generic</option>
              {recordTypes.map(rt => (
                <option key={rt.id} value={rt.id}>{rt.name}</option>
              ))}
            </select>
            {errors.record_type_id && <p className="text-xs text-destructive">{errors.record_type_id.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Category</label>
            <select
              {...register('category_id')}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
            >
              <option value="">No Category</option>
              {categories.map(cat => (
                <optgroup key={cat.id} label={cat.name}>
                  <option value={cat.id}>{cat.name} (Parent)</option>
                  {cat.children?.map(child => (
                    <option key={child.id} value={child.id}>&nbsp;&nbsp;{child.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            {errors.category_id && <p className="text-xs text-destructive">{errors.category_id.message}</p>}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Tags</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {watch('tags')?.map((tag: string) => (
              <span key={tag} className="inline-flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded text-xs font-medium">
                {tag}
                <button 
                  type="button"
                  onClick={() => {
                    const current = watch('tags')
                    setValue('tags', current.filter((t: string) => t !== tag))
                  }}
                  className="hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  if (tagInput.trim()) {
                    const current = watch('tags') || []
                    if (!current.includes(tagInput.trim())) {
                      setValue('tags', [...current, tagInput.trim()])
                    }
                    setTagInput('')
                  }
                }
              }}
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
              placeholder="Press Enter to add tags..."
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Description</label>
          <textarea
            {...register('description')}
            rows={3}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
            placeholder="Detailed description of the contents..."
          />
          {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
        </div>

        {/* Dynamic Custom Fields */}
        {selectedType && selectedType.fields.length > 0 && (
          <div className="pt-6 border-t space-y-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {selectedType.name} Specific Fields
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {selectedType.fields.map(field => (
                <div key={field.id} className="space-y-2">
                  <label className="text-sm font-medium">
                    {field.label} {field.is_required && <span className="text-destructive">*</span>}
                  </label>
                  
                  {field.field_type === 'textarea' ? (
                    <textarea
                      {...register(`custom_fields.${field.name}`)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                      placeholder={field.default_value || ''}
                    />
                  ) : field.field_type === 'boolean' ? (
                    <div className="flex items-center h-10">
                      <input
                        type="checkbox"
                        {...register(`custom_fields.${field.name}`)}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                    </div>
                  ) : field.field_type === 'enum' ? (
                    <select
                      {...register(`custom_fields.${field.name}`)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                    >
                      <option value="">Select Option</option>
                      {field.validation_rules?.options?.map((opt: string) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : field.field_type === 'user' ? (
                    <select
                      {...register(`custom_fields.${field.name}`)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                    >
                      <option value="">Select User</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.user_id || u.email}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.field_type === 'number' ? 'number' : field.field_type === 'link' ? 'url' : 'text'}
                      {...register(`custom_fields.${field.name}`, { 
                        valueAsNumber: field.field_type === 'number' 
                      })}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                      placeholder={field.field_type === 'link' ? 'https://...' : (field.default_value || '')}
                    />
                  )}
                  
                  {errors.custom_fields?.[field.name] && (
                    <p className="text-xs text-destructive">
                      {(errors.custom_fields[field.name] as any).message}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-all shadow-sm disabled:opacity-50"
          >
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting ? 'Saving...' : 'Save Record'}
          </button>
        </div>
      </form>
    </div>
  )
}
