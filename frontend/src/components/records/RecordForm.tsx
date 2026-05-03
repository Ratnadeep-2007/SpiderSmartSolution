import { useState, useEffect, useMemo, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Save, X, Loader2, Plus } from 'lucide-react'
import api from '@/lib/api'

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
  custom_fields: z.record(z.any()).default({}),
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
  custom_fields: Record<string, any>
  tags: string[]
}

interface RecordTypeField {
  id: string
  name: string
  label: string
  field_type: string
  is_required: boolean
  default_value?: string
  validation_rules?: any
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

interface RecordFormProps {
  initialData?: Partial<RecordFormValues>
  onSubmit: (data: any) => void
  onCancel: () => void
  title: string
}

export default function RecordForm({ initialData, onSubmit, onCancel, title }: RecordFormProps) {
  const [recordTypes, setRecordTypes] = useState<RecordType[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [entityTypes, setEntityTypes] = useState<any[]>([])
  const [entities, setEntities] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(initialData?.record_type_id || null)
  const [tagInput, setTagInput] = useState('')
  const isFirstRender = useRef(true)

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

    const customFieldsObj: any = {}
    selectedType.fields.forEach(f => {
      let fieldSchema: any
      
      switch (f.field_type) {
        case 'number':
          fieldSchema = z.preprocess((val) => {
            if (val === '' || val === undefined || val === null) return null;
            const parsed = typeof val === 'string' ? parseFloat(val) : val;
            return isNaN(parsed as any) ? null : parsed;
          }, z.number({ invalid_type_error: 'Must be a number' }).nullable())
          break
        case 'boolean':
          fieldSchema = z.boolean()
          break
        case 'date':
          fieldSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
          break
        case 'enum':
          const options = f.validation_rules?.options || []
          fieldSchema = options.length > 0 ? z.enum(options as [string, ...string[]]) : z.string()
          break
        case 'user':
        case 'link':
          fieldSchema = z.string()
          if (f.field_type === 'link') fieldSchema = fieldSchema.url('Must be a valid URL')
          break
        default:
          fieldSchema = z.string()
      }

      if (f.is_required) {
        if (f.field_type === 'text' || f.field_type === 'textarea' || f.field_type === 'link') {
          fieldSchema = fieldSchema.min(1, `${f.label} is required`)
        } else if (f.field_type === 'number') {
          fieldSchema = fieldSchema.refine(val => val !== null, `${f.label} is required`)
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
  } = useForm<any>({
    resolver: zodResolver(dynamicSchema),
    defaultValues
  })

  // Synchronize form with initialData if it changes
  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      reset({ 
        ...defaultValues, 
        ...initialData,
        year: initialData.year || new Date().getFullYear().toString()
      })
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

  const onFormSubmit = async (data: any) => {
    const payload = {
      ...data,
      record_type_id: data.record_type_id === '' ? null : data.record_type_id,
      category_id: data.category_id === '' ? null : data.category_id,
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

          <div className="space-y-2">
            <label className="text-sm font-medium">Location (max 16 chars)</label>
            <input
              type="text"
              {...register('location')}
              maxLength={16}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
              placeholder="e.g. Warehouse A"
            />
            {errors.location && <p className="text-xs text-destructive">{errors.location.message}</p>}
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
