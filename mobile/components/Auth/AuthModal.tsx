import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, Modal,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import useAuthStore from '@/store/authStore'
import { resendConfirmation } from '@/lib/supabase'

const GENRES = [
  'Pop', 'Rock', 'Hip-Hop', 'R&B', 'Electronic', 'Jazz', 'Classical',
  'Country', 'Metal', 'Indie', 'Soul', 'Reggae', 'Latin', 'K-Pop',
  'Punk', 'Blues', 'Folk', 'Dance', 'Lo-fi', 'Gospel',
]

function LoginForm({ onSuccess, onSwitch }: { onSuccess: () => void; onSwitch: () => void }) {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [err, setErr]           = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)
  const [resent, setResent]     = useState(false)
  const login = useAuthStore((s) => s.login)

  const isConfirmationError = !!err && (
    err.toLowerCase().includes('confirm') ||
    err.toLowerCase().includes('email') ||
    err.toLowerCase().includes('verif')
  )

  const handleSubmit = async () => {
    setErr(null)
    setLoading(true)
    try {
      await login(email, password)
      onSuccess()
    } catch (error: any) {
      setErr(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (!email) { setErr('Inserisci la tua email'); return }
    await resendConfirmation(email)
    setResent(true)
  }

  return (
    <View className="gap-4">
      <View className="gap-1.5">
        <Text className="text-muted text-xs font-bold uppercase tracking-wide">Email</Text>
        <View className="bg-surface-200 rounded-xl flex-row items-center px-3 gap-2">
          <Ionicons name="mail-outline" size={15} color="#6b7280" />
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="tu@esempio.com"
            placeholderTextColor="#6b7280"
            className="flex-1 text-white py-3 text-sm"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      </View>

      <View className="gap-1.5">
        <Text className="text-muted text-xs font-bold uppercase tracking-wide">Password</Text>
        <View className="bg-surface-200 rounded-xl flex-row items-center px-3 gap-2">
          <Ionicons name="lock-closed-outline" size={15} color="#6b7280" />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor="#6b7280"
            className="flex-1 text-white py-3 text-sm"
            secureTextEntry={!showPw}
          />
          <TouchableOpacity onPress={() => setShowPw((v) => !v)}>
            <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={15} color="#6b7280" />
          </TouchableOpacity>
        </View>
      </View>

      {err && (
        <View className="bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2 gap-1.5">
          <Text className="text-red-400 text-sm">{err}</Text>
          {isConfirmationError && !resent && (
            <TouchableOpacity onPress={handleResend}>
              <Text className="text-accent text-xs font-semibold">Reinvia email di conferma</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {resent && (
        <View className="bg-green-500/10 border border-green-500/30 rounded-xl px-3 py-2">
          <Text className="text-green-400 text-sm">Email inviata — controlla la tua casella.</Text>
        </View>
      )}

      <TouchableOpacity
        onPress={handleSubmit}
        disabled={loading}
        className="bg-accent rounded-xl py-3 items-center flex-row justify-center gap-2"
      >
        {loading && <ActivityIndicator color="white" size="small" />}
        <Text className="text-white font-semibold">Accedi</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={onSwitch} className="items-center">
        <Text className="text-muted text-xs">
          Nessun account? <Text className="text-accent font-semibold">Registrati gratis</Text>
        </Text>
      </TouchableOpacity>
    </View>
  )
}

function RegisterForm({ onSuccess, onSwitch }: { onSuccess: () => void; onSwitch: () => void }) {
  const [step, setStep]         = useState(1)
  const [username, setUsername] = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [err, setErr]           = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)
  const [genres, setGenres]     = useState<string[]>([])
  const { register, user }      = useAuthStore()

  const handleStep1 = async () => {
    setErr(null)
    if (password.length < 6) { setErr('Password di almeno 6 caratteri'); return }
    setLoading(true)
    try {
      await register(email, password, username)
      setStep(2)
    } catch (error: any) {
      setErr(error.message)
    } finally {
      setLoading(false)
    }
  }

  const toggleGenre = (g: string) =>
    setGenres((prev) => prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g])

  return (
    <View className="gap-4">
      {/* Step indicator */}
      <View className="flex-row items-center gap-2 mb-2">
        {[1, 2, 3].map((n) => (
          <View key={n} className="flex-row items-center flex-1">
            <View className={`w-5 h-5 rounded-full items-center justify-center ${step > n ? 'bg-green-500' : step === n ? 'bg-accent' : 'bg-surface-200'}`}>
              <Text className="text-white text-[10px] font-bold">{step > n ? '✓' : n}</Text>
            </View>
            {n < 3 && <View className={`h-px flex-1 mx-1 ${step > n ? 'bg-green-500' : 'bg-surface-200'}`} />}
          </View>
        ))}
      </View>

      {step === 1 && (
        <View className="gap-4">
          <View className="gap-1.5">
            <Text className="text-muted text-xs font-bold uppercase tracking-wide">Username</Text>
            <View className="bg-surface-200 rounded-xl flex-row items-center px-3 gap-2">
              <Ionicons name="person-outline" size={15} color="#6b7280" />
              <TextInput
                value={username}
                onChangeText={(v) => setUsername(v.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="tuonome"
                placeholderTextColor="#6b7280"
                className="flex-1 text-white py-3 text-sm"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>
          <View className="gap-1.5">
            <Text className="text-muted text-xs font-bold uppercase tracking-wide">Email</Text>
            <View className="bg-surface-200 rounded-xl flex-row items-center px-3 gap-2">
              <Ionicons name="mail-outline" size={15} color="#6b7280" />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="tu@esempio.com"
                placeholderTextColor="#6b7280"
                className="flex-1 text-white py-3 text-sm"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>
          <View className="gap-1.5">
            <Text className="text-muted text-xs font-bold uppercase tracking-wide">Password</Text>
            <View className="bg-surface-200 rounded-xl flex-row items-center px-3 gap-2">
              <Ionicons name="lock-closed-outline" size={15} color="#6b7280" />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Min. 6 caratteri"
                placeholderTextColor="#6b7280"
                className="flex-1 text-white py-3 text-sm"
                secureTextEntry={!showPw}
              />
              <TouchableOpacity onPress={() => setShowPw((v) => !v)}>
                <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={15} color="#6b7280" />
              </TouchableOpacity>
            </View>
          </View>
          {err && <Text className="text-red-400 text-sm">{err}</Text>}
          <TouchableOpacity
            onPress={handleStep1}
            disabled={loading}
            className="bg-accent rounded-xl py-3 items-center flex-row justify-center gap-2"
          >
            {loading && <ActivityIndicator color="white" size="small" />}
            <Text className="text-white font-semibold">Crea Account</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onSwitch} className="items-center">
            <Text className="text-muted text-xs">
              Hai già un account? <Text className="text-accent font-semibold">Accedi</Text>
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {step === 2 && (
        <View className="gap-4">
          <Text className="text-white font-semibold">Qual è il tuo gusto musicale?</Text>
          <Text className="text-muted text-xs -mt-2">Seleziona i generi che ami (opzionale)</Text>
          <View className="flex-row flex-wrap gap-2">
            {GENRES.map((g) => (
              <TouchableOpacity
                key={g}
                onPress={() => toggleGenre(g)}
                className={`px-3 py-1.5 rounded-full border ${genres.includes(g) ? 'bg-accent border-accent' : 'bg-surface-200 border-transparent'}`}
              >
                <Text className={`text-xs font-semibold ${genres.includes(g) ? 'text-white' : 'text-muted'}`}>{g}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {genres.length > 0 && <Text className="text-accent text-xs font-semibold">{genres.length} selezionati</Text>}
          <TouchableOpacity
            onPress={() => setStep(3)}
            className="bg-accent rounded-xl py-3 items-center"
          >
            <Text className="text-white font-semibold">Continua</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setStep(3)} className="items-center">
            <Text className="text-muted text-xs">Salta</Text>
          </TouchableOpacity>
        </View>
      )}

      {step === 3 && (
        <View className="gap-5 items-center">
          <View className="w-16 h-16 rounded-2xl bg-[#1DB954]/10 border border-[#1DB954]/30 items-center justify-center">
            <Ionicons name="musical-note" size={30} color="#1DB954" />
          </View>
          <View className="items-center gap-1">
            <Text className="text-white font-semibold">Connetti Spotify</Text>
            <Text className="text-muted text-xs text-center">
              Condividi cosa stai ascoltando in tempo reale sul tuo profilo
            </Text>
          </View>
          <TouchableOpacity onPress={onSuccess} className="items-center">
            <Text className="text-muted text-xs">Salta per ora</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

export default function AuthModal({ onClose }: { onClose: () => void }) {
  const [view, setView] = useState<'login' | 'register'>('login')

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 justify-end"
        style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
      >
        <TouchableOpacity
          className="flex-1"
          activeOpacity={1}
          onPress={onClose}
        />
        <View className="bg-surface rounded-t-3xl">
          <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
            {/* Close handle */}
            <View className="items-center mb-4">
              <View className="w-10 h-1 rounded-full bg-surface-200" />
            </View>

            {/* Header */}
            <View className="items-center mb-6">
              <Text className="text-white text-xl font-bold">Reviewz</Text>
              <Text className="text-muted text-sm mt-1">
                {view === 'login' ? 'Bentornato 👋' : 'Unisciti alla community 🎵'}
              </Text>
            </View>

            {/* Tab switcher */}
            <View className="flex-row bg-surface-200 rounded-xl p-1 mb-6">
              {(['login', 'register'] as const).map((v) => (
                <TouchableOpacity
                  key={v}
                  onPress={() => setView(v)}
                  className={`flex-1 py-2 rounded-xl items-center ${view === v ? 'bg-accent' : ''}`}
                >
                  <Text className={`text-sm font-semibold ${view === v ? 'text-white' : 'text-muted'}`}>
                    {v === 'login' ? 'Accedi' : 'Registrati'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {view === 'login'
              ? <LoginForm onSuccess={onClose} onSwitch={() => setView('register')} />
              : <RegisterForm onSuccess={onClose} onSwitch={() => setView('login')} />}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}
