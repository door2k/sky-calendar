import type { Person } from '../types';

interface PersonAvatarProps {
  person: Person;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
}

export function PersonAvatar({ person, size = 'sm', showName = true }: PersonAvatarProps) {
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
  };

  const hasAvatar = person.avatar_url;
  const hasSecondAvatar = person.avatar_url_2;
  const isDualPerson = hasSecondAvatar;

  // For dual avatars (e.g., "Gili & Yossi"), show overlapping circles
  if (isDualPerson && hasAvatar) {
    return (
      <div className="flex items-center gap-1">
        <div className="flex -space-x-2">
          <img
            src={person.avatar_url}
            alt=""
            className={`${sizeClasses[size]} rounded-full object-cover border-2 border-white`}
          />
          <img
            src={person.avatar_url_2}
            alt=""
            className={`${sizeClasses[size]} rounded-full object-cover border-2 border-white`}
          />
        </div>
        {showName && <span>{person.name}</span>}
      </div>
    );
  }

  // Single avatar
  if (hasAvatar) {
    return (
      <div className="flex items-center gap-1">
        <img
          src={person.avatar_url}
          alt=""
          className={`${sizeClasses[size]} rounded-full object-cover`}
        />
        {showName && <span>{person.name}</span>}
      </div>
    );
  }

  // No avatar - just show name
  return showName ? <span>{person.name}</span> : null;
}
