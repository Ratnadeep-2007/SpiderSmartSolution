import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from '@/components/ui/Layout'
import ProtectedRoute from '@/components/ui/ProtectedRoute'
import { ThemeProvider } from '@/components/theme-provider'
import './App.css'

// Pages
import Dashboard from '@/pages/Dashboard'
import Records from '@/pages/Records'
import RecordDetail from '@/pages/RecordDetail'
import Login from '@/pages/Login'
import Audit from '@/pages/Audit'
import Reports from '@/pages/Reports'
import Import from '@/pages/Import'
import AdminUsers from '@/pages/AdminUsers'
import AdminMaster from '@/pages/AdminMaster'
import { Toaster } from 'sonner'
import AdminClassification from '@/pages/AdminClassification'

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <Router>
        <Toaster position="top-right" richColors />
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/records" element={<Records />} />
              <Route path="/records/:id" element={<RecordDetail />} />
              <Route path="/audit" element={<Audit />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/import" element={<Import />} />
              
              {/* Admin routes */}
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/master" element={<AdminMaster />} />
              <Route path="/admin/classification" element={<AdminClassification />} />
            </Route>
          </Route>
        </Routes>
      </Router>
    </ThemeProvider>
  )
}

export default App
