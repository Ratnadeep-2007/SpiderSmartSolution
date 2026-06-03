import { useState, useEffect } from 'react'
import { Bookmark, Trash2, Play } from 'lucide-react'
import api from '@/lib/api'

interface SavedSearch {
  id: string
  name: string
  query_params: Record<string, string | undefined>
}

interface SavedSearchesProps {
  onApply: (params: Record<string, string | undefined>) => void
  currentParams: Record<string, string | undefined>
}

export default function SavedSearches({ onApply, currentParams }: SavedSearchesProps) {
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [newSearchName, setNewSearchName] = useState('')

  const fetchSaved = async () => {
    try {
      const res = await api.get('/search/saved')
      setSavedSearches(res.data)
    } catch (_err) {
      console.error('Failed to fetch saved searches')
    }
  }

  useEffect(() => {
    const init = async () => {
      await fetchSaved()
    }
    init()
  }, [])

  const handleSaveCurrent = async () => {
    if (!newSearchName) return
    setIsSaving(true)
    try {
      await api.post('/search/saved', {
        name: newSearchName,
        query_params: currentParams
      })
      setNewSearchName('')
      await fetchSaved()
    } catch (_err) {
      alert('Failed to save search')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this saved search?')) return
    try {
      await api.delete(`/search/saved/${id}`)
      await fetchSaved()
    } catch (_err) {
      alert('Failed to delete')
    }
  }

  return (
    <div className="bg-card rounded-xl border shadow-sm p-4 space-y-4">
      <div className="flex items-center gap-2 font-semibold text-sm">
        <Bookmark className="h-4 w-4 text-primary" />
        Saved Searches
      </div>

      <div className="space-y-2">
        <input 
          type="text"
          value={newSearchName}
          onChange={(e) => setNewSearchName(e.target.value)}
          placeholder="Name current search..."
          className="w-full rounded-md border bg-background px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary"
        />
        <button 
          onClick={handleSaveCurrent}
          disabled={!newSearchName || isSaving}
          className="w-full py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          Save Current Query
        </button>
      </div>

      <div className="pt-2 border-t space-y-1">
        {savedSearches.length === 0 ? (
          <p className="text-xs text-muted-foreground italic py-2">No saved searches yet.</p>
        ) : (
          savedSearches.map(s => (
            <div key={s.id} className="group flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors text-xs">
              <span className="font-medium truncate mr-2">{s.name}</span>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => onApply(s.query_params)}
                  className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                  title="Apply Search"
                >
                  <Play className="h-3 w-3 fill-current" />
                </button>
                <button 
                  onClick={() => handleDelete(s.id)}
                  className="p-1 text-destructive hover:bg-destructive/10 rounded"
                  title="Delete"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
