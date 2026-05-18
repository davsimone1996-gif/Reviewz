import { useInfiniteQuery } from '@tanstack/react-query'
import { useInView } from 'react-intersection-observer'
import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Music2, PlusCircle } from 'lucide-react'
import PostCard from '../Post/PostCard'
import Spinner from '../UI/Spinner'
import { fetchFeedPosts, fetchPublicFeed } from '../../lib/supabase'
import useAuthStore from '../../store/authStore'

// mode: 'following' | 'trending'
export default function Feed({ mode = 'following' }) {
  const { user } = useAuthStore()
  const { ref, inView } = useInView({ threshold: 0.1 })

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['feed', mode, user?.id],
    queryFn: ({ pageParam = 0 }) => {
      if (mode === 'following' && user) return fetchFeedPosts(user.id, pageParam)
      return fetchPublicFeed(pageParam)
    },
    getNextPageParam: (lastPage, pages) =>
      lastPage.length === 20 ? pages.length : undefined,
    initialPageParam: 0,
  })

  const posts = data?.pages.flat() ?? []

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) fetchNextPage()
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage])

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <Spinner className="w-8 h-8" />
      <p className="text-muted text-sm">Loading reviews…</p>
    </div>
  )

  if (!isLoading && posts.length === 0) return (
    <div className="card p-6 sm:p-12 flex flex-col items-center gap-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent/20 to-surface-200 flex items-center justify-center">
        <Music2 size={28} className="text-accent" />
      </div>
      <div>
        <p className="font-bold text-lg">
          {mode === 'following' ? 'Nothing in your feed yet' : 'No reviews yet'}
        </p>
        <p className="text-muted text-sm mt-1">
          {mode === 'following'
            ? 'Follow people to see their reviews here.'
            : 'Be the first to write a review!'}
        </p>
      </div>
      {user && (
        <Link to="/create" className="btn-primary flex items-center gap-2">
          <PlusCircle size={15} /> Write a Review
        </Link>
      )}
    </div>
  )

  return (
    <div className="space-y-3">
      {posts.map((post, i) => (
        <div key={post.id} style={{ animationDelay: `${Math.min(i, 5) * 0.06}s` }}>
          <PostCard post={post} />
        </div>
      ))}

      <div ref={ref} className="h-4" />

      {isFetchingNextPage && (
        <div className="flex justify-center py-4">
          <Spinner className="w-5 h-5" />
        </div>
      )}

      {!hasNextPage && posts.length > 5 && (
        <p className="text-center text-xs text-muted py-4">You've seen it all ✓</p>
      )}
    </div>
  )
}
