import type { ReactNode } from 'react';

interface Props {
  coverUrl: string | null | undefined;
  alt: string;
  className?: string;
  children?: ReactNode;
}

export default function TrackCover({ coverUrl, alt, className = 'track-row-cover', children }: Props) {
  const src = coverUrl
    ? `http://localhost:5000/uploads/${coverUrl}`
    : '/Defcover.png';

  return (
    <div className={className}>
      <img
        src={src}
        alt={alt}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        onError={(e) => {
          if (!e.currentTarget.src.includes('Defcover')) {
            e.currentTarget.src = '/Defcover.png';
          }
        }}
      />
      {children}
    </div>
  );
}