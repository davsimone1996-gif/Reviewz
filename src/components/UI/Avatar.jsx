export default function Avatar({ src, username, size = 'md', className = '' }) {
  const sizes = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-14 h-14 text-xl', xl: 'w-20 h-20 text-2xl' }
  const initials = username ? username.slice(0, 2).toUpperCase() : '?'

  return src ? (
    <img
      src={src}
      alt={username}
      className={`${sizes[size]} rounded-full object-cover flex-shrink-0 ${className}`}
    />
  ) : (
    <div className={`${sizes[size]} rounded-full bg-accent flex items-center justify-center font-semibold text-white flex-shrink-0 ${className}`}>
      {initials}
    </div>
  )
}
