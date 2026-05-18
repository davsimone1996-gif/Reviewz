import { useState } from 'react'
import { View, Text, TouchableOpacity, Linking } from 'react-native'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { formatDistanceToNow } from 'date-fns'
import { likePost, unlikePost } from '@/lib/supabase'
import { useQueryClient } from '@tanstack/react-query'
import useAuthStore from '@/store/authStore'

function ratingColors(r: number) {
  if (r >= 8) return { text: '#34d399', bg: 'rgba(52,211,153,0.12)' }
  if (r >= 6) return { text: '#fbbf24', bg: 'rgba(251,191,36,0.12)' }
  if (r >= 4) return { text: '#fb923c', bg: 'rgba(251,146,60,0.12)' }
  return { text: '#f87171', bg: 'rgba(248,113,113,0.12)' }
}

export default function PostCard({ post, compact = false }: { post: any; compact?: boolean }) {
  const [liked, setLiked]   = useState(false)
  const [likes, setLikes]   = useState(post.likes_count ?? 0)
  const [busy, setBusy]     = useState(false)
  const { user }            = useAuthStore()
  const qc                  = useQueryClient()

  const handleLike = async () => {
    if (!user || busy) return
    setBusy(true)
    try {
      if (liked) {
        await unlikePost(user.id, post.id)
        setLiked(false)
        setLikes((l: number) => l - 1)
      } else {
        await likePost(user.id, post.id)
        setLiked(true)
        setLikes((l: number) => l + 1)
      }
      qc.invalidateQueries({ queryKey: ['feed'] })
    } finally {
      setBusy(false)
    }
  }

  const profile = post.profiles
  const ratingColor = ratingColors(post.rating)

  return (
    <View className="bg-surface-100 rounded-2xl overflow-hidden border border-surface-200">
      <TouchableOpacity onPress={() => router.push(`/post/${post.id}`)} activeOpacity={0.8}>
        <View className="flex-row">
          {/* Cover art */}
          <View className="w-24 bg-surface-200 items-center justify-center" style={{ minHeight: 110 }}>
            {post.cover_url ? (
              <Image
                source={{ uri: post.cover_url }}
                style={{ width: 96, height: '100%', minHeight: 110 }}
                contentFit="cover"
              />
            ) : (
              <Ionicons name={post.spotify_type === 'track' ? 'musical-note' : 'disc'} size={28} color="#6b7280" />
            )}
          </View>

          {/* Content */}
          <View className="flex-1 min-w-0 p-3 justify-between">
            <View>
              <View className="flex-row items-start justify-between gap-2 mb-1">
                <View className="flex-1 min-w-0">
                  <Text className="text-white font-bold text-sm" numberOfLines={1}>{post.title}</Text>
                  <TouchableOpacity onPress={() => router.push(`/artist/${encodeURIComponent(post.artist)}`)}>
                    <Text className="text-muted text-xs" numberOfLines={1}>{post.artist}</Text>
                  </TouchableOpacity>
                </View>
                <View className="px-2 py-1 rounded-lg shrink-0" style={{ backgroundColor: ratingColor.bg }}>
                  <Text className="font-bold text-sm" style={{ color: ratingColor.text }}>
                    {post.rating?.toFixed(1)}
                  </Text>
                </View>
              </View>

              {!compact && post.review_text ? (
                <Text className="text-gray-400 text-xs leading-relaxed mt-1" numberOfLines={2}>
                  {post.review_text}
                </Text>
              ) : null}
            </View>

            {/* Author + time */}
            <View className="flex-row items-center justify-between mt-2 pt-2 border-t border-surface-200/50">
              <TouchableOpacity
                onPress={() => router.push(`/profile/${profile?.username}`)}
                className="flex-row items-center gap-2"
              >
                <View className="w-5 h-5 rounded-full bg-surface-200 items-center justify-center overflow-hidden">
                  {profile?.avatar_url
                    ? <Image source={{ uri: profile.avatar_url }} style={{ width: 20, height: 20 }} contentFit="cover" />
                    : <Ionicons name="person" size={10} color="#6b7280" />}
                </View>
                <Text className="text-white text-xs font-semibold">{profile?.username}</Text>
              </TouchableOpacity>
              <Text className="text-muted text-[10px]">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>

      {/* Action bar */}
      <View className="border-t border-surface-200/40 px-4 py-2 flex-row items-center gap-5">
        <TouchableOpacity
          onPress={handleLike}
          disabled={!user || busy}
          className="flex-row items-center gap-1.5"
        >
          <Ionicons
            name={liked ? 'heart' : 'heart-outline'}
            size={15}
            color={liked ? '#f87171' : '#6b7280'}
          />
          {likes > 0 && <Text className={`text-xs font-semibold ${liked ? 'text-red-400' : 'text-muted'}`}>{likes}</Text>}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push(`/post/${post.id}`)}
          className="flex-row items-center gap-1.5"
        >
          <Ionicons name="chatbubble-outline" size={14} color="#6b7280" />
          {post.comments_count > 0 && <Text className="text-muted text-xs font-semibold">{post.comments_count}</Text>}
        </TouchableOpacity>

        <View className="flex-1" />

        <TouchableOpacity
          onPress={() => post.spotify_url && Linking.openURL(post.spotify_url)}
          className="flex-row items-center gap-1"
        >
          <Ionicons name="play" size={11} color="#1DB954" />
          <Text style={{ color: '#1DB954', fontSize: 11 }}>Spotify</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
