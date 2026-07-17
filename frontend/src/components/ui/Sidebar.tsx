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
  Scale,
  Warehouse,
  BookOpen
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguageStore } from '@/store/languageStore'

type TranslationKeys = 
  | 'dashboard'
  | 'records'
  | 'reports'
  | 'import'
  | 'auditLog'
  | 'eDiscovery'
  | 'warehouse'
  | 'compliance'
  | 'users'
  | 'masterData'
  | 'classification'

const navItems = [
  { key: 'dashboard', href: '/', icon: LayoutDashboard },
  { key: 'records', href: '/records', icon: Database },
  { key: 'reports', href: '/reports', icon: BarChart3 },
  { key: 'import', href: '/import', icon: Upload },
  { key: 'auditLog', href: '/audit', icon: ClipboardList },
  { key: 'eDiscovery', href: '/ediscovery', icon: Scale },
  { key: 'warehouse', href: '/warehouse', icon: Warehouse },
  { key: 'compliance', href: '/compliance', icon: BookOpen },
] as const

const adminItems = [
  { key: 'users', href: '/admin/users', icon: Users },
  { key: 'masterData', href: '/admin/master', icon: Settings },
  { key: 'classification', href: '/admin/classification', icon: Tags },
] as const

export default function Sidebar() {
  const { t } = useLanguageStore()

  return (
    <div className="flex h-full w-64 flex-col border-r bg-card text-card-foreground">
      <div className="flex h-16 items-center border-b px-6">
        <ShieldCheck className="me-2 h-6 w-6 text-primary" />
        <span className="text-lg font-bold tracking-tight text-primary">{t('logoTitle')}</span>
      </div>
      
      <div className="flex-1 overflow-y-auto py-6 px-4 space-y-8">
        <div>
          <h3 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t('mainNavigation')}
          </h3>
          <nav className="space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.key}
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
                <item.icon className="me-3 h-5 w-5" />
                {t(item.key)}
              </NavLink>
            ))}
          </nav>
        </div>

        <div>
          <h3 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t('administration')}
          </h3>
          <nav className="space-y-1">
            {adminItems.map((item) => (
              <NavLink
                key={item.key}
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
                <item.icon className="me-3 h-5 w-5" />
                {t(item.key as TranslationKeys)}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>
      
      <div className="border-t p-4 text-xs text-muted-foreground text-center">
        {t('copyright')}
      </div>
    </div>
  )
}
