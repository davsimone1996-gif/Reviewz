import { useQuery } from '@tanstack/react-query'
import { fetchPostById, fetchUserPosts } from '../lib/supabase'

export function usePost(postId) {
  return useQuery({
    queryKey: ['post', postId],
    queryFn: () => fetchPostById(postId),
    enabled: !!postId,
  })
}

export function useUserPosts(userId) {
  return useQuery({
    queryKey: ['user-posts', userId],
    queryFn: () => fetchUserPosts(userId),
    enabled: !!userId,
  })
}
