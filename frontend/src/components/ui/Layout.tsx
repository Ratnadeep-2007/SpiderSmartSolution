import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Navbar from './Navbar'

export default function Layout() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Sidebar - Fixed width, full height */}
      <Sidebar />

      {/* Main Content Wrapper */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Navbar - Fixed height, full width of parent */}
        <Navbar />

        {/* Scrollable Content Area */}
        <main className="flex-1 overflow-y-auto bg-muted/20">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
