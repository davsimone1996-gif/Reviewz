import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, FlatList, Linking } from 'react-native'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { searchArtists, getArtist, getArtistAlbums, getArtistLatestRelease } from '@/lib/spotify'
import { fetchPostsByArtistName, isFollowingArtist, followArtist, unfollowArtist } from '@/lib/supabase'
import useAuthStore from '@/store/authStore'

function formatFollowers(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return n.toString()
}

function rankSongs(posts: any[], topN = 5) {
  const map: Record<string, any> = {}
  for (const p of posts) {
    if (p.spotify_type !== 'track') continue
    if (!map[p.spotify_id]) {
      map[p.spotify_id] = { ...p, count: 0, totalRating: 0 }
    }
    map[p.spotify_id].count++
    map[p.spotify_id].totalRating += p.rating ?? 0
  }
  return Object.values(map)
    .sort((a, b) => b.count - a.count || b.totalRating - a.totalRating)
    .slice(0, topN)
}

function FollowButton({ user, artist }: { user: any; artist: any }) {
  const qc = useQueryClient()
  const key = ['artist-following', user?.id, artist?.spotify_artist_id]

  const { data: following, isLoading } = useQuery({
    queryKey: key,
    queryFn: () => isFollowingArtist(user.id, artist.spotify_artist_id),
    enabled: !!user && !!artist,
    staleTime: 1000 * 60 * 5,
  })

  const mutFollow = useMutation({
    mutationFn: async () => {
      const latest = await getArtistLatestRelease(artist.spotify_artist_id)
      await followArtist(user.id, artist, latest)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  })

  const mutUnfollow = useMutation({
    mutationFn: () => unfollowArtist(user.id, artist.spotify_artist_id),
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  })

  if (!user) return null
  if (isLoading) return <View className="w-28 h-9 rounded-full bg-white/10" />

  return following ? (
    <TouchableOpacity
      onPress={() => mutUnfollow.mutate()}
      disabled={mutUnfollow.isPending}
      className="px-5 py-2 rounded-full border border-white/30 bg-white/20"
    >
      <Text className="text-white text-sm font-semibold">Following</Text>
    </TouchableOpacity>
  ) : (
    <TouchableOpacity
      onPress={() => mutFollow.mutate()}
      disabled={mutFollow.isPending}
      className="px-5 py-2 rounded-full bg-accent"
    >
      <Text className="text-white text-sm font-semibold">Follow</Text>
    </TouchableOpacity>
  )
}

export default function ArtistScreen() {
  const { name: encodedName } = useLocalSearchParams<{ name: string }>()
  const artistName = decodeURIComponent(encodedName)
  const { user } = useAuthStore()

  const { data: artistData, isLoading: loadingArtist, error: artistError } = useQuery({
    queryKey: ['spotify-artist-by-name', artistName],
    queryFn: async () => {
      const results = await searchArtists(artistName, 1)
      if (!results.length) return null
      return getArtist(results[0].spotify_artist_id)
    },
    staleTime: 1000 * 60 * 30,
  })

  const { data: albums = [], isLoading: loadingAlbums } = useQuery({
    queryKey: ['artist-albums', artistData?.spotify_artist_id],
    queryFn: () => getArtistAlbums(artistData!.spotify_artist_id),
    enabled: !!artistData,
    staleTime: 1000 * 60 * 30,
  })

  const { data: posts = [], isLoading: loadingPosts } = useQuery({
    queryKey: ['artist-posts', artistName],
    queryFn: () => fetchPostsByArtistName(artistName),
    staleTime: 1000 * 60 * 5,
  })

  const rankedSongs = rankSongs(posts)

  if (loadingArtist) {
    return (
      <SafeAreaView className="flex-1 bg-surface items-center justify-center" edges={['top']}>
        <ActivityIndicator color="#f97316" />
      </SafeAreaView>
    )
  }

  if (!artistData || artistError) {
    return (
      <SafeAreaView className="flex-1 bg-surface items-center justify-center px-6" edges={['top']}>
        <Text className="text-4xl mb-3">🎵</Text>
        <Text className="text-muted">Artista non trovato.</Text>
        <TouchableOpacity onPress={() => router.back()} className="bg-accent px-4 py-2 rounded-xl mt-4">
          <Text className="text-white font-semibold">Torna indietro</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Back */}
        <TouchableOpacity
          onPress={() => router.back()}
          className="flex-row items-center gap-1.5 px-4 py-3"
        >
          <Ionicons name="arrow-back" size={18} color="#6b7280" />
          <Text className="text-muted text-sm">Indietro</Text>
        </TouchableOpacity>

        {/* Hero */}
        <View className="h-48 relative">
          {artistData.artist_image_url ? (
            <>
              <Image
                source={{ uri: artistData.artist_image_url }}
                style={{ position: 'absolute', width: '100%', height: '100%' }}
                contentFit="cover"
                blurRadius={15}
              />
              <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)' }} />
            </>
          ) : (
            <View className="absolute inset-0 bg-surface-200" />
          )}
          <View className="absolute bottom-0 left-0 right-0 p-4 flex-row items-end gap-4">
            {artistData.artist_image_url && (
              <Image
                source={{ uri: artistData.artist_image_url }}
                style={{ width: 88, height: 88, borderRadius: 44 }}
                contentFit="cover"
              />
            )}
            <View className="flex-1 min-w-0">
              <Text className="text-white font-bold text-2xl leading-tight" numberOfLines={2}>
                {artistData.artist_name}
              </Text>
              {artistData.genres.length > 0 && (
                <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }} numberOfLines={1}>
                  {artistData.genres.join(' · ')}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Stats + follow */}
        <View className="px-4 py-4 gap-3">
          <View className="flex-row items-center gap-4 flex-wrap">
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="people-outline" size={14} color="#6b7280" />
              <Text className="text-muted text-sm">{formatFollowers(artistData.followers)} follower</Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="star-outline" size={14} color="#6b7280" />
              <Text className="text-muted text-sm">{posts.length} recensioni su Reviewz</Text>
            </View>
            <TouchableOpacity
              onPress={() => artistData.spotify_url && Linking.openURL(artistData.spotify_url)}
              className="flex-row items-center gap-1.5 ml-auto"
            >
              <Ionicons name="open-outline" size={14} color="#1DB954" />
              <Text style={{ color: '#1DB954', fontSize: 13, fontWeight: '600' }}>Spotify</Text>
            </TouchableOpacity>
          </View>
          <FollowButton user={user} artist={artistData} />
        </View>

        {/* Most reviewed songs */}
        {rankedSongs.length > 0 && (
          <View className="mx-4 mb-4 bg-surface-100 rounded-2xl p-4 border border-surface-200">
            <View className="flex-row items-center gap-2 mb-4">
              <Ionicons name="trophy" size={16} color="#fbbf24" />
              <Text className="text-white font-bold">Brani più recensiti</Text>
            </View>
            {rankedSongs.map((song: any, i: number) => (
              <View key={song.spotify_id} className="flex-row items-center gap-3 mb-3">
                <Text
                  className="w-6 text-center font-bold text-base"
                  style={{ color: i === 0 ? '#fbbf24' : i === 1 ? '#94a3b8' : i === 2 ? '#c2855a' : '#6b7280' }}
                >
                  {i + 1}
                </Text>
                {song.cover_url && (
                  <Image source={{ uri: song.cover_url }} style={{ width: 40, height: 40, borderRadius: 6 }} contentFit="cover" />
                )}
                <View className="flex-1 min-w-0">
                  <Text className="text-white text-sm font-semibold" numberOfLines={1}>{song.title}</Text>
                  <Text className="text-muted text-xs">{song.count} {song.count === 1 ? 'recensione' : 'recensioni'}</Text>
                </View>
                <TouchableOpacity onPress={() => song.spotify_url && Linking.openURL(song.spotify_url)}>
                  <Ionicons name="open-outline" size={14} color="#6b7280" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Discography */}
        <View className="mx-4 mb-4 bg-surface-100 rounded-2xl p-4 border border-surface-200">
          <View className="flex-row items-center gap-2 mb-4">
            <Ionicons name="disc" size={16} color="#f97316" />
            <Text className="text-white font-bold">Discografia</Text>
          </View>
          {loadingAlbums ? (
            <ActivityIndicator color="#f97316" />
          ) : albums.length === 0 ? (
            <Text className="text-muted text-sm text-center py-4">Nessun album trovato.</Text>
          ) : (
            <View className="flex-row flex-wrap gap-3">
              {albums.slice(0, 12).map((album: any) => (
                <TouchableOpacity
                  key={album.spotify_id}
                  onPress={() => album.spotify_url && Linking.openURL(album.spotify_url)}
                  style={{ width: '30%' }}
                >
                  <View className="rounded-xl overflow-hidden bg-surface-200 mb-1" style={{ aspectRatio: 1 }}>
                    {album.cover_url
                      ? <Image source={{ uri: album.cover_url }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                      : <View className="flex-1 items-center justify-center"><Ionicons name="disc" size={24} color="#6b7280" /></View>}
                  </View>
                  <Text className="text-white text-xs font-semibold" numberOfLines={1}>{album.title}</Text>
                  <Text className="text-muted text-[10px]">{album.release_date?.slice(0, 4)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Recent reviews */}
        {posts.length > 0 && (
          <View className="mx-4 bg-surface-100 rounded-2xl p-4 border border-surface-200">
            <View className="flex-row items-center gap-2 mb-4">
              <Ionicons name="musical-notes" size={16} color="#60a5fa" />
              <Text className="text-white font-bold">Recensioni recenti</Text>
            </View>
            {posts.slice(0, 5).map((post: any) => {
              const pr = post.profiles
              return (
                <TouchableOpacity
                  key={post.id}
                  onPress={() => router.push(`/post/${post.id}`)}
                  className="flex-row gap-3 mb-3 pb-3 border-b border-surface-200/50 last:border-0 last:mb-0 last:pb-0"
                >
                  {post.cover_url && (
                    <Image source={{ uri: post.cover_url }} style={{ width: 44, height: 44, borderRadius: 8 }} contentFit="cover" />
                  )}
                  <View className="flex-1 min-w-0">
                    <View className="flex-row items-center justify-between gap-2">
                      <Text className="text-white text-sm font-semibold flex-1" numberOfLines={1}>{post.title}</Text>
                      <Text className="text-muted text-xs">{post.rating?.toFixed(1)}/10</Text>
                    </View>
                    <Text className="text-muted text-xs mt-0.5" numberOfLines={2}>{post.review_text}</Text>
                    <View className="flex-row items-center gap-1.5 mt-1.5">
                      <Text className="text-muted text-[10px]">{pr?.username}</Text>
                      <Text className="text-muted text-[10px]">·</Text>
                      <Text className="text-muted text-[10px]">
                        {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              )
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
