import { useState } from 'react'
import {
  View, Text, TouchableOpacity, ScrollView, ActivityIndicator,
  TextInput, Linking, Alert, KeyboardAvoidingView, Platform,
} from 'react-native'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import {
  fetchPostById, fetchComments, createComment, deleteComment,
  likePost, unlikePost, deletePost,
} from '@/lib/supabase'
import useAuthStore from '@/store/authStore'

function ratingColor(r: number) {
  if (r >= 8) return '#34d399'
  if (r >= 6) return '#fbbf24'
  if (r >= 4) return '#fb923c'
  return '#f87171'
}

export default function PostDetailScreen() {
  const { id }   = useLocalSearchParams<{ id: string }>()
  const { user } = useAuthStore()
  const qc       = useQueryClient()

  const [liked, setLiked]       = useState(false)
  const [comment, setComment]   = useState('')
  const [posting, setPosting]   = useState(false)

  const { data: post, isLoading } = useQuery({
    queryKey: ['post', id],
    queryFn: () => fetchPostById(id),
  })

  const { data: comments = [], refetch: refetchComments } = useQuery({
    queryKey: ['comments', id],
    queryFn: () => fetchComments(id),
    enabled: !!id,
  })

  const deleteMut = useMutation({
    mutationFn: () => deletePost(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['feed'] })
      router.back()
    },
  })

  const handleLike = async () => {
    if (!user || !post) return
    if (liked) {
      await unlikePost(user.id, post.id)
      setLiked(false)
    } else {
      await likePost(user.id, post.id)
      setLiked(true)
    }
  }

  const handleComment = async () => {
    if (!user || !comment.trim()) return
    setPosting(true)
    try {
      await createComment(id, user.id, comment.trim())
      setComment('')
      refetchComments()
    } finally {
      setPosting(false)
    }
  }

  const handleDelete = () => {
    Alert.alert('Elimina recensione', 'Sei sicuro?', [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Elimina', style: 'destructive', onPress: () => deleteMut.mutate() },
    ])
  }

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-surface items-center justify-center" edges={['top']}>
        <ActivityIndicator color="#f97316" />
      </SafeAreaView>
    )
  }

  if (!post) {
    return (
      <SafeAreaView className="flex-1 bg-surface items-center justify-center px-6" edges={['top']}>
        <Text className="text-4xl mb-3">🎵</Text>
        <Text className="text-muted">Recensione non trovata.</Text>
        <TouchableOpacity onPress={() => router.back()} className="bg-accent px-4 py-2 rounded-xl mt-4">
          <Text className="text-white font-semibold">Torna indietro</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  const p = post.profiles
  const likesTotal = post.likes_count + (liked ? 1 : 0)

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
          {/* Back */}
          <TouchableOpacity
            onPress={() => router.back()}
            className="flex-row items-center gap-1.5 px-4 py-3"
          >
            <Ionicons name="arrow-back" size={18} color="#6b7280" />
            <Text className="text-muted text-sm">Indietro</Text>
          </TouchableOpacity>

          {/* Hero */}
          <View className="h-52 relative">
            {post.cover_url ? (
              <>
                <Image
                  source={{ uri: post.cover_url }}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
                  contentFit="cover"
                  blurRadius={20}
                />
                <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)' }} />
              </>
            ) : (
              <View className="absolute inset-0 bg-surface-200" />
            )}
            <View className="absolute bottom-0 left-0 right-0 p-4 flex-row items-end gap-4">
              {post.cover_url && (
                <Image
                  source={{ uri: post.cover_url }}
                  style={{ width: 88, height: 88, borderRadius: 14 }}
                  contentFit="cover"
                />
              )}
              <View className="flex-1 min-w-0">
                <View className="flex-row items-center gap-2 mb-1">
                  <View className="bg-black/40 rounded-full px-2 py-0.5 flex-row items-center gap-1">
                    <Ionicons
                      name={post.spotify_type === 'track' ? 'musical-note' : 'disc'}
                      size={9}
                      color="rgba(255,255,255,0.7)"
                    />
                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 9 }}>
                      {post.spotify_type === 'track' ? 'Track' : 'Album'}
                    </Text>
                  </View>
                </View>
                <Text className="text-white font-bold text-lg leading-tight" numberOfLines={2}>{post.title}</Text>
                <TouchableOpacity onPress={() => router.push(`/artist/${encodeURIComponent(post.artist)}`)}>
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }} numberOfLines={1}>{post.artist}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View className="px-4 py-5 gap-5">
            {/* Rating + Spotify */}
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <View className="px-3 py-1.5 rounded-xl" style={{ backgroundColor: ratingColor(post.rating) + '22' }}>
                  <Text className="font-bold text-xl" style={{ color: ratingColor(post.rating) }}>
                    {post.rating?.toFixed(1)}
                  </Text>
                </View>
                <Text className="text-muted text-sm">/ 10</Text>
              </View>
              <TouchableOpacity
                onPress={() => post.spotify_url && Linking.openURL(post.spotify_url)}
                className="flex-row items-center gap-1.5"
              >
                <Ionicons name="open-outline" size={14} color="#1DB954" />
                <Text style={{ color: '#1DB954', fontSize: 13, fontWeight: '600' }}>Apri in Spotify</Text>
              </TouchableOpacity>
            </View>

            {/* Review text */}
            <View className="bg-surface-200/40 rounded-xl p-4 border border-surface-300/30">
              <Text className="text-gray-200 leading-relaxed text-[15px]">{post.review_text}</Text>
            </View>

            {/* Author */}
            <View className="flex-row items-center justify-between">
              <TouchableOpacity
                onPress={() => router.push(`/profile/${p?.username}`)}
                className="flex-row items-center gap-3"
              >
                <View className="w-10 h-10 rounded-full bg-surface-200 items-center justify-center overflow-hidden">
                  {p?.avatar_url
                    ? <Image source={{ uri: p.avatar_url }} style={{ width: 40, height: 40 }} contentFit="cover" />
                    : <Ionicons name="person" size={18} color="#6b7280" />}
                </View>
                <View>
                  <Text className="text-white font-semibold">{p?.username}</Text>
                  <Text className="text-muted text-xs">
                    {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                  </Text>
                </View>
              </TouchableOpacity>

              {user?.id === post.user_id && (
                <TouchableOpacity onPress={handleDelete} disabled={deleteMut.isPending}>
                  {deleteMut.isPending
                    ? <ActivityIndicator size="small" color="#6b7280" />
                    : <Ionicons name="trash-outline" size={18} color="#6b7280" />}
                </TouchableOpacity>
              )}
            </View>

            {/* Like */}
            <View className="flex-row items-center gap-4 pt-1 border-t border-surface-200/40">
              <TouchableOpacity
                onPress={handleLike}
                disabled={!user}
                className="flex-row items-center gap-2"
              >
                <Ionicons name={liked ? 'heart' : 'heart-outline'} size={20} color={liked ? '#f87171' : '#6b7280'} />
                <Text className={`font-semibold text-sm ${liked ? 'text-red-400' : 'text-muted'}`}>
                  {likesTotal} {likesTotal === 1 ? 'like' : 'likes'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Comments */}
            <View className="gap-3">
              <Text className="text-white font-bold">Commenti ({comments.length})</Text>

              {comments.map((c: any) => (
                <View key={c.id} className="flex-row gap-3">
                  <View className="w-7 h-7 rounded-full bg-surface-200 items-center justify-center overflow-hidden shrink-0">
                    {c.profiles?.avatar_url
                      ? <Image source={{ uri: c.profiles.avatar_url }} style={{ width: 28, height: 28 }} contentFit="cover" />
                      : <Ionicons name="person" size={12} color="#6b7280" />}
                  </View>
                  <View className="flex-1 bg-surface-200/50 rounded-xl p-2.5 gap-0.5">
                    <Text className="text-white text-xs font-semibold">{c.profiles?.username}</Text>
                    <Text className="text-gray-300 text-sm">{c.content}</Text>
                  </View>
                </View>
              ))}

              {comments.length === 0 && (
                <Text className="text-muted text-sm text-center py-4">Nessun commento ancora.</Text>
              )}
            </View>
          </View>
        </ScrollView>

        {/* Comment input */}
        {user && (
          <View className="absolute bottom-0 left-0 right-0 px-4 py-3 border-t border-surface-200 bg-surface">
            <View className="flex-row items-center gap-2">
              <TextInput
                value={comment}
                onChangeText={setComment}
                placeholder="Aggiungi un commento…"
                placeholderTextColor="#6b7280"
                className="flex-1 bg-surface-200 rounded-xl px-3 py-2.5 text-white text-sm"
                multiline
              />
              <TouchableOpacity
                onPress={handleComment}
                disabled={!comment.trim() || posting}
                className="bg-accent w-10 h-10 rounded-xl items-center justify-center"
                style={{ opacity: comment.trim() ? 1 : 0.4 }}
              >
                {posting
                  ? <ActivityIndicator size="small" color="white" />
                  : <Ionicons name="send" size={16} color="white" />}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
