import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout/Layout'
import HomePage from './pages/HomePage'
import CreatePostPage from './pages/CreatePostPage'
import PostDetailPage from './pages/PostDetailPage'
import ProfilePage from './pages/ProfilePage'
import SearchPage from './pages/SearchPage'
import useAuthStore from './store/authStore'
import { fetchProfile } from './lib/supabase'

function App() {
  const { initialize, user, setProfile } = useAuthStore()

  useEffect(() => {
    initialize()
  }, [initialize])

  // Fetch profile whenever user changes
  useEffect(() => {
    if (user) {
      fetchProfile(user.id)
        .then(setProfile)
        .catch(() => {})
    }
  }, [user, setProfile])

  return (
    <Layout>
      <Routes>
        <Route path="/"              element={<HomePage />} />
        <Route path="/create"        element={<CreatePostPage />} />
        <Route path="/post/:id"      element={<PostDetailPage />} />
        <Route path="/profile/:username" element={<ProfilePage />} />
        <Route path="/search"        element={<SearchPage />} />
        <Route path="*"              element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

export default App
