import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { searchSpotify } from '@/lib/spotify'
import { createPost } from '@/lib/supabase'
import useAuthStore from '@/store/authStore'
import AuthModal from '@/components/Auth/AuthModal'

function ratingColor(r: number) {
  if (r >= 8) return '#34d399'
  if (r >= 6) return '#fbbf24'
  if (r >= 4) return '#fb923c'
  return '#f87171'
}

function RatingPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <View>
      <View className="flex-row flex-wrap gap-2 justify-center">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <TouchableOpacity
            key={n}
            onPress={() => onChange(n)}
            className="w-12 h-12 rounded-xl items-center justify-center border"
            style={{
              backgroundColor: value === n ? ratingColor(n) + '22' : 'rgba(255,255,255,0.04)',
              borderColor: value === n ? ratingColor(n) : 'rgba(255,255,255,0.08)',
            }}
          >
            <Text
              className="font-bold text-base"
              style={{ color: value === n ? ratingColor(n) : '#6b7280' }}
            >
              {n}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {value > 0 && (
        <Text className="text-center mt-3 font-bold text-lg" style={{ color: ratingColor(value) }}>
          {value}/10
        </Text>
      )}
    </View>
  )
}

function SpotifySearch({ onSelect }: { onSelect: (item: any) => void }) {
  const [query, setQuery]       = useState('')
  const [submitted, setSubmitted] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['spotify-search-create', submitted],
    queryFn: () => searchSpotify(submitted, 'both', 6),
    enabled: submitted.length > 1,
  })

  const items = [
    ...(data?.tracks ?? []).map((t: any) => ({ ...t, _type: 'track' })),
    ...(data?.albums ?? []).map((a: any) => ({ ...a, _type: 'album' })),
  ]

  return (
    <View className="gap-3">
      <View className="bg-surface-200 rounded-xl flex-row items-center px-3 gap-2">
        <Ionicons name="search" size={16} color="#6b7280" />
        <TextInput
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => setSubmitted(query.trim())}
          placeholder="Cerca brano o album…"
          placeholderTextColor="#6b7280"
          className="flex-1 text-white py-3 text-sm"
          returnKeyType="search"
          autoCorrect={false}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => { setQuery(''); setSubmitted('') }}>
            <Ionicons name="close-circle" size={16} color="#6b7280" />
          </TouchableOpacity>
        )}
      </View>

      {isLoading && <ActivityIndicator color="#f97316" />}

      {items.map((item: any) => (
        <TouchableOpacity
          key={item.spotify_id}
          onPress={() => onSelect(item)}
          className="flex-row items-center gap-3 bg-surface-200/50 rounded-xl p-3"
          activeOpacity={0.7}
        >
          {item.cover_url ? (
            <Image source={{ uri: item.cover_url }} style={{ width: 44, height: 44, borderRadius: 8 }} contentFit="cover" />
          ) : (
            <View className="w-11 h-11 rounded-lg bg-surface-200 items-center justify-center">
              <Ionicons name={item._type === 'track' ? 'musical-note' : 'disc'} size={18} color="#6b7280" />
            </View>
          )}
          <View className="flex-1 min-w-0">
            <Text className="text-white text-sm font-semibold" numberOfLines={1}>{item.title}</Text>
            <Text className="text-muted text-xs" numberOfLines={1}>{item.artist}</Text>
          </View>
          <View className="bg-surface-200 px-2 py-0.5 rounded-full">
            <Text className="text-muted text-[10px]">{item._type}</Text>
          </View>
        </TouchableOpacity>
      ))}

      {submitted && !isLoading && items.length === 0 && (
        <Text className="text-muted text-sm text-center py-4">Nessun risultato per "{submitted}"</Text>
      )}
    </View>
  )
}

export default function CreateScreen() {
  const { user }  = useAuthStore()
  const qc        = useQueryClient()
  const [showAuth, setShowAuth] = useState(false)

  const [step, setStep]         = useState(1)
  const [selected, setSelected] = useState<any>(null)
  const [rating, setRating]     = useState(0)
  const [review, setReview]     = useState('')
  const [error, setError]       = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () => createPost({
      user_id:      user!.id,
      spotify_id:   selected.spotify_id,
      spotify_type: selected.spotify_type ?? selected._type,
      title:        selected.title,
      artist:       selected.artist,
      cover_url:    selected.cover_url,
      spotify_url:  selected.spotify_url,
      preview_url:  selected.preview_url ?? null,
      review_text:  review,
      rating,
    }),
    onSuccess: (post: any) => {
      qc.invalidateQueries({ queryKey: ['feed'] })
      router.push(`/post/${post.id}`)
    },
    onError: (e: any) => setError(e.message),
  })

  if (!user) {
    return (
      <SafeAreaView className="flex-1 bg-surface items-center justify-center px-6" edges={['top']}>
        <View className="w-16 h-16 rounded-2xl bg-accent/20 items-center justify-center mb-4">
          <Ionicons name="rocket" size={28} color="#f97316" />
        </View>
        <Text className="text-white text-xl font-bold mb-2 text-center">Accedi per scrivere una recensione</Text>
        <Text className="text-muted text-sm text-center mb-6">Unisciti alla community e condividi le tue opinioni musicali.</Text>
        <TouchableOpacity onPress={() => setShowAuth(true)} className="bg-accent px-8 py-3 rounded-xl">
          <Text className="text-white font-semibold">Accedi</Text>
        </TouchableOpacity>
        {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      </SafeAreaView>
    )
  }

  const steps = ['Musica', 'Voto', 'Recensione']

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          {/* Header */}
          <Text className="text-white text-xl font-bold mb-1">Scrivi Recensione</Text>
          <Text className="text-muted text-sm mb-5">Condividi la tua opinione su un brano o album</Text>

          {/* Step indicator */}
          <View className="flex-row items-center mb-6">
            {steps.map((label, i) => {
              const n = i + 1
              const done = step > n
              const active = step === n
              return (
                <View key={label} className="flex-row items-center flex-1">
                  <View className="items-center gap-1">
                    <View className={`w-9 h-9 rounded-xl items-center justify-center border ${
                      done   ? 'bg-green-500/20 border-green-500/40' :
                      active ? 'bg-accent/20 border-accent/50' :
                               'bg-surface-200 border-surface-300'
                    }`}>
                      <Ionicons
                        name={done ? 'checkmark' : n === 1 ? 'search' : n === 2 ? 'star' : 'document-text'}
                        size={16}
                        color={done ? '#34d399' : active ? '#f97316' : '#6b7280'}
                      />
                    </View>
                    <Text className={`text-[10px] font-medium ${active ? 'text-accent' : done ? 'text-green-400' : 'text-muted'}`}>
                      {label}
                    </Text>
                  </View>
                  {i < steps.length - 1 && (
                    <View className={`h-px flex-1 mx-2 mb-4 ${done ? 'bg-green-500/40' : 'bg-surface-300'}`} />
                  )}
                </View>
              )
            })}
          </View>

          {/* Step 1: Search */}
          {step === 1 && (
            <View className="bg-surface-100 rounded-2xl p-4 border border-surface-200 gap-4">
              <View>
                <Text className="text-white font-bold text-base mb-0.5">Trova la tua musica</Text>
                <Text className="text-muted text-sm">Cerca brani o album su Spotify</Text>
              </View>

              {selected ? (
                <View className="flex-row items-center gap-3 bg-accent/10 border border-accent/30 rounded-xl p-3">
                  {selected.cover_url && (
                    <Image source={{ uri: selected.cover_url }} style={{ width: 56, height: 56, borderRadius: 10 }} contentFit="cover" />
                  )}
                  <View className="flex-1 min-w-0">
                    <Text className="text-white font-bold" numberOfLines={1}>{selected.title}</Text>
                    <Text className="text-muted text-sm">{selected.artist}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelected(null)} className="bg-surface-200 px-3 py-1.5 rounded-lg">
                    <Text className="text-white text-xs font-semibold">Cambia</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <SpotifySearch onSelect={setSelected} />
              )}

              <TouchableOpacity
                onPress={() => setStep(2)}
                disabled={!selected}
                className="bg-accent rounded-xl py-3 items-center"
                style={{ opacity: selected ? 1 : 0.4 }}
              >
                <Text className="text-white font-semibold">Avanti →</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Step 2: Rating */}
          {step === 2 && (
            <View className="bg-surface-100 rounded-2xl p-4 border border-surface-200 gap-4">
              {selected && (
                <View className="flex-row items-center gap-3 pb-4 border-b border-surface-200">
                  {selected.cover_url && (
                    <Image source={{ uri: selected.cover_url }} style={{ width: 44, height: 44, borderRadius: 8 }} contentFit="cover" />
                  )}
                  <View>
                    <Text className="text-white font-semibold" numberOfLines={1}>{selected.title}</Text>
                    <Text className="text-muted text-sm">{selected.artist}</Text>
                  </View>
                </View>
              )}

              <View className="gap-2">
                <Text className="text-white font-bold text-base">Com'è?</Text>
                <Text className="text-muted text-sm">Vota da 1 (pessimo) a 10 (capolavoro)</Text>
                <RatingPicker value={rating} onChange={setRating} />
              </View>

              <View className="flex-row gap-3">
                <TouchableOpacity onPress={() => setStep(1)} className="bg-surface-200 rounded-xl py-3 px-4">
                  <Text className="text-white font-semibold">← Indietro</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setStep(3)}
                  disabled={rating === 0}
                  className="flex-1 bg-accent rounded-xl py-3 items-center"
                  style={{ opacity: rating > 0 ? 1 : 0.4 }}
                >
                  <Text className="text-white font-semibold">Avanti →</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Step 3: Review text */}
          {step === 3 && (
            <View className="bg-surface-100 rounded-2xl p-4 border border-surface-200 gap-4">
              {selected && (
                <View className="flex-row items-center gap-3 pb-4 border-b border-surface-200">
                  {selected.cover_url && (
                    <Image source={{ uri: selected.cover_url }} style={{ width: 44, height: 44, borderRadius: 8 }} contentFit="cover" />
                  )}
                  <View className="flex-1">
                    <Text className="text-white font-semibold" numberOfLines={1}>{selected.title}</Text>
                    <Text className="text-muted text-sm">{selected.artist}</Text>
                  </View>
                  <Text className="text-xl font-bold" style={{ color: ratingColor(rating) }}>{rating}/10</Text>
                </View>
              )}

              <View className="gap-2">
                <Text className="text-white font-bold text-base">Scrivi la tua recensione</Text>
                <Text className="text-muted text-sm">Racconta alla community cosa ne pensi</Text>
                <TextInput
                  value={review}
                  onChangeText={setReview}
                  placeholder="Cosa rende speciale questo brano? Come ti fa sentire?…"
                  placeholderTextColor="#6b7280"
                  className="bg-surface-200 rounded-xl p-3 text-white text-sm leading-relaxed"
                  multiline
                  numberOfLines={7}
                  maxLength={2000}
                  textAlignVertical="top"
                  style={{ minHeight: 140 }}
                />
                <View className="flex-row justify-between">
                  <Text className={`text-xs ${review.trim().length < 10 ? 'text-red-400' : 'text-green-400'}`}>
                    {review.trim().length < 10 ? `${10 - review.trim().length} caratteri mancanti` : '✓ Ottimo'}
                  </Text>
                  <Text className="text-muted text-xs">{review.length}/2000</Text>
                </View>
              </View>

              {error && (
                <View className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                  <Text className="text-red-400 text-sm">{error}</Text>
                </View>
              )}

              <View className="flex-row gap-3">
                <TouchableOpacity onPress={() => setStep(2)} className="bg-surface-200 rounded-xl py-3 px-4">
                  <Text className="text-white font-semibold">← Indietro</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => mutation.mutate()}
                  disabled={review.trim().length < 10 || mutation.isPending}
                  className="flex-1 bg-accent rounded-xl py-3 items-center flex-row justify-center gap-2"
                  style={{ opacity: review.trim().length >= 10 ? 1 : 0.4 }}
                >
                  {mutation.isPending && <ActivityIndicator color="white" size="small" />}
                  <Ionicons name="rocket" size={15} color="white" />
                  <Text className="text-white font-semibold">Pubblica</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
