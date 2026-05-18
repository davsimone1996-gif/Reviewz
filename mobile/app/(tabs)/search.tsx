import { useState } from 'react'
import { View, Text, TextInput, FlatList, TouchableOpacity, ActivityIndicator, Linking } from 'react-native'
import { Image } from 'expo-image'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { searchSpotify, searchArtists } from '@/lib/spotify'
import { searchProfiles } from '@/lib/supabase'
import useAuthStore from '@/store/authStore'

export default function SearchScreen() {
  const { user } = useAuthStore()
  const [query, setQuery] = useState('')
  const [submitted, setSubmitted] = useState('')

  const { data: musicData, isLoading: musicLoading } = useQuery({
    queryKey: ['spotify-search', submitted],
    queryFn: () => searchSpotify(submitted, 'both', 8),
    enabled: submitted.length > 1,
  })

  const { data: artistData, isLoading: artistLoading } = useQuery({
    queryKey: ['artist-search', submitted],
    queryFn: () => searchArtists(submitted, 5),
    enabled: submitted.length > 1,
  })

  const { data: profilesData } = useQuery({
    queryKey: ['profiles-search', submitted],
    queryFn: () => searchProfiles(submitted),
    enabled: submitted.length > 1,
  })

  const tracks   = musicData?.tracks   ?? []
  const albums   = musicData?.albums   ?? []
  const artists  = artistData          ?? []
  const profiles = profilesData        ?? []
  const isLoading = musicLoading || artistLoading

  const sections: any[] = []
  if (profiles.length)  sections.push({ type: 'section', label: 'Utenti', icon: 'people' }, ...profiles.map((p: any) => ({ type: 'profile', ...p })))
  if (artists.length)   sections.push({ type: 'section', label: 'Artisti', icon: 'mic' }, ...artists.map((a: any) => ({ type: 'artist', ...a })))
  if (tracks.length)    sections.push({ type: 'section', label: 'Brani', icon: 'musical-note' }, ...tracks.map((t: any) => ({ type: 'track', ...t })))
  if (albums.length)    sections.push({ type: 'section', label: 'Album', icon: 'disc' }, ...albums.map((a: any) => ({ type: 'album', ...a })))

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="px-4 pt-3 pb-2">
        <Text className="text-white text-xl font-bold mb-3">Cerca</Text>
        <View className="flex-row gap-2">
          <View className="flex-1 bg-surface-200 rounded-xl flex-row items-center px-3 gap-2">
            <Ionicons name="search" size={16} color="#6b7280" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={() => setSubmitted(query.trim())}
              placeholder="Artista, brano, album o username…"
              placeholderTextColor="#6b7280"
              className="flex-1 text-white py-3 text-sm"
              returnKeyType="search"
              autoCorrect={false}
            />
          </View>
          <TouchableOpacity
            onPress={() => setSubmitted(query.trim())}
            className="bg-accent px-4 rounded-xl items-center justify-center"
          >
            <Text className="text-white font-semibold text-sm">Cerca</Text>
          </TouchableOpacity>
        </View>
      </View>

      {!submitted ? (
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="search-outline" size={48} color="#6b7280" />
          <Text className="text-white font-semibold mt-3">Cerca qualsiasi cosa</Text>
          <Text className="text-muted text-sm mt-1 text-center">Brani, album, artisti o utenti</Text>
        </View>
      ) : isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#f97316" />
        </View>
      ) : (
        <FlatList
          data={sections}
          keyExtractor={(item, i) => `${item.type}-${i}`}
          contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 32 }}
          renderItem={({ item }) => {
            if (item.type === 'section') return (
              <View className="flex-row items-center gap-2 mt-2 mb-1">
                <Ionicons name={item.icon as any} size={13} color="#6b7280" />
                <Text className="text-muted text-xs font-bold uppercase tracking-wider">{item.label}</Text>
              </View>
            )

            if (item.type === 'profile') return (
              <TouchableOpacity
                onPress={() => router.push(`/profile/${item.username}`)}
                className="bg-surface-100 rounded-2xl p-4 flex-row items-center gap-3 border border-surface-200"
                activeOpacity={0.8}
              >
                <View className="w-10 h-10 rounded-full bg-surface-200 items-center justify-center">
                  {item.avatar_url
                    ? <Image source={{ uri: item.avatar_url }} style={{ width: 40, height: 40, borderRadius: 20 }} />
                    : <Ionicons name="person" size={18} color="#6b7280" />}
                </View>
                <Text className="text-white font-semibold flex-1">@{item.username}</Text>
              </TouchableOpacity>
            )

            if (item.type === 'artist') return (
              <TouchableOpacity
                onPress={() => router.push(`/artist/${encodeURIComponent(item.artist_name)}`)}
                className="bg-surface-100 rounded-2xl p-4 flex-row items-center gap-3 border border-surface-200"
                activeOpacity={0.8}
              >
                {item.artist_image_url
                  ? <Image source={{ uri: item.artist_image_url }} style={{ width: 48, height: 48, borderRadius: 24 }} contentFit="cover" />
                  : <View className="w-12 h-12 rounded-full bg-surface-200 items-center justify-center"><Ionicons name="mic" size={20} color="#6b7280" /></View>}
                <View className="flex-1 min-w-0">
                  <Text className="text-white font-semibold" numberOfLines={1}>{item.artist_name}</Text>
                  {item.genres?.length > 0 && <Text className="text-muted text-xs" numberOfLines={1}>{item.genres.join(' · ')}</Text>}
                </View>
                <Ionicons name="chevron-forward" size={16} color="#6b7280" />
              </TouchableOpacity>
            )

            // track or album
            return (
              <View className="bg-surface-100 rounded-2xl p-4 flex-row items-center gap-3 border border-surface-200">
                {item.cover_url
                  ? <Image source={{ uri: item.cover_url }} style={{ width: 48, height: 48, borderRadius: 12 }} contentFit="cover" />
                  : <View className="w-12 h-12 rounded-xl bg-surface-200 items-center justify-center"><Ionicons name={item.type === 'track' ? 'musical-note' : 'disc'} size={20} color="#6b7280" /></View>}
                <View className="flex-1 min-w-0">
                  <Text className="text-white font-semibold text-sm" numberOfLines={1}>{item.title}</Text>
                  <Text className="text-muted text-xs" numberOfLines={1}>{item.artist}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => item.spotify_url && Linking.openURL(item.spotify_url)}
                  className="bg-[#1DB954]/10 p-2 rounded-xl"
                >
                  <Ionicons name="play" size={14} color="#1DB954" />
                </TouchableOpacity>
              </View>
            )
          }}
          ListEmptyComponent={
            <View className="items-center py-12">
              <Ionicons name="search-outline" size={40} color="#6b7280" />
              <Text className="text-white font-semibold mt-3">Nessun risultato</Text>
              <Text className="text-muted text-sm mt-1">per "{submitted}"</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  )
}
