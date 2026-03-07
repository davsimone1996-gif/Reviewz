import { useQuery } from '@tanstack/react-query'
import { fetchProfile, fetchProfileByUsername, checkIsFollowing } from '../lib/supabase'
import useAuthStore from '../store/authStore'

export function useProfile(userId) {
  return useQuery({
    queryKey: ['profile-by-id', userId],
    queryFn: () => fetchProfile(userId),
    enabled: !!userId,
  })
}

export function useProfileByUsername(username) {
  return useQuery({
    queryKey: ['profile', username],
    queryFn: () => fetchProfileByUsername(username),
    enabled: !!username,
  })
}

export function useIsFollowing(targetId) {
  const { user } = useAuthStore()
  return useQuery({
    queryKey: ['following', user?.id, targetId],
    queryFn: () => checkIsFollowing(user.id, targetId),
    enabled: !!user && !!targetId && user.id !== targetId,
  })
}
