import { useState } from 'react'
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, Image } from 'react-native'
import { useInfiniteQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { fetchFeedPosts, fetchPublicFeed } from '@/lib/supabase'
import useAuthStore from '@/store/authStore'
import PostCard from '@/components/Post/PostCard'
import AuthModal from '@/components/Auth/AuthModal'

const TABS = [
  { id: 'following', label: 'Follower' },
  { id: 'trending',  label: 'Trending' },
] as const

type TabId = typeof TABS[number]['id']

export default function HomeScreen() {
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState<TabId>('following')
  const [showAuth, setShowAuth] = useState(false)

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ['feed', activeTab, user?.id],
    queryFn: ({ pageParam = 0 }) => {
      if (activeTab === 'following' && user) return fetchFeedPosts(user.id, pageParam as number)
      return fetchPublicFeed(pageParam as number)
    },
    getNextPageParam: (lastPage: any[], pages: any[][]) =>
      lastPage.length === 20 ? pages.length : undefined,
    initialPageParam: 0,
  })

  const posts = data?.pages.flat() ?? []

  if (!user) {
    return (
      <SafeAreaView className="flex-1 bg-surface items-center justify-center px-6">
        <View className="w-16 h-16 rounded-2xl bg-accent/20 items-center justify-center mb-4">
          <Ionicons name="musical-notes" size={28} color="#f97316" />
        </View>
        <Text className="text-white text-xl font-bold mb-2 text-center">Music you love,{'\n'}reviews you trust.</Text>
        <Text className="text-muted text-sm text-center mb-6">Scopri, vota e condividi i tuoi brani e album preferiti.</Text>
        <TouchableOpacity
          onPress={() => setShowAuth(true)}
          className="bg-accent px-8 py-3 rounded-xl"
        >
          <Text className="text-white font-semibold">Inizia</Text>
        </TouchableOpacity>
        {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3">
        <Text className="text-white text-xl font-bold">Reviewz</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/search')}>
          <Ionicons name="search" size={22} color="#6b7280" />
        </TouchableOpacity>
      </View>

      {/* Feed tabs */}
      <View className="flex-row gap-1 bg-surface-200/50 p-1 mx-4 rounded-2xl mb-3">
        {TABS.map(({ id, label }) => (
          <TouchableOpacity
            key={id}
            onPress={() => setActiveTab(id)}
            className={`flex-1 py-2 rounded-xl items-center ${activeTab === id ? 'bg-surface-100' : ''}`}
          >
            <Text className={`text-sm font-semibold ${activeTab === id ? 'text-white' : 'text-muted'}`}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#f97316" />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <PostCard post={item} />}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 12, paddingBottom: 32 }}
          onEndReached={() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage() }}
          onEndReachedThreshold={0.3}
          ListFooterComponent={isFetchingNextPage ? <ActivityIndicator color="#f97316" style={{ padding: 16 }} /> : null}
          ListEmptyComponent={
            <View className="items-center py-16">
              <Ionicons name="musical-notes-outline" size={40} color="#6b7280" />
              <Text className="text-white font-semibold mt-3">Nessuna recensione</Text>
              <Text className="text-muted text-sm mt-1 text-center">
                {activeTab === 'following' ? 'Segui persone per vedere le loro recensioni.' : 'Sii il primo a scrivere una recensione!'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  )
}
