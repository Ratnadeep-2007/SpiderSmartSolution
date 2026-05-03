import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  Database, 
  AlertTriangle, 
  FileCheck, 
  Users,
  TrendingUp,
  History,
  Upload,
  Plus,
  ArrowRight,
  Loader2
} from 'lucide-react'
import api from '@/lib/api'

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null)
  const [activities, setActivities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [statsRes, logsRes] = await Promise.all([
          api.get('/reports/stats'),
          api.get('/audit/', { params: { size: 5 } })
        ])
        setStats(statsRes.data)
        setActivities(logsRes.data.data)
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchDashboardData()
  }, [])

  if (loading) {
    return (
      <div className="h-[80vh] flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    )
  }

  const statCards = [
    { name: 'Total Records', value: stats?.total_records || 0, icon: Database, color: 'text-blue-600', bg: 'bg-blue-100' },
    { name: 'Due for Disposition', value: stats?.due_for_disposition || 0, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-100' },
    { name: 'Active Holds', value: stats?.active_holds || 0, icon: FileCheck, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    { name: 'Recent Activity (7d)', value: stats?.recent_activity || 0, icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-100' },
  ]

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
          <p className="text-muted-foreground mt-1">Welcome back. Here is what's happening across your inventory today.</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <div key={stat.name} className="rounded-xl border bg-card p-6 shadow-sm transition-hover hover:shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{stat.name}</p>
                <p className="text-2xl font-bold mt-1">{stat.value.toLocaleString()}</p>
              </div>
              <div className={`rounded-lg ${stat.bg} p-2.5`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <div className="rounded-xl border bg-card p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold flex items-center">
              <History className="mr-2 h-5 w-5 text-muted-foreground" />
              Recent Activity
            </h3>
            <Link to="/audit" className="text-xs font-medium text-primary hover:underline flex items-center">
              View All <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-6 flex-1">
            {activities.length > 0 ? activities.map((log) => (
              <div key={log.id} className="flex items-start space-x-4">
                <div className={`mt-1 h-2 w-2 rounded-full ${
                  log.action === 'CREATE' ? 'bg-emerald-500' :
                  log.action === 'UPDATE' ? 'bg-blue-500' :
                  log.action === 'DELETE' ? 'bg-rose-500' : 'bg-slate-400'
                }`} />
                <div className="flex-1 space-y-0.5">
                  <p className="text-sm font-medium">
                    {log.action} Action on {log.record_id ? `Record #${log.record_id.split('-')[0]}` : 'System'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Performed by {log.user_email || 'System'} • {new Date(log.performed_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            )) : (
              <p className="text-sm text-muted-foreground italic">No recent activity found.</p>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="font-semibold mb-6">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-4">
            <Link to="/records" className="flex flex-col items-center justify-center rounded-xl border border-dashed p-6 hover:bg-muted/50 hover:border-primary/50 transition-all group">
              <Plus className="h-8 w-8 mb-2 text-muted-foreground group-hover:text-primary" />
              <span className="text-sm font-semibold">Inventory</span>
            </Link>
            <Link to="/import" className="flex flex-col items-center justify-center rounded-xl border border-dashed p-6 hover:bg-muted/50 hover:border-primary/50 transition-all group">
              <Upload className="h-8 w-8 mb-2 text-muted-foreground group-hover:text-primary" />
              <span className="text-sm font-semibold">Bulk Import</span>
            </Link>
            <Link to="/reports" className="flex flex-col items-center justify-center rounded-xl border border-dashed p-6 hover:bg-muted/50 hover:border-primary/50 transition-all group">
              <FileCheck className="h-8 w-8 mb-2 text-muted-foreground group-hover:text-primary" />
              <span className="text-sm font-semibold">Reports</span>
            </Link>
            <Link to="/audit" className="flex flex-col items-center justify-center rounded-xl border border-dashed p-6 hover:bg-muted/50 hover:border-primary/50 transition-all group">
              <ShieldCheck className="h-8 w-8 mb-2 text-muted-foreground group-hover:text-primary" />
              <span className="text-sm font-semibold">Audit Log</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function ShieldCheck(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}
