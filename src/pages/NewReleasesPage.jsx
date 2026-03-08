import { useQuery } from '@tanstack/react-query'
import { ExternalLink, Music2, Disc3 } from 'lucide-react'
import { getNewReleases } from '../lib/spotify'
import Spinner from '../components/UI/Spinner'

function AlbumCard({ album }) {
  return (
    <a
      href={album.spotify_url}
      target="_blank"
      rel="noopener noreferrer"
      className="card group hover:border-accent/40 hover:-translate-y-1 transition-all duration-200 flex flex-col gap-3 p-4"
    >
      {/* Cover */}
      <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-surface-200">
        {album.cover_url ? (
          <img
            src={album.cover_url}
            alt={album.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Disc3 size={40} className="text-muted" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
          <ExternalLink
            size={22}
            className="text-white opacity-0 group-hover:opacity-100 transition-opacity"
          />
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-gray-100 truncate">{album.title}</p>
        <p className="text-xs text-muted truncate">{album.artist}</p>
        {album.release_date && (
          <p className="text-xs text-muted/60 mt-1">{album.release_date}</p>
        )}
      </div>
    </a>
  )
}

export default function NewReleasesPage() {
  const { data: albums, isLoading, isError } = useQuery({
    queryKey: ['new-releases'],
    queryFn: () => getNewReleases('IT', 20),
    staleTime: 1000 * 60 * 30, // 30 min cache
  })

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-orange-400 flex items-center justify-center shadow-lg shadow-accent/30">
          <Music2 size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gradient">Nuove Uscite Musicali</h1>
          <p className="text-sm text-muted">Le ultime uscite su Spotify</p>
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      )}

      {isError && (
        <div className="card text-center py-10 text-red-400">
          Errore nel caricamento delle nuove uscite. Riprova più tardi.
        </div>
      )}

      {albums && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {albums.map((album) => (
            <AlbumCard key={album.spotify_id} album={album} />
          ))}
        </div>
      )}
    </div>
  )
}
