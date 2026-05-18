import { useState } from 'react'
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, ScrollView, Linking } from 'react-native'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import { fetchProfile, fetchUserPosts } from '@/lib/supabase'
import useAuthStore from '@/store/authStore'
import PostCard from '@/components/Post/PostCard'
import AuthModal from '@/components/Auth/AuthModal'

export default function ProfileScreen() {
  const { user, logout } = useAuthStore()
  const [showAuth, setShowAuth] = useState(false)

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => fetchProfile(user!.id),
    enabled: !!user,
  })

  const { data: posts = [], isLoading: postsLoading } = useQuery({
    queryKey: ['user-posts', user?.id],
    queryFn: () => fetchUserPosts(user!.id),
    enabled: !!user,
  })

  if (!user) {
    return (
      <SafeAreaView className="flex-1 bg-surface items-center justify-center px-6" edges={['top']}>
        <View className="w-16 h-16 rounded-2xl bg-accent/20 items-center justify-center mb-4">
          <Ionicons name="person-outline" size={28} color="#f97316" />
        </View>
        <Text className="text-white text-xl font-bold mb-2 text-center">Il tuo profilo</Text>
        <Text className="text-muted text-sm text-center mb-6">Accedi per vedere le tue recensioni e il tuo profilo.</Text>
        <TouchableOpacity onPress={() => setShowAuth(true)} className="bg-accent px-8 py-3 rounded-xl">
          <Text className="text-white font-semibold">Accedi</Text>
        </TouchableOpacity>
        {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      </SafeAreaView>
    )
  }

  if (profileLoading) {
    return (
      <SafeAreaView className="flex-1 bg-surface items-center justify-center" edges={['top']}>
        <ActivityIndicator color="#f97316" />
      </SafeAreaView>
    )
  }

  const p = profile ?? {}

  const header = (
    <View>
      {/* Cover */}
      <View className="h-32 bg-surface-200 relative">
        {p.cover_url ? (
          <Image source={{ uri: p.cover_url }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
        ) : (
          <View className="w-full h-full bg-gradient-to-br" style={{ backgroundColor: '#1a1a2e' }} />
        )}
        {/* Settings button */}
        <TouchableOpacity
          onPress={logout}
          className="absolute top-3 right-3 bg-black/40 rounded-full p-2"
        >
          <Ionicons name="log-out-outline" size={18} color="white" />
        </TouchableOpacity>
      </View>

      {/* Avatar + info */}
      <View className="px-4 pb-4">
        <View className="flex-row items-end justify-between -mt-8 mb-3">
          <View className="w-16 h-16 rounded-full border-2 border-surface bg-surface-200 overflow-hidden items-center justify-center">
            {p.avatar_url
              ? <Image source={{ uri: p.avatar_url }} style={{ width: 64, height: 64 }} contentFit="cover" />
              : <Ionicons name="person" size={28} color="#6b7280" />}
          </View>
          <View className="flex-row gap-6 pb-2">
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
            <Text className="text-muted text-sm mt-1 text-center">Scrivi la tua prima recensione!</Text>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/create')}
              className="bg-accent px-6 py-2.5 rounded-xl mt-4"
            >
              <Text className="text-white font-semibold text-sm">Scrivi una recensione</Text>
            </TouchableOpacity>
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
