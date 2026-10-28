import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../store/auth';

export default function LikeButton({ trackId, className = "player-btn" }: { trackId: number, className?: string }) {
  const { user } = useAuth();
  const [isLiked, setIsLiked] = useState(false);

  useEffect(() => {
    if (!user) return;
    api.get(`/reactions/${trackId}`)
      .then((res) => setIsLiked(res.data?.type === 'LIKE'))
      .catch(() => setIsLiked(false));
  }, [trackId, user]);

  useEffect(() => {
    const handleLikeUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ trackId: number; isLiked: boolean }>;
      if (customEvent.detail.trackId === trackId) {
        setIsLiked(customEvent.detail.isLiked);
      }
    };
    window.addEventListener('like-updated', handleLikeUpdate);
    return () => window.removeEventListener('like-updated', handleLikeUpdate);
  }, [trackId]);

  const toggleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;

    const newState = !isLiked;
    setIsLiked(newState);

    window.dispatchEvent(new CustomEvent('like-updated', { detail: { trackId, isLiked: newState } }));

    try {
      if (newState) {
        await api.post(`/reactions/${trackId}`, { type: 'LIKE' });
      } else {
        await api.delete(`/reactions/${trackId}`);
      }
    } catch (err) {
      setIsLiked(!newState);
      window.dispatchEvent(new CustomEvent('like-updated', { detail: { trackId, isLiked: !newState } }));
    }
  };

  return (
    <button
      className={`${className} ${isLiked ? 'is-active' : ''}`}
      onClick={toggleLike}
      title={isLiked ? 'Убрать из избранного' : 'В избранное'}
      style={{ color: isLiked ? 'var(--accent)' : undefined }}
    >
      <svg viewBox="0 0 24 24" width="20" height="20" fill={isLiked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
      </svg>
    </button>
  );
}