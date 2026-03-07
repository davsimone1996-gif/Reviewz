import { useParams } from 'react-router-dom'
import { useProfileByUsername, useIsFollowing } from '../hooks/useProfile'
import { useUserPosts } from '../hooks/usePost'
import useAuthStore from '../store/authStore'
import ProfileHeader from '../components/Profile/ProfileHeader'
import PostCard from '../components/Post/PostCard'
import Spinner from '../components/UI/Spinner'

export default function ProfilePage() {
  const { username } = useParams()
  const { user } = useAuthStore()

  const { data: profile, isLoading: profLoading } = useProfileByUsername(username)
  const { data: isFollowing = false } = useIsFollowing(profile?.id)
  const { data: posts = [], isLoading: postsLoading } = useUserPosts(profile?.id)

  const isOwn = user?.id === profile?.id

  if (profLoading) return <div className="flex justify-center py-16"><Spinner className="w-8 h-8" /></div>
  if (!profile) return <div className="text-center py-16 text-muted">User not found.</div>

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <ProfileHeader profile={profile} isFollowing={isFollowing} isOwn={isOwn} />

      <div>
        <h2 className="text-lg font-semibold mb-4">Reviews ({posts.length})</h2>
        {postsLoading ? (
          <div className="flex justify-center py-8"><Spinner className="w-6 h-6" /></div>
        ) : posts.length === 0 ? (
          <div className="text-center py-8 text-muted card">
            {isOwn ? 'You haven\'t reviewed anything yet.' : 'No reviews yet.'}
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => <PostCard key={post.id} post={post} compact />)}
          </div>
        )}
      </div>
    </div>
  )
}
