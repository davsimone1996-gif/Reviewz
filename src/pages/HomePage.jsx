import Feed from '../components/Feed/Feed'
import useAuthStore from '../store/authStore'

export default function HomePage() {
  const { user } = useAuthStore()

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-100">
          {user ? 'Your Feed' : 'Discover Reviews'}
        </h1>
        <p className="text-muted text-sm mt-1">
          {user
            ? 'Reviews from people you follow'
            : 'Sign in to follow people and get a personalised feed'}
        </p>
      </div>
      <Feed />
    </div>
  )
}
