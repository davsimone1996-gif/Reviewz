import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useInView } from 'react-intersection-observer'
import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Music2, PlusCircle, Flame } from 'lucide-react'
import PostCard from '../Post/PostCard'
import Spinner from '../UI/Spinner'
import { fetchFeedPosts, fetchPublicFeed, fetchTrendingPosts } from '../../lib/supabase'
import useAuthStore from '../../store/authStore'

export default function Feed() {
  const { user } = useAuthStore()
  const { ref, inView } = useInView({ threshold: 0.1 })

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

  const followedPosts = data?.pages.flat() ?? []
  const followedIds   = new Set(followedPosts.map((p) => p.id))

  const { data: trending, isLoading: trendingLoading } = useQuery({
    queryKey: ['trending', user?.id],
    queryFn: () => fetchTrendingPosts(user ? [user.id] : [], 10),
    enabled: !isLoading,
    staleTime: 5 * 60 * 1000,
  })

  // Deduplicate: don't show trending posts already in the followed feed
  const trendingPosts = (trending ?? []).filter((p) => !followedIds.has(p.id))

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) fetchNextPage()
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage])

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <Spinner className="w-8 h-8" />
      <p className="text-muted text-sm">Loading reviews…</p>
    </div>
  )

  const isEmpty = followedPosts.length === 0 && trendingPosts.length === 0

  if (isEmpty && !trendingLoading) return (
    <div className="card p-6 sm:p-12 flex flex-col items-center gap-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent/20 to-surface-200 flex items-center justify-center">
        <Music2 size={28} className="text-accent" />
      </div>
      <div>
        <p className="font-bold text-lg">No reviews yet</p>
        <p className="text-muted text-sm mt-1">
          {user
            ? 'Follow people or write the first review!'
            : 'Sign in to see reviews from people you follow.'}
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
      {/* ── Followed feed (paginated) ───────────────────── */}
      {followedPosts.map((post, i) => (
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

      {/* ── Hot Today section ───────────────────────────── */}
      {!isLoading && !isFetchingNextPage && trendingPosts.length > 0 && (
        <div className="pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Flame size={16} className="text-orange-400" />
            <h2 className="text-sm font-bold text-muted uppercase tracking-wider">Hot Today</h2>
            <span className="text-xs text-muted">· last 24h</span>
          </div>
          <div className="space-y-3">
            {trendingPosts.map((post, i) => (
              <div key={post.id} style={{ animationDelay: `${i * 0.05}s` }}>
                <PostCard post={post} />
              </div>
            ))}
          </div>
        </div>
      )}

      {!hasNextPage && followedPosts.length > 5 && trendingPosts.length === 0 && (
        <p className="text-center text-xs text-muted py-4">You've seen it all ✓</p>
      )}
    </div>
  )
}
