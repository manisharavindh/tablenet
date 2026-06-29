import React, { useState } from 'react';

export default function ImageFallback({ src, name, className, alt, ...props }) {
  const [error, setError] = useState(false);

  if (error || !src) {
    const isSmall = className && className.includes('w-10');
    return (
      <div className={`bg-theme-primary/10 flex flex-col items-center justify-center text-theme-primary font-bold overflow-hidden ${className}`} {...props}>
        <span className={`${isSmall ? 'text-[8px] leading-[1.1] px-0.5 line-clamp-3 text-center' : 'text-base sm:text-lg opacity-80 px-2 line-clamp-4 leading-tight text-center uppercase tracking-wide'}`}>
          {name || '?'}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt || name}
      className={className}
      onError={() => setError(true)}
      {...props}
    />
  );
}
