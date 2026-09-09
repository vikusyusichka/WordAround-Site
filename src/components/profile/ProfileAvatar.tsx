/* The avatar circle — port of ProfileView.avatar + initialsLabel.

   Three layers, in falling-back order: the photo if there is one and it loads,
   the initials otherwise, and a person glyph when there is nothing to take
   initials from. The coloured fill and white ring are always drawn, so the
   avatar looks deliberate even for an account with no name and no photo — which
   matters here, because photo upload depends on a Storage rule that may not be
   published yet. */
import { useEffect, useState } from 'react';

import { Icon } from '@/components/primitives/Icon';
import { avatarColorMeta, type ProfileAvatarColorId } from '@/lib/profileAvatarColor';

interface ProfileAvatarProps {
  size: number;
  color: ProfileAvatarColorId;
  initials: string;
  photoURL?: string | null;
  /** iOS uses a 3px ring on the profile card and 4px in the edit sheet. */
  ringWidth?: number;
  className?: string;
}

export const ProfileAvatar = ({
  size,
  color,
  initials,
  photoURL,
  ringWidth = 3,
  className = '',
}: ProfileAvatarProps) => {
  const meta = avatarColorMeta(color);
  const [photoFailed, setPhotoFailed] = useState(false);

  /* A new URL deserves a fresh attempt — otherwise one failed load would keep
     the initials showing after the learner picks a different picture. */
  useEffect(() => setPhotoFailed(false), [photoURL]);

  const showsPhoto = Boolean(photoURL) && !photoFailed;

  return (
    <span
      className={`relative grid shrink-0 place-items-center overflow-hidden rounded-full ${className}`}
      style={{
        width: size,
        height: size,
        background: meta.fill,
        boxShadow: `inset 0 0 0 ${ringWidth}px rgba(255,255,255,0.7)`,
      }}
    >
      {showsPhoto ? (
        <img
          src={photoURL as string}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setPhotoFailed(true)}
        />
      ) : initials ? (
        <span
          className="font-black"
          style={{ color: meta.accent, fontSize: Math.round(size / 3) }}
        >
          {initials}
        </span>
      ) : (
        <Icon
          name="person.fill"
          style={{ color: meta.accent }}
          className="size-[38%]"
          aria-hidden
        />
      )}
    </span>
  );
};
