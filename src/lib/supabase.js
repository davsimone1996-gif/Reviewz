import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})

// ─── Auth helpers ────────────────────────────────────────────────

export const signUp = (email, password, username) =>
  supabase.auth.signUp({ email, password, options: { data: { username } } })

export const signIn = (email, password) =>
  supabase.auth.signInWithPassword({ email, password })

export const signOut = () => supabase.auth.signOut()

export const getSession = () => supabase.auth.getSession()

// ─── Profile helpers ─────────────────────────────────────────────

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

// ─── Post helpers ────────────────────────────────────────────────

export const createPost = async (post) => {
  const { data, error } = await supabase
    .from('posts')
    .insert(post)
    .select('*, profiles(*)')
    .single()
  if (error) throw error
  return data
}

export const fetchFeedPosts = async (userId, page = 0, limit = 20) => {
  // Posts from users the current user follows + own posts
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
  return data
}

export const fetchPublicFeed = async (page = 0, limit = 20) => {
  const { data, error } = await supabase
    .from('posts')
    .select('*, profiles(id, username, avatar_url, social_score)')
    .order('created_at', { ascending: false })
    .range(page * limit, (page + 1) * limit - 1)
  if (error) throw error
  return data
}

export const fetchUserPosts = async (userId, page = 0, limit = 20) => {
  const { data, error } = await supabase
    .from('posts')
    .select('*, profiles(id, username, avatar_url, social_score)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(page * limit, (page + 1) * limit - 1)
  if (error) throw error
  return data
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

// ─── Comment helpers ─────────────────────────────────────────────

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

// ─── Like helpers ─────────────────────────────────────────────────

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

export const fetchUserLikes = async (userId, postIds) => {
  if (!postIds.length) return []
  const { data, error } = await supabase
    .from('likes')
    .select('post_id')
    .eq('user_id', userId)
    .in('post_id', postIds)
  if (error) throw error
  return data.map((l) => l.post_id)
}

// ─── Follow helpers ───────────────────────────────────────────────

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
  const { data } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', followerId)
    .eq('following_id', followingId)
    .single()
  return !!data
}
