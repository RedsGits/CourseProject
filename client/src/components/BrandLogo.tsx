import type { ReactEventHandler } from 'react';
import { useTheme } from '../store/theme';

interface Props {
  variant?: 'full' | 'icon';
  className?: string;
  alt?: string;
  onLoad?: ReactEventHandler<HTMLImageElement>;
}

export default function BrandLogo({
  variant = 'full',
  className = '',
  alt = 'DoeReMi',
  onLoad,
}: Props) {
  const theme = useTheme((state) => state.theme);
  const light = theme === 'light';

  const src = variant === 'icon'
    ? (light ? '/Logonotext_alt.png' : '/Logonotext.png')
    : (light ? '/Logo2_alt.png' : '/Logo2.png');

  return <img src={src} className={className} alt={alt} onLoad={onLoad} />;
}
