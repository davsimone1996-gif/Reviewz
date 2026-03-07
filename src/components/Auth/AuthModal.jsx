import { useState } from 'react'
import { X, Music2 } from 'lucide-react'
import LoginForm from './LoginForm'
import RegisterForm from './RegisterForm'

export default function AuthModal({ onClose }) {
  const [view, setView] = useState('login')

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-sm card animate-scale-in">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted hover:text-gray-100 transition-colors z-10"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="p-8 pb-0">
          <div className="flex flex-col items-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent to-orange-400 flex items-center justify-center shadow-xl shadow-accent/30 mb-3">
              <Music2 size={22} className="text-white" />
            </div>
            <h2 className="text-xl font-bold text-gradient">Reviewz</h2>
            <p className="text-muted text-sm mt-0.5">
              {view === 'login' ? 'Welcome back 👋' : 'Join the community 🎵'}
            </p>
          </div>

          {/* Tab switcher */}
          <div className="flex bg-surface-200 rounded-xl p-1 mb-6">
            {['login', 'register'].map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                  view === v
                    ? 'bg-accent text-white shadow-md shadow-accent/20'
                    : 'text-muted hover:text-gray-100'
                }`}
              >
                {v === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>
        </div>

        <div className="px-8 pb-8">
          {view === 'login' ? (
            <LoginForm onSuccess={onClose} onSwitch={() => setView('register')} />
          ) : (
            <RegisterForm onSuccess={onClose} onSwitch={() => setView('login')} />
          )}
        </div>
      </div>
    </div>
  )
}
