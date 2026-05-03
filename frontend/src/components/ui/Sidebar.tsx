import { NavLink } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Database, 
  ClipboardList, 
  BarChart3, 
  Upload, 
  ShieldCheck, 
  Settings,
  Users,
  Tags,
  Search
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Records', href: '/records', icon: Database },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Import', href: '/import', icon: Upload },
  { name: 'Audit Log', href: '/audit', icon: ClipboardList },
]

const adminItems = [
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'Master Data', href: '/admin/master', icon: Settings },
  { name: 'Classification', href: '/admin/classification', icon: Tags },
]

export default function Sidebar() {
  return (
    <div className="flex h-full w-64 flex-col border-r bg-card text-card-foreground">
      <div className="flex h-16 items-center border-b px-6">
        <ShieldCheck className="mr-2 h-6 w-6 text-primary" />
        <span className="text-lg font-bold tracking-tight text-primary">SpiderSmart IMS</span>
      </div>
      
      <div className="flex-1 overflow-y-auto py-6 px-4 space-y-8">
        <div>
          <h3 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Main Navigation
          </h3>
          <nav className="space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  cn(
                    "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive 
                      ? "bg-primary text-primary-foreground shadow-sm" 
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )
                }
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.name}
              </NavLink>
            ))}
          </nav>
        </div>

        <div>
          <h3 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Administration
          </h3>
          <nav className="space-y-1">
            {adminItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  cn(
                    "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive 
                      ? "bg-primary text-primary-foreground shadow-sm" 
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )
                }
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.name}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>
      
      <div className="border-t p-4 text-xs text-muted-foreground text-center">
        Spider Smart Solution © 2026
      </div>
    </div>
  )
}
