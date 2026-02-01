import type { Person } from '../types';

interface PersonAvatarProps {
  person: Person;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showName?: boolean;
  printSize?: boolean; // 50% larger for print views
  translateName?: (name: string) => string;
}

export function PersonAvatar({ person, size = 'sm', showName = true, printSize = false, translateName }: PersonAvatarProps) {
  // Regular sizes
  const regularSizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
    xl: 'w-12 h-12 text-lg', // 2x the sm size for family dinner
  };

  // Print sizes (50% larger)
  const printSizeClasses = {
    sm: 'w-9 h-9 text-sm',
    md: 'w-12 h-12 text-base',
    lg: 'w-14 h-14 text-lg',
    xl: 'w-16 h-16 text-xl', // 2x for family dinner in print
  };

  const sizeClasses = printSize ? printSizeClasses : regularSizeClasses;
  const displayName = translateName ? translateName(person.name) : person.name;

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
        {showName && <span>{displayName}</span>}
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
        {showName && <span>{displayName}</span>}
      </div>
    );
  }

  // No avatar - just show name
  return showName ? <span>{displayName}</span> : null;
}
