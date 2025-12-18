'use client';

import { type HTMLAttributes } from 'react';
import { cn, getInitials } from '@/lib/utils';

export interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt?: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

const sizes = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-12 h-12 text-lg',
  xl: 'w-16 h-16 text-xl',
};

export function Avatar({
  src,
  alt,
  name,
  size = 'md',
  className,
  ...props
}: AvatarProps) {
  const initials = name ? getInitials(name) : '?';

  if (src) {
    return (
      <div
        className={cn(
          'relative rounded-full overflow-hidden bg-gray-100',
          sizes[size],
          className
        )}
        {...props}
      >
        <img
          src={src}
          alt={alt || name || 'Avatar'}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full',
        'bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-medium',
        sizes[size],
        className
      )}
      {...props}
    >
      {initials}
    </div>
  );
}

export function AvatarGroup({
  children,
  max = 4,
  className,
}: {
  children: React.ReactNode[];
  max?: number;
  className?: string;
}) {
  const displayChildren = children.slice(0, max);
  const remaining = children.length - max;

  return (
    <div className={cn('flex -space-x-2', className)}>
      {displayChildren.map((child, index) => (
        <div
          key={index}
          className="ring-2 ring-white rounded-full"
        >
          {child}
        </div>
      ))}
      {remaining > 0 && (
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 text-gray-600 text-sm font-medium ring-2 ring-white">
          +{remaining}
        </div>
      )}
    </div>
  );
}
