import { useInfiniteQuery } from '@tanstack/react-query'
import { useInView } from 'react-intersection-observer'
import { useEffect } from 'react'
import PostCard from '../Post/PostCard'
import Spinner from '../UI/Spinner'
import { fetchFeedPosts, fetchPublicFeed, fetchUserLikes } from '../../lib/supabase'
import useAuthStore from '../../store/authStore'

export default function Feed() {
  const { user } = useAuthStore()
  const { ref, inView } = useInView()

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['feed', user?.id],
    queryFn: ({ pageParam = 0 }) =>
      user ? fetchFeedPosts(user.id, pageParam) : fetchPublicFeed(pageParam),
    getNextPageParam: (lastPage, pages) =>
      lastPage.length === 20 ? pages.length : undefined,
    initialPageParam: 0,
  })

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) fetchNextPage()
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage])

  const posts = data?.pages.flat() ?? []

  if (isLoading) return (
    <div className="flex justify-center py-16">
      <Spinner className="w-8 h-8" />
    </div>
  )

  if (posts.length === 0) return (
    <div className="text-center py-16 text-muted">
      <p className="text-lg">No reviews yet.</p>
      {user && <p className="text-sm mt-1">Follow people or write the first review!</p>}
    </div>
  )

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
      <div ref={ref} className="h-4" />
      {isFetchingNextPage && (
        <div className="flex justify-center py-4">
          <Spinner className="w-6 h-6" />
        </div>
      )}
    </div>
  )
}
