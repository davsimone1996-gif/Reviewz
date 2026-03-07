import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, Zap, Edit2, Check, X } from 'lucide-react'
import { followUser, unfollowUser, updateProfile } from '../../lib/supabase'
import useAuthStore from '../../store/authStore'
import Avatar from '../UI/Avatar'
import ScoreBadge from '../UI/ScoreBadge'

export default function ProfileHeader({ profile, isFollowing, isOwn }) {
  const { user, setProfile: setStoreProfile } = useAuthStore()
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [bio, setBio]         = useState(profile.bio ?? '')

  const followMut = useMutation({
    mutationFn: () =>
      isFollowing
        ? unfollowUser(user.id, profile.id)
        : followUser(user.id, profile.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile', profile.username] }),
  })

  const editMut = useMutation({
    mutationFn: () => updateProfile(user.id, { bio }),
    onSuccess: (updated) => {
      setStoreProfile({ ...profile, ...updated })
      qc.invalidateQueries({ queryKey: ['profile', profile.username] })
      setEditing(false)
    },
  })

  return (
    <div className="card p-6">
      <div className="flex items-start gap-5">
        <Avatar src={profile.avatar_url} username={profile.username} size="xl" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">{profile.username}</h1>
            <ScoreBadge score={profile.social_score} />
          </div>

          <div className="flex gap-5 mt-2 text-sm">
            <span><strong>{profile.followers_count}</strong> <span className="text-muted">followers</span></span>
            <span><strong>{profile.following_count}</strong> <span className="text-muted">following</span></span>
          </div>

          {editing ? (
            <div className="mt-3 flex gap-2">
              <input
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="input text-sm flex-1"
                placeholder="Tell us about yourself…"
                maxLength={200}
              />
              <button onClick={() => editMut.mutate()} className="btn-primary px-3 py-1.5">
                <Check size={14} />
              </button>
              <button onClick={() => setEditing(false)} className="btn-secondary px-3 py-1.5">
                <X size={14} />
              </button>
            </div>
          ) : (
            <p className="text-muted text-sm mt-2">{profile.bio || (isOwn ? 'No bio yet — click Edit to add one.' : '')}</p>
          )}
        </div>

        <div className="shrink-0 flex gap-2">
          {isOwn && !editing && (
            <button onClick={() => setEditing(true)} className="btn-secondary flex items-center gap-1.5 text-sm py-1.5">
              <Edit2 size={14} /> Edit
            </button>
          )}
          {!isOwn && user && (
            <button
              onClick={() => followMut.mutate()}
              disabled={followMut.isPending}
              className={isFollowing ? 'btn-secondary text-sm py-1.5' : 'btn-primary text-sm py-1.5'}
            >
              {isFollowing ? 'Following' : '+ Follow'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
