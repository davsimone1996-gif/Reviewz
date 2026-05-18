import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Linking } from 'react-native'
import { Image } from 'expo-image'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { getNewReleases, getLastFridayDate } from '@/lib/spotify'

function formatDate(isoStr: string) {
  if (!isoStr) return ''
  const d = new Date(isoStr)
  if (isNaN(d.getTime())) return isoStr
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
}

function AlbumCard({ album, isNew }: { album: any; isNew: boolean }) {
  return (
    <TouchableOpacity
      onPress={() => album.spotify_url && Linking.openURL(album.spotify_url)}
      className="flex-1 m-1.5"
      activeOpacity={0.8}
    >
      <View className="bg-surface-100 rounded-2xl overflow-hidden border border-surface-200">
        {isNew && (
          <View className="absolute top-2 left-2 z-10 bg-accent px-1.5 py-0.5 rounded-full">
            <Text className="text-white text-[9px] font-bold uppercase tracking-wide">New</Text>
          </View>
        )}
        <Image
          source={{ uri: album.cover_url }}
          style={{ width: '100%', aspectRatio: 1 }}
          contentFit="cover"
        />
        <View className="p-2">
          <Text className="text-white text-xs font-semibold" numberOfLines={1}>{album.title}</Text>
          <Text className="text-muted text-[10px]" numberOfLines={1}>{album.artist}</Text>
          {album.release_date && (
            <Text className="text-muted/50 text-[10px] mt-0.5">{formatDate(album.release_date)}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  )
}

function msUntilNextFridayMidnight() {
  const now = new Date()
  const day = now.getDay()
  const daysAhead = day === 5 ? 7 : (5 - day + 7) % 7
  const nextFriday = new Date(now)
  nextFriday.setDate(now.getDate() + (daysAhead === 0 ? 7 : daysAhead))
  nextFriday.setHours(0, 5, 0, 0)
  return Math.max(nextFriday.getTime() - now.getTime(), 1000 * 60 * 60)
}

export default function ReleasesScreen() {
  const lastFriday = getLastFridayDate()

  const { data: albums = [], isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['new-releases', lastFriday],
    queryFn: () => getNewReleases('IT', 50),
    staleTime: msUntilNextFridayMidnight(),
  })

  const isThisWeek = (date: string) => !!date && date >= lastFriday
  const thisWeek = albums.filter((a: any) => isThisWeek(a.release_date))
  const older = albums.filter((a: any) => !isThisWeek(a.release_date))

  const sections = [
    ...(thisWeek.length > 0 ? [{ type: 'header', label: 'Questa settimana', isNew: true }] : []),
    ...thisWeek.map((a: any) => ({ type: 'album', ...a, isNew: true })),
    ...(older.length > 0 && thisWeek.length > 0 ? [{ type: 'header', label: 'Settimana precedente', isNew: false }] : []),
    ...older.map((a: any) => ({ type: 'album', ...a, isNew: false })),
  ]

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="flex-row items-center justify-between px-4 py-3">
        <View>
          <Text className="text-white text-xl font-bold">Nuove Uscite</Text>
          <Text className="text-muted text-xs">Venerdì {formatDate(lastFriday)}</Text>
        </View>
        <TouchableOpacity onPress={() => refetch()} disabled={isFetching}>
          <Ionicons name="refresh" size={20} color={isFetching ? '#f97316' : '#6b7280'} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#f97316" />
        </View>
      ) : isError ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-red-400 font-medium mb-3">Errore nel caricamento</Text>
          <TouchableOpacity onPress={() => refetch()} className="bg-surface-200 px-4 py-2 rounded-xl">
            <Text className="text-white text-sm">Riprova</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={sections}
          keyExtractor={(item, i) => `${item.type}-${i}`}
          numColumns={2}
          key="grid-2"
          contentContainerStyle={{ padding: 8, paddingBottom: 32 }}
          renderItem={({ item }) => {
            if (item.type === 'header') {
              return (
                <View className="w-full px-2 py-2 flex-row items-center gap-2">
                  <View className={`w-2 h-2 rounded-full ${item.isNew ? 'bg-accent' : 'bg-surface-300'}`} />
                  <Text className="text-muted text-xs font-bold uppercase tracking-wider">{item.label}</Text>
                </View>
              )
            }
            return <AlbumCard album={item} isNew={item.isNew} />
          }}
        />
      )}
    </SafeAreaView>
  )
}
