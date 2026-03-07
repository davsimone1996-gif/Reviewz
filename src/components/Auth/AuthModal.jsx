import { useState } from 'react'
import { X } from 'lucide-react'
import LoginForm from './LoginForm'
import RegisterForm from './RegisterForm'

export default function AuthModal({ onClose }) {
  const [view, setView] = useState('login')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4 card p-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted hover:text-gray-100 transition-colors"
        >
          <X size={20} />
        </button>

        <div className="flex mb-6 bg-surface-200 rounded-lg p-1">
          <button
            onClick={() => setView('login')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              view === 'login' ? 'bg-surface-300 text-gray-100' : 'text-muted hover:text-gray-100'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => setView('register')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              view === 'register' ? 'bg-surface-300 text-gray-100' : 'text-muted hover:text-gray-100'
            }`}
          >
            Register
          </button>
        </div>

        {view === 'login' ? (
          <LoginForm onSuccess={onClose} onSwitch={() => setView('register')} />
        ) : (
          <RegisterForm onSuccess={onClose} onSwitch={() => setView('login')} />
        )}
      </div>
    </div>
  )
}
