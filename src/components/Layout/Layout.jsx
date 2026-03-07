import Navbar from './Navbar'

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 pt-20 pb-12">
        {children}
      </main>
    </div>
  )
}
