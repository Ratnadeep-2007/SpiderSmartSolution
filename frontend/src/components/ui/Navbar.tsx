import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Bell, Search, LogOut, Settings, Sun, Moon, Monitor, UserCircle, Languages } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useTheme } from '@/components/theme-provider'
import { useLanguageStore } from '@/store/languageStore'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'

export default function Navbar() {
  const { user, logout } = useAuthStore()
  const { setTheme } = useTheme()
  const { language, setLanguage, t } = useLanguageStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchQuery, setSearchQuery] = useState('')

  // Sync input value with the URL search query 'q' when on the records page
  useEffect(() => {
    if (location.pathname === '/records') {
      const params = new URLSearchParams(location.search)
      setSearchQuery(params.get('q') || '')
    } else {
      setSearchQuery('')
    }
  }, [location])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/records?q=${encodeURIComponent(searchQuery.trim())}`)
    } else {
      navigate('/records')
    }
  }

  const getInitials = (email?: string) => {
    if (!email) return 'GU'
    const parts = email.split('@')[0].split(/[._-]/)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return email.substring(0, 2).toUpperCase()
  }

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-8 shadow-sm">
      <form onSubmit={handleSearchSubmit} className="relative w-96 max-w-full">
        <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3">
          <Search className="h-4 w-4 text-muted-foreground" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="block w-full rounded-md border border-input bg-muted/50 py-1.5 ps-10 pe-3 text-sm placeholder-muted-foreground focus:border-primary focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder={t('globalSearchPlaceholder')}
        />
      </form>

      <div className="flex items-center space-x-4 rtl:space-x-reverse">
        {/* Language Switcher Button */}
        <Button 
          variant="ghost" 
          size="sm" 
          className="flex items-center gap-2 px-3 text-sm font-medium hover:bg-accent"
          onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
        >
          <Languages className="h-4 w-4 text-muted-foreground" />
          <span>{language === 'en' ? 'العربية' : 'English'}</span>
        </Button>

        <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground">
          <Bell className="h-5 w-5" />
        </Button>
        
        <div className="h-8 w-px bg-border mx-2" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-auto flex items-center gap-3 px-2 hover:bg-accent/50 rounded-full transition-all">
              <div className="hidden md:flex flex-col text-right rtl:text-left">
                <span className="text-sm font-semibold leading-none">{user?.email?.split('@')[0] || t('guest')}</span>
                <span className="text-[10px] text-muted-foreground mt-0.5 capitalize font-medium">
                  {user?.role ? user.role.toLowerCase().replace('_', ' ') : t('externalGuest')}
                </span>
              </div>
              <Avatar className="h-9 w-9 border-2 border-primary/10 shadow-sm">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                  {getInitials(user?.email)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user?.email}</p>
                <p className="text-xs leading-none text-muted-foreground capitalize">
                  {user?.role?.toLowerCase().replace('_', ' ')}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer">
              <UserCircle className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
              <span>{t('profileSettings')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
              <span>{t('preferences')}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="cursor-pointer">
                <Sun className="mr-2 h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 rtl:ml-2 rtl:mr-0" />
                <Moon className="absolute mr-2 h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 rtl:ml-2 rtl:mr-0" />
                <span>{t('theme')}</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => setTheme("light")} className="cursor-pointer">
                    <Sun className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
                    <span>{t('light')}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("dark")} className="cursor-pointer">
                    <Moon className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
                    <span>{t('dark')}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("system")} className="cursor-pointer">
                    <Monitor className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
                    <span>{t('system')}</span>
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={logout}
              className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
            >
              <LogOut className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
              <span>{t('logout')}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
