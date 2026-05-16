import Navbar from './Navbar'
import BottomNav from './BottomNav'

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 pt-20 md:pb-12" style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))' }}>
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
