import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { Send, Trash2, Loader2 } from 'lucide-react'
import { fetchComments, createComment, deleteComment } from '../../lib/supabase'
import useAuthStore from '../../store/authStore'
import Avatar from '../UI/Avatar'

export default function CommentSection({ postId }) {
  const [text, setText] = useState('')
  const { user, profile } = useAuthStore()
  const qc = useQueryClient()

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['comments', postId],
    queryFn: () => fetchComments(postId),
  })

  const addMut = useMutation({
    mutationFn: () => createComment(postId, user.id, text.trim()),
    onSuccess: () => {
      setText('')
      qc.invalidateQueries({ queryKey: ['comments', postId] })
      qc.invalidateQueries({ queryKey: ['post', postId] })
    },
  })

  const delMut = useMutation({
    mutationFn: (id) => deleteComment(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comments', postId] })
      qc.invalidateQueries({ queryKey: ['post', postId] })
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!text.trim() || addMut.isPending) return
    addMut.mutate()
  }

  return (
    <div className="card p-4 space-y-4">
      <h3 className="font-semibold">Comments ({comments.length})</h3>

      {/* Input */}
      {user && (
        <form onSubmit={handleSubmit} className="flex gap-3">
          <Avatar src={profile?.avatar_url} username={profile?.username} size="sm" />
          <div className="flex-1 flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Write a comment…"
              className="input text-sm flex-1"
              maxLength={500}
            />
            <button
              type="submit"
              disabled={!text.trim() || addMut.isPending}
              className="btn-primary px-3 py-2"
            >
              {addMut.isPending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            </button>
          </div>
        </form>
      )}

      {/* List */}
      {isLoading ? (
        <p className="text-muted text-sm">Loading comments…</p>
      ) : comments.length === 0 ? (
        <p className="text-muted text-sm">Be the first to comment.</p>
      ) : (
        <ul className="space-y-3">
          {comments.map((c) => (
            <li key={c.id} className="flex gap-3">
              <Avatar src={c.profiles?.avatar_url} username={c.profiles?.username} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium">{c.profiles?.username}</span>
                  <span className="text-xs text-muted">
                    {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm text-gray-300 mt-0.5 break-words">{c.content}</p>
              </div>
              {user?.id === c.user_id && (
                <button
                  onClick={() => delMut.mutate(c.id)}
                  className="text-muted hover:text-red-400 transition-colors shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
