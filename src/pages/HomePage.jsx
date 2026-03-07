import { useState } from 'react'
import Feed from '../components/Feed/Feed'
import useAuthStore from '../store/authStore'
import AuthModal from '../components/Auth/AuthModal'
import { Music2, Star, Users, Zap, ArrowRight } from 'lucide-react'

function HeroSection({ onSignIn }) {
  return (
    <section className="relative overflow-hidden rounded-3xl mb-10 animate-fade-in">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-accent/20 via-surface-100 to-surface-50 rounded-3xl" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-orange-500/10 via-transparent to-transparent" />

      {/* Decorative circles */}
      <div className="absolute -right-12 -top-12 w-56 h-56 rounded-full bg-accent/10 blur-3xl" />
      <div className="absolute -left-8 -bottom-8 w-40 h-40 rounded-full bg-orange-400/10 blur-2xl" />

      <div className="relative px-8 py-14 sm:px-12">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent to-orange-400 flex items-center justify-center shadow-xl shadow-accent/30">
            <Music2 size={22} className="text-white" />
          </div>
          <span className="text-2xl font-bold text-gradient">Reviewz</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold leading-tight mb-4">
          Music you love,{' '}
          <span className="text-gradient">reviews you trust.</span>
        </h1>
        <p className="text-muted text-lg max-w-md mb-8 leading-relaxed">
          Discover, rate and share your favourite tracks and albums. Follow critics, earn reputation, build your musical identity.
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={onSignIn}
            className="btn-primary flex items-center gap-2 px-6 py-3 text-base"
          >
            Get started <ArrowRight size={16} />
          </button>
          <a href="#feed" className="btn-secondary flex items-center gap-2 px-6 py-3 text-base">
            Browse reviews
          </a>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap gap-6 mt-10">
          {[
            { icon: Star,   label: 'Honest ratings',    color: 'text-amber-400' },
            { icon: Users,  label: 'Social feed',        color: 'text-blue-400' },
            { icon: Zap,    label: 'Social score karma', color: 'text-purple-400' },
          ].map(({ icon: Icon, label, color }) => (
            <div key={label} className="flex items-center gap-2 text-sm text-muted">
              <Icon size={15} className={color} />
              {label}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default function HomePage() {
  const { user } = useAuthStore()
  const [showAuth, setShowAuth] = useState(false)

  return (
    <>
      {!user && <HeroSection onSignIn={() => setShowAuth(true)} />}

      <div id="feed" className="max-w-2xl mx-auto">
        {user && (
          <div className="mb-6 animate-fade-in-up">
            <h1 className="text-xl font-bold text-gray-100">Your Feed</h1>
            <p className="text-muted text-sm mt-0.5">Reviews from people you follow</p>
          </div>
        )}

        {!user && (
          <div className="mb-5 flex items-center justify-between animate-fade-in-up">
            <h2 className="text-lg font-semibold text-gray-100">Latest Reviews</h2>
          </div>
        )}

        <Feed />
      </div>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  )
}
