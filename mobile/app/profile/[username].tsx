import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, ScrollView, Linking } from 'react-native'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchProfileByUsername, fetchUserPosts, followUser, unfollowUser, checkIsFollowing } from '@/lib/supabase'
import useAuthStore from '@/store/authStore'
import PostCard from '@/components/Post/PostCard'

export default function UserProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>()
  const { user }     = useAuthStore()
  const qc           = useQueryClient()

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile-by-username', username],
    queryFn: () => fetchProfileByUsername(username),
  })

  const { data: posts = [], isLoading: postsLoading } = useQuery({
    queryKey: ['user-posts', profile?.id],
    queryFn: () => fetchUserPosts(profile!.id),
    enabled: !!profile,
  })

  const { data: isFollowing = false } = useQuery({
    queryKey: ['is-following', user?.id, profile?.id],
    queryFn: () => checkIsFollowing(user!.id, profile!.id),
    enabled: !!user && !!profile && user.id !== profile.id,
  })

  const followMut = useMutation({
    mutationFn: () => followUser(user!.id, profile!.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['is-following', user?.id, profile?.id] }),
  })

  const unfollowMut = useMutation({
    mutationFn: () => unfollowUser(user!.id, profile!.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['is-following', user?.id, profile?.id] }),
  })

  const isOwn = user?.id === profile?.id

  if (profileLoading) {
    return (
      <SafeAreaView className="flex-1 bg-surface items-center justify-center" edges={['top']}>
        <ActivityIndicator color="#f97316" />
      </SafeAreaView>
    )
  }

  if (!profile) {
    return (
      <SafeAreaView className="flex-1 bg-surface items-center justify-center px-6" edges={['top']}>
        <Text className="text-4xl mb-3">👤</Text>
        <Text className="text-muted">Utente non trovato.</Text>
        <TouchableOpacity onPress={() => router.back()} className="bg-accent px-4 py-2 rounded-xl mt-4">
          <Text className="text-white font-semibold">Torna indietro</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  const p = profile

  const header = (
    <View>
      {/* Back */}
      <TouchableOpacity
        onPress={() => router.back()}
        className="flex-row items-center gap-1.5 px-4 py-3"
      >
        <Ionicons name="arrow-back" size={18} color="#6b7280" />
        <Text className="text-muted text-sm">Indietro</Text>
      </TouchableOpacity>

      {/* Cover */}
      <View className="h-32 bg-surface-200">
        {p.cover_url && (
          <Image source={{ uri: p.cover_url }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
        )}
      </View>

      {/* Avatar + actions */}
      <View className="px-4 pb-4">
        <View className="flex-row items-end justify-between -mt-8 mb-3">
          <View className="w-16 h-16 rounded-full border-2 border-surface bg-surface-200 overflow-hidden items-center justify-center">
            {p.avatar_url
              ? <Image source={{ uri: p.avatar_url }} style={{ width: 64, height: 64 }} contentFit="cover" />
              : <Ionicons name="person" size={28} color="#6b7280" />}
          </View>

          {!isOwn && user && (
            <View className="pb-2">
              {isFollowing ? (
                <TouchableOpacity
                  onPress={() => unfollowMut.mutate()}
                  disabled={unfollowMut.isPending}
                  className="px-5 py-2 rounded-full border border-surface-300 bg-surface-200"
                >
                  <Text className="text-white text-sm font-semibold">Seguito</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() => followMut.mutate()}
                  disabled={followMut.isPending}
                  className="px-5 py-2 rounded-full bg-accent"
                >
                  <Text className="text-white text-sm font-semibold">Segui</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Stats */}
        <View className="flex-row gap-6 mb-3">
          <View className="items-center">
            <Text className="text-white font-bold text-base">{posts.length}</Text>
            <Text className="text-muted text-xs">Reviews</Text>
          </View>
          <View className="items-center">
            <Text className="text-white font-bold text-base">{p.followers_count ?? 0}</Text>
            <Text className="text-muted text-xs">Follower</Text>
          </View>
          <View className="items-center">
            <Text className="text-white font-bold text-base">{p.following_count ?? 0}</Text>
            <Text className="text-muted text-xs">Seguiti</Text>
          </View>
        </View>

        <Text className="text-white font-bold text-lg">@{p.username}</Text>
        {p.bio && <Text className="text-muted text-sm mt-1">{p.bio}</Text>}
        {p.spotify_profile_url && (
          <TouchableOpacity
            onPress={() => Linking.openURL(p.spotify_profile_url)}
            className="flex-row items-center gap-1.5 mt-2"
          >
            <Ionicons name="musical-note" size={14} color="#1DB954" />
            <Text style={{ color: '#1DB954', fontSize: 13, fontWeight: '600' }}>Profilo Spotify</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Reviews header */}
      <View className="flex-row items-center gap-2 px-4 pb-2">
        <Text className="text-white font-bold text-base">Reviews</Text>
        <View className="bg-surface-200 px-2 py-0.5 rounded-full">
          <Text className="text-muted text-xs">{posts.length}</Text>
        </View>
      </View>
    </View>
  )

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      {postsLoading ? (
        <>
          {header}
          <ActivityIndicator color="#f97316" style={{ marginTop: 24 }} />
        </>
      ) : posts.length === 0 ? (
        <ScrollView>
          {header}
          <View className="items-center py-16 px-6">
            <Ionicons name="musical-notes-outline" size={40} color="#6b7280" />
            <Text className="text-white font-semibold mt-3">Nessuna recensione ancora</Text>
            <Text className="text-muted text-sm mt-1 text-center">
              {isOwn ? 'Scrivi la tua prima recensione!' : 'Nessuna recensione per ora.'}
            </Text>
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={header}
          renderItem={({ item }) => (
            <View className="px-4 mb-3">
              <PostCard post={item} compact />
            </View>
          )}
          contentContainerStyle={{ paddingBottom: 32 }}
        />
      )}
    </SafeAreaView>
  )
}
