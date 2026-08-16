import { useState, useEffect, type ReactNode } from 'react';

interface VisitorAvatarProps {
  name: string;
  photoUrl?: string | null;
  /**
   * Pixel size, or 'auto' to let `className` own the dimensions — needed where
   * the avatar sizes responsively, since an inline style would always beat a
   * Tailwind breakpoint utility.
   */
  size?: number | 'auto';
  className?: string;
  /**
   * Placeholder shown when the person has no photo, or their photo fails to
   * load. Defaults to the blue initial badge; screens with their own avatar
   * styling pass theirs so the design is unchanged.
   */
  fallback?: ReactNode;
}

export default function VisitorAvatar({
  name,
  photoUrl,
  size = 44,
  className = '',
  fallback,
}: VisitorAvatarProps) {
  const [broken, setBroken] = useState(false);
  // A new URL deserves a fresh attempt, otherwise one failure would keep the
  // placeholder pinned after a re-upload swaps the photo in.
  useEffect(() => { setBroken(false); }, [photoUrl]);

  const initial = name?.trim()?.charAt(0)?.toUpperCase() || '?';
  const showPhoto = !!photoUrl && !broken;

  return (
    <div
      className={`rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 ${
        showPhoto || fallback ? '' : 'bg-slate-950 dark:bg-black text-white'
      } ${className}`}
      style={size === 'auto' ? undefined : { width: size, height: size }}
    >
      {showPhoto ? (
        <img
          src={photoUrl as string}
          alt={`${name}'s profile photo`}
          className="w-full h-full object-cover"
          onError={() => setBroken(true)}
        />
      ) : fallback ? (
        fallback
      ) : (
        <span
          className="font-black text-white"
          style={size === 'auto' ? undefined : { fontSize: size * 0.4 }}
        >
          {initial}
        </span>
      )}
    </div>
  );
}
