import { useState, useEffect } from 'react'
import { ChevronRight, ChevronDown, Folder, FolderOpen, Tag, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import api from '@/lib/api'

interface Category {
  id: string
  name: string
  children: Category[]
}

interface CategoryTreeProps {
  selectedId: string | null
  onSelect: (id: string | null) => void
}

export default function CategoryTree({ selectedId, onSelect }: CategoryTreeProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await api.get('/master/categories')
        setCategories(res.data)
      } catch (err) {
        console.error('Failed to fetch categories:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchCategories()
  }, [])

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const renderNode = (node: Category, level: number = 0) => {
    const isExpanded = expanded[node.id]
    const hasChildren = node.children && node.children.length > 0
    const isSelected = selectedId === node.id

    return (
      <div key={node.id} className="select-none">
        <div 
          onClick={() => onSelect(isSelected ? null : node.id)}
          className={cn(
            "flex items-center gap-1.5 py-1.5 px-2 rounded-md cursor-pointer transition-colors group",
            isSelected ? "bg-primary text-primary-foreground" : "hover:bg-muted"
          )}
          style={{ paddingLeft: `${level * 12 + 8}px` }}
        >
          {hasChildren ? (
            <button 
              onClick={(e) => toggleExpand(node.id, e)}
              className={cn(
                "p-0.5 rounded-sm hover:bg-black/10 transition-transform",
                isExpanded && "rotate-0"
              )}
            >
              {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>
          ) : (
            <div className="w-4.5" /> // Spacer for alignment
          )}
          
          {hasChildren ? (
            isExpanded ? <FolderOpen className={cn("h-4 w-4", isSelected ? "text-primary-foreground" : "text-amber-500")} /> : <Folder className={cn("h-4 w-4", isSelected ? "text-primary-foreground" : "text-amber-500")} />
          ) : (
            <Tag className={cn("h-3.5 w-3.5", isSelected ? "text-primary-foreground" : "text-muted-foreground")} />
          )}
          
          <span className="text-xs font-medium truncate">{node.name}</span>
        </div>

        {hasChildren && isExpanded && (
          <div className="mt-0.5">
            {node.children.map(child => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <div 
        onClick={() => onSelect(null)}
        className={cn(
          "flex items-center gap-2 py-2 px-3 rounded-md cursor-pointer text-xs font-bold uppercase tracking-wider transition-colors",
          !selectedId ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
        )}
      >
        All Categories
      </div>
      <div className="mt-2">
        {categories.map(cat => renderNode(cat))}
      </div>
    </div>
  )
}
