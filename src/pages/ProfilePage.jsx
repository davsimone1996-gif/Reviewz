import { useParams } from 'react-router-dom'
import { useProfileByUsername, useIsFollowing } from '../hooks/useProfile'
import { useUserPosts } from '../hooks/usePost'
import useAuthStore from '../store/authStore'
import ProfileHeader from '../components/Profile/ProfileHeader'
import PostCard from '../components/Post/PostCard'
import Spinner from '../components/UI/Spinner'
import { Music2 } from 'lucide-react'

export default function ProfilePage() {
  const { username } = useParams()
  const { user } = useAuthStore()

  const { data: profile, isLoading: profLoading } = useProfileByUsername(username)
  const { data: isFollowing = false }             = useIsFollowing(profile?.id)
  const { data: posts = [], isLoading: postsLoading } = useUserPosts(profile?.id)

  const isOwn = user?.id === profile?.id

  if (profLoading) return (
    <div className="flex justify-center py-24"><Spinner className="w-8 h-8" /></div>
  )
  if (!profile) return (
    <div className="text-center py-24">
      <p className="text-5xl mb-3">👤</p>
      <p className="text-muted">User not found.</p>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <ProfileHeader
        profile={profile}
        isFollowing={isFollowing}
        isOwn={isOwn}
        postCount={posts.length}
      />

      <div>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-bold">Reviews</h2>
          {!postsLoading && (
            <span className="badge bg-surface-200 text-muted">{posts.length}</span>
          )}
        </div>

        {postsLoading ? (
          <div className="flex justify-center py-8"><Spinner className="w-6 h-6" /></div>
        ) : posts.length === 0 ? (
          <div className="card p-10 flex flex-col items-center gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-surface-200 flex items-center justify-center">
              <Music2 size={24} className="text-muted" />
            </div>
            <p className="text-muted">
              {isOwn ? "You haven't reviewed anything yet." : "No reviews yet."}
            </p>
            {isOwn && (
              <a href="/create" className="btn-primary text-sm py-1.5 px-4">Write your first review</a>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post, i) => (
              <div key={post.id} className={`stagger-${Math.min(i + 1, 4)}`}>
                <PostCard post={post} compact />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
