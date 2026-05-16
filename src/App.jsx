import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout/Layout'
import HomePage from './pages/HomePage'
import CreatePostPage from './pages/CreatePostPage'
import PostDetailPage from './pages/PostDetailPage'
import ProfilePage from './pages/ProfilePage'
import SearchPage from './pages/SearchPage'
import NewReleasesPage from './pages/NewReleasesPage'
import SpotifyCallbackPage from './pages/SpotifyCallbackPage'
import NotificationsPage from './pages/NotificationsPage'
import useAuthStore from './store/authStore'
import { fetchProfile } from './lib/supabase'

function App() {
  const { initialize, user, loading, setProfile } = useAuthStore()

  useEffect(() => {
    initialize()
  }, [initialize])

  // Fetch profile only after session initialization is complete
  useEffect(() => {
    if (loading || !user) return
    fetchProfile(user.id)
      .then(setProfile)
      .catch(() => {})
  }, [user, loading, setProfile])

  return (
    <Layout>
      <Routes>
        <Route path="/"                  element={<HomePage />} />
        <Route path="/create"            element={<CreatePostPage />} />
        <Route path="/post/:id"          element={<PostDetailPage />} />
        <Route path="/profile/:username" element={<ProfilePage />} />
        <Route path="/search"            element={<SearchPage />} />
        <Route path="/nuove-uscite"      element={<NewReleasesPage />} />
        <Route path="/spotify-callback"  element={<SpotifyCallbackPage />} />
        <Route path="/notifications"     element={<NotificationsPage />} />
        <Route path="*"                  element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

export default App
