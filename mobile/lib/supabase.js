import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

// ─── Auth ─────────────────────────────────────────────────────────

export const signUp = (email, password, username) =>
  supabase.auth.signUp({ email, password, options: { data: { username } } })

export const signIn = (email, password) =>
  supabase.auth.signInWithPassword({ email, password })

export const signOut = () => supabase.auth.signOut()

export const resendConfirmation = (email) =>
  supabase.auth.resend({ type: 'signup', email })

// ─── Profiles ─────────────────────────────────────────────────────

export const searchProfiles = async (query) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, social_score')
    .ilike('username', `%${query}%`)
    .limit(8)
  if (error) throw error
  return data
}

export const fetchProfile = async (userId) => {
  const { data, error } = await supabase
    .from('profile_stats')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) throw error
  return data
}

export const fetchProfileByUsername = async (username) => {
  const { data, error } = await supabase
    .from('profile_stats')
    .select('*')
    .eq('username', username)
    .single()
  if (error) throw error
  return data
}

export const updateProfile = async (userId, updates) => {
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single()
  if (error) throw error
  return data
}

// ─── Posts ────────────────────────────────────────────────────────

export const createPost = async (post) => {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('posts')
    .insert({ ...post, user_id: user.id })
    .select('*, profiles(*)')
    .single()
  if (error) throw error
  return data
}

export const fetchFeedPosts = async (userId, page = 0, limit = 20) => {
  const { data: follows } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId)

  const followingIds = follows ? follows.map((f) => f.following_id) : []
  const ids = [userId, ...followingIds]

  const { data, error } = await supabase
    .from('posts')
    .select('*, profiles(id, username, avatar_url, social_score)')
    .in('user_id', ids)
    .order('created_at', { ascending: false })
    .range(page * limit, (page + 1) * limit - 1)

  if (error) throw error
  return data ?? []
}

export const fetchPublicFeed = async (page = 0, limit = 20) => {
  const { data, error } = await supabase
    .from('posts')
    .select('*, profiles(id, username, avatar_url, social_score)')
    .order('created_at', { ascending: false })
    .range(page * limit, (page + 1) * limit - 1)
  if (error) throw error
  return data ?? []
}

export const fetchUserPosts = async (userId, page = 0, limit = 20) => {
  const { data, error } = await supabase
    .from('posts')
    .select('*, profiles(id, username, avatar_url, social_score)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(page * limit, (page + 1) * limit - 1)
  if (error) throw error
  return data ?? []
}

export const fetchPostById = async (postId) => {
  const { data, error } = await supabase
    .from('posts')
    .select('*, profiles(id, username, avatar_url, social_score)')
    .eq('id', postId)
    .single()
  if (error) throw error
  return data
}

export const deletePost = async (postId) => {
  const { error } = await supabase.from('posts').delete().eq('id', postId)
  if (error) throw error
}

export const fetchPostsByArtistName = async (artistName, limit = 50) => {
  const { data, error } = await supabase
    .from('posts')
    .select('*, profiles(id, username, avatar_url, social_score)')
    .ilike('artist', artistName)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data ?? []
}

// ─── Comments ─────────────────────────────────────────────────────

export const fetchComments = async (postId) => {
  const { data, error } = await supabase
    .from('comments')
    .select('*, profiles(id, username, avatar_url)')
    .eq('post_id', postId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export const createComment = async (postId, userId, content) => {
  const { data, error } = await supabase
    .from('comments')
    .insert({ post_id: postId, user_id: userId, content })
    .select('*, profiles(id, username, avatar_url)')
    .single()
  if (error) throw error
  return data
}

export const deleteComment = async (commentId) => {
  const { error } = await supabase.from('comments').delete().eq('id', commentId)
  if (error) throw error
}

// ─── Likes ────────────────────────────────────────────────────────

export const likePost = async (userId, postId) => {
  const { error } = await supabase.from('likes').insert({ user_id: userId, post_id: postId })
  if (error) throw error
}

export const unlikePost = async (userId, postId) => {
  const { error } = await supabase
    .from('likes')
    .delete()
    .eq('user_id', userId)
    .eq('post_id', postId)
  if (error) throw error
}

// ─── Follows ──────────────────────────────────────────────────────

export const followUser = async (followerId, followingId) => {
  const { error } = await supabase
    .from('follows')
    .insert({ follower_id: followerId, following_id: followingId })
  if (error) throw error
}

export const unfollowUser = async (followerId, followingId) => {
  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', followerId)
    .eq('following_id', followingId)
  if (error) throw error
}

export const checkIsFollowing = async (followerId, followingId) => {
  const { data, error } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', followerId)
    .eq('following_id', followingId)
    .maybeSingle()
  if (error) throw error
  return !!data
}

// ─── Artist follows ───────────────────────────────────────────────

export const isFollowingArtist = async (userId, spotifyArtistId) => {
  const { data } = await supabase
    .from('followed_artists')
    .select('id')
    .eq('user_id', userId)
    .eq('spotify_artist_id', spotifyArtistId)
    .maybeSingle()
  return !!data
}

export const followArtist = async (userId, artist, latestRelease) => {
  const { error } = await supabase
    .from('followed_artists')
    .upsert({
      user_id:            userId,
      spotify_artist_id:  artist.spotify_artist_id,
      artist_name:        artist.artist_name,
      artist_image_url:   artist.artist_image_url ?? null,
      last_release_id:    latestRelease?.id ?? null,
      last_release_title: latestRelease?.title ?? null,
    }, { onConflict: 'user_id,spotify_artist_id' })
  if (error) throw error
}

export const unfollowArtist = async (userId, spotifyArtistId) => {
  const { error } = await supabase
    .from('followed_artists')
    .delete()
    .eq('user_id', userId)
    .eq('spotify_artist_id', spotifyArtistId)
  if (error) throw error
}

export const updateSpotifyProfileUrl = async (userId, spotifyUrl) => {
  const { error } = await supabase
    .from('profiles')
    .update({ spotify_profile_url: spotifyUrl, updated_at: new Date().toISOString() })
    .eq('id', userId)
  if (error) throw error
}
