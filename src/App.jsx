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
import { registerSW, subscribeToPush } from './lib/webPush'

function App() {
  const { initialize, user, loading, setProfile } = useAuthStore()

  useEffect(() => {
    initialize()
  }, [initialize])

  // Fetch profile + register push only after session is verified
  useEffect(() => {
    if (loading || !user) return
    fetchProfile(user.id).then(setProfile).catch(() => {})
    // Register SW immediately; subscribe to push after 4s (non-blocking)
    registerSW()
    const t = setTimeout(() => subscribeToPush(user.id), 4000)
    return () => clearTimeout(t)
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
