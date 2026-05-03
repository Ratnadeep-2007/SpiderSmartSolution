import { create } from 'zustand'

export type UserRole = 'SYSTEM_ADMIN' | 'RECORDS_MANAGER' | 'KNOWLEDGE_WORKER' | 'AUDITOR' | 'EXTERNAL_GUEST'

interface User {
  id: string
  email: string
  role: UserRole
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  token: string | null
  login: (user: User, token: string) => void
  logout: () => void
  initialize: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  token: null,
  
  login: (user, token) => {
    localStorage.setItem('access_token', token)
    localStorage.setItem('user', JSON.stringify(user))
    set({ user, token, isAuthenticated: true })
  },
  
  logout: () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')
    set({ user: null, token: null, isAuthenticated: false })
  },

  initialize: () => {
    const token = localStorage.getItem('access_token')
    const userJson = localStorage.getItem('user')
    if (token && userJson) {
      try {
        const user = JSON.parse(userJson)
        set({ user, token, isAuthenticated: true })
      } catch (e) {
        localStorage.removeItem('access_token')
        localStorage.removeItem('user')
      }
    }
  }
}))
