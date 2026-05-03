import { useState, useEffect, useRef } from 'react'
import { 
  Users, 
  UserPlus, 
  Shield, 
  ShieldAlert, 
  ToggleLeft, 
  ToggleRight,
  MoreVertical,
  Loader2,
  Mail,
  Calendar,
  X,
  Lock,
  Eye,
  EyeOff,
  Edit2,
  CheckCircle2,
  XCircle,
  Download
} from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'

interface User {
  id: string
  user_id: string
  email: string
  full_name: string
  role: string
  is_active: boolean
  created_at: string
  expires_at?: string
  scoped_filters?: any
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  
  // Scoped filter metadata
  const [entities, setEntities] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])

  // Invite/Edit Form State
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteUserId, setInviteUserId] = useState('')
  const [invitePassword, setInvitePassword] = useState('')
  const [inviteRole, setInviteRole] = useState('KNOWLEDGE_WORKER')
  const [inviteExpiresAt, setInviteExpiresAt] = useState('')
  const [inviteScopedEntity, setInviteScopedEntity] = useState('')
  const [inviteScopedDept, setInviteScopedDept] = useState('')
  
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/users')
      setUsers(res.data)
    } catch (err) {
      toast.error('Failed to fetch users')
    } finally {
      setLoading(false)
    }
  }

  const fetchMetadata = async () => {
    try {
      const [eRes, dRes] = await Promise.all([
        api.get('/master/entities'),
        api.get('/master/departments')
      ])
      setEntities(eRes.data)
      setDepartments(dRes.data)
    } catch (err) {
      console.error('Failed to fetch metadata:', err)
    }
  }

  useEffect(() => {
    fetchUsers()
    fetchMetadata()
  }, [])

  // Click outside handler for dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleToggleStatus = async (user: User) => {
    try {
      await api.patch(`/admin/users/${user.id}/status`, { is_active: !user.is_active })
      toast.success(`User ${user.is_active ? 'disabled' : 'enabled'} successfully`)
      fetchUsers()
    } catch (err) {
      toast.error('Failed to update status')
    }
  }

  const handleUpdateRole = async (user: User, newRole: string) => {
    try {
      await api.patch(`/admin/users/${user.id}/role`, { role: newRole })
      toast.success('Role updated successfully')
      fetchUsers()
    } catch (err) {
      toast.error('Failed to update role')
    }
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail || !inviteUserId) return

    const scoped_filters: any = {}
    if (inviteScopedEntity) scoped_filters.entity_id = inviteScopedEntity
    if (inviteScopedDept) scoped_filters.department_id = inviteScopedDept

    const payload: any = {
      email: inviteEmail,
      user_id: inviteUserId,
      role: inviteRole,
      expires_at: inviteExpiresAt || null,
      scoped_filters: Object.keys(scoped_filters).length > 0 ? scoped_filters : null,
      // password only if changed or new
      ...(invitePassword ? { password: invitePassword } : {})
    }

    setIsSubmitting(true)
    try {
      if (editingUser) {
        await api.patch(`/admin/users/${editingUser.id}`, payload)
        toast.success('User updated successfully')
      } else {
        await api.post('/admin/users', { ...payload, is_active: true })
        toast.success('User invited successfully')
      }
      closeModal()
      fetchUsers()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Operation failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  const openEditModal = (user: User) => {
    setEditingUser(user)
    setInviteEmail(user.email)
    setInviteUserId(user.user_id)
    setInviteRole(user.role)
    setInvitePassword('')
    setInviteExpiresAt(user.expires_at ? new Date(user.expires_at).toISOString().split('T')[0] : '')
    setInviteScopedEntity(user.scoped_filters?.entity_id || '')
    setInviteScopedDept(user.scoped_filters?.department_id || '')
    setShowInviteModal(true)
  }

  const closeModal = () => {
    setShowInviteModal(false)
    setEditingUser(null)
    setInviteEmail('')
    setInviteUserId('')
    setInvitePassword('')
    setInviteRole('KNOWLEDGE_WORKER')
    setInviteExpiresAt('')
    setInviteScopedEntity('')
    setInviteScopedDept('')
  }

  const handleExport = () => {
    const headers = ['ID', 'User ID', 'Email', 'Full Name', 'Role', 'Status', 'Joined At']
    const csvData = users.map(u => [
      u.id,
      u.user_id,
      u.email,
      u.full_name || 'System User',
      u.role,
      u.is_active ? 'Active' : 'Disabled',
      new Date(u.created_at).toLocaleDateString()
    ])

    const csvContent = [headers, ...csvData].map(e => e.join(",")).join("\n")
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `users_export_${new Date().getTime()}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage system access, roles, and account status.</p>
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
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium shadow-sm hover:bg-primary/90 transition-all"
          >
            <UserPlus className="h-4 w-4" />
            Invite User
          </button>
        </div>
      </div>

      <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-muted/50 border-b font-bold text-muted-foreground">
                <tr>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4">Joined</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                          {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold">{user.full_name || 'System User'}</div>
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Users className="h-3 w-3" /> ID: {user.user_id || 'Not Set'}
                          </div>
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <select 
                        value={user.role}
                        onChange={(e) => handleUpdateRole(user, e.target.value)}
                        className="bg-transparent border-none text-xs font-bold uppercase tracking-wider focus:ring-0 cursor-pointer hover:text-primary"
                      >
                        <option value="SYSTEM_ADMIN">Administrator</option>
                        <option value="RECORDS_MANAGER">Records Manager</option>
                        <option value="KNOWLEDGE_WORKER">Knowledge Worker</option>
                        <option value="EXTERNAL_GUEST">External Guest</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        user.is_active 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                          : 'bg-rose-50 text-rose-700 border-rose-100'
                      }`}>
                        {user.is_active ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
                        {user.is_active ? 'Active' : 'Disabled'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      <div className="flex items-center gap-1.5 text-xs">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(user.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="relative flex justify-end" ref={activeMenuId === user.id ? menuRef : null}>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation()
                            setActiveMenuId(activeMenuId === user.id ? null : user.id)
                          }}
                          className={`p-2 rounded-md transition-colors ${activeMenuId === user.id ? 'bg-muted text-primary' : 'hover:bg-muted text-muted-foreground'}`}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>

                        {activeMenuId === user.id && (
                          <div className="absolute right-0 top-10 w-48 bg-card border rounded-xl shadow-xl z-50 py-1.5 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                            <button
                              onClick={() => {
                                openEditModal(user)
                                setActiveMenuId(null)
                              }}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-2 transition-colors"
                            >
                              <Edit2 className="h-4 w-4 text-primary" />
                              Edit User Details
                            </button>
                            <button
                              onClick={() => {
                                handleToggleStatus(user)
                                setActiveMenuId(null)
                              }}
                              className={`w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-2 transition-colors ${user.is_active ? 'text-rose-600' : 'text-emerald-600'}`}
                            >
                              {user.is_active ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                              {user.is_active ? 'Disable Account' : 'Enable Account'}
                            </button>
                            <div className="h-px bg-muted my-1" />
                            <button
                              disabled
                              className="w-full px-4 py-2 text-left text-sm text-muted-foreground opacity-50 flex items-center gap-2 cursor-not-allowed"
                            >
                              <ShieldAlert className="h-4 w-4" />
                              Reset Security Keys
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-md rounded-2xl border shadow-2xl p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2">
                {editingUser ? <Users className="h-5 w-5 text-primary" /> : <UserPlus className="h-5 w-5 text-primary" />}
                {editingUser ? 'Edit User' : 'Invite New User'}
              </h3>
              <button onClick={closeModal} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-muted-foreground">User ID (Employee ID / Username)</label>
                <div className="relative">
                  <Users className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input 
                    type="text" 
                    required
                    value={inviteUserId}
                    onChange={(e) => setInviteUserId(e.target.value)}
                    className="w-full rounded-lg border bg-background pl-10 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="e.g. EMP001"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-muted-foreground">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input 
                    type="email" 
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full rounded-lg border bg-background pl-10 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="name@example.com"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-muted-foreground">{editingUser ? 'Change Password (Optional)' : 'Temporary Password'}</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    required={!editingUser}
                    value={invitePassword}
                    onChange={(e) => setInvitePassword(e.target.value)}
                    className="w-full rounded-lg border bg-background pl-10 pr-10 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder={editingUser ? "Leave blank to keep current" : "Min. 8 characters"}
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-muted-foreground">System Role</label>
                <select 
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full rounded-lg border bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="KNOWLEDGE_WORKER">Knowledge Worker</option>
                  <option value="RECORDS_MANAGER">Records Manager</option>
                  <option value="SYSTEM_ADMIN">Administrator</option>
                  <option value="AUDITOR">Auditor</option>
                  <option value="EXTERNAL_GUEST">External Guest</option>
                </select>
              </div>

              {inviteRole === 'EXTERNAL_GUEST' && (
                <div className="p-4 bg-muted/30 rounded-xl space-y-4 animate-in slide-in-from-top-2 duration-200">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-primary">Guest Expiration Date</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <input 
                        type="date" 
                        value={inviteExpiresAt}
                        onChange={(e) => setInviteExpiresAt(e.target.value)}
                        className="w-full rounded-lg border bg-background pl-10 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-bold uppercase text-primary">Scoped Data Access (Optional)</label>
                    
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground">Restrict to Entity</label>
                      <select 
                        value={inviteScopedEntity}
                        onChange={(e) => setInviteScopedEntity(e.target.value)}
                        className="w-full rounded-lg border bg-background px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="">All Entities</option>
                        {entities.map(e => (
                          <option key={e.id} value={e.id}>{e.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground">Restrict to Department</label>
                      <select 
                        value={inviteScopedDept}
                        onChange={(e) => setInviteScopedDept(e.target.value)}
                        className="w-full rounded-lg border bg-background px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="">All Departments</option>
                        {departments.map(d => (
                          <option key={d.id} value={d.id}>{d.name} ({d.entity_code})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border rounded-lg text-sm font-medium hover:bg-muted"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium shadow-sm hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (editingUser ? "Update User" : "Send Invite")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
