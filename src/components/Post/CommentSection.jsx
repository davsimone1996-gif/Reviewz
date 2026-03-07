import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { Send, Trash2, Loader2, MessageCircle } from 'lucide-react'
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
    onSuccess: () => { setText(''); qc.invalidateQueries({ queryKey: ['comments', postId] }) },
  })

  const delMut = useMutation({
    mutationFn: (id) => deleteComment(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comments', postId] }),
  })

  return (
    <div className="card p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <MessageCircle size={16} className="text-muted" />
        <h3 className="font-bold">Comments</h3>
        {comments.length > 0 && (
          <span className="badge bg-surface-200 text-muted">{comments.length}</span>
        )}
      </div>

      {/* Input */}
      {user && (
        <form
          onSubmit={(e) => { e.preventDefault(); if (!text.trim() || addMut.isPending) return; addMut.mutate() }}
          className="flex gap-3"
        >
          <Avatar src={profile?.avatar_url} username={profile?.username} size="sm" className="mt-1 shrink-0" />
          <div className="flex-1 flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Write a comment…"
              className="input text-sm flex-1 py-2"
              maxLength={500}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && text.trim()) {
                  e.preventDefault(); addMut.mutate()
                }
              }}
            />
            <button
              type="submit"
              disabled={!text.trim() || addMut.isPending}
              className="btn-primary px-3 py-2 shrink-0"
            >
              {addMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </div>
        </form>
      )}

      {/* List */}
      {isLoading ? (
        <p className="text-muted text-sm text-center py-4">Loading…</p>
      ) : comments.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-muted text-sm">No comments yet. Be the first!</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {comments.map((c) => (
            <li key={c.id} className="flex gap-3 animate-fade-in-up group">
              <Avatar src={c.profiles?.avatar_url} username={c.profiles?.username} size="sm" className="shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="bg-surface-200/50 rounded-xl px-3 py-2.5">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-sm font-semibold">{c.profiles?.username}</span>
                    <span className="text-xs text-muted">
                      {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-300 break-words leading-relaxed">{c.content}</p>
                </div>
              </div>
              {user?.id === c.user_id && (
                <button
                  onClick={() => delMut.mutate(c.id)}
                  className="text-muted hover:text-red-400 transition-colors shrink-0 opacity-0 group-hover:opacity-100 mt-2"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
