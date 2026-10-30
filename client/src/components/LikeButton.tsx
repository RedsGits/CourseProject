import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../store/auth';

const IconHeart = ({ filled }: { filled: boolean }) => (
  <svg viewBox="0 0 24 24" height="22" width="22" fill="currentColor">
    {filled ? (
      <path d="M18.29,16.71Q18,16.43 18,16V14H16q-0.42,0-0.71-0.29Q15,13.43 15,13t0.29-0.71T16,12h2V10q0-0.43 0.29-0.71T19,9t0.71,0.29T20,10v2h2q0.43,0 0.71,0.29T23,13t-0.29,0.71T22,14H20v2q0,0.43-0.29,0.71T19,17t-0.71-0.29ZM1.75,23.63v-3.8v3.8ZM10.3,20.2q-0.35-0.13-0.63-0.4q-1.1-1-2.6-2.28q-1.5-1.27-2.85-2.74T1.94,11.73T1,8.48Q1,6.13 2.58,4.56T6.5,3Q7.8,3 8.98,3.54T11,5.07q0.85-1 2.03-1.54T15.5,3q1.57,0 2.79,0.74T20.2,5.6q0.27,0.48-0.09,0.96T19.08,7q-0.1,0-0.2,0q-0.1,0-0.2,0q-2.13,0-3.9,1.71Q13,10.43 13,13q0,1.05 0.34,1.99T14.4,16.7q0.28,0.3 0.24,0.7T14.3,18.08l-1.97,1.75q-0.28,0.28-0.63,0.39q-0.35,0.11-0.7,0.11T10.3,20.2Z" />
    ) : (
      <path d="M10.85,11.65ZM1,8.48Q1,6.13 2.58,4.56T6.5,3Q7.8,3 8.98,3.55T11,5.1q0.85-1 2.03-1.55T15.5,3q1.78,0 3.05,0.89t1.93,2.29q0.18,0.38 0.02,0.76T19.98,7.5T19.21,7.52Q18.83,7.38 18.65,7Q18.2,6 17.33,5.5T15.5,5q-1.15,0-2.1,0.65t-1.65,1.6q-0.13,0.2-0.32,0.29Q11.23,7.63 11,7.63q-0.22,0-0.42-0.1q-0.2-0.1-0.33-0.27Q9.55,6.3 8.6,5.65T6.5,5Q5.08,5 4.04,5.99Q3,6.97 3,8.48Q3,9.3 3.35,10.15T4.6,12.11q0.9,1.11 2.45,2.6T11,18.3l2.23-1.95q0.3-0.28 0.7-0.25t0.68,0.3q0.3,0.3 0.29,0.74t-0.34,0.71l-2.22,1.97q-0.28,0.25-0.63,0.38T11,20.33T10.3,20.2T9.68,19.8q-1.13-1-2.61-2.28q-1.49-1.27-2.84-2.74T1.94,11.73T1,8.48ZM18,14H16q-0.42,0-0.71-0.29Q15,13.43 15,13t0.29-0.71T16,12h2V10q0-0.43 0.29-0.71T19,9t0.71,0.29T20,10v2h2q0.43,0 0.71,0.29T23,13t-0.29,0.71T22,14H20v2q0,0.43-0.29,0.71T19,17t-0.71-0.29Q18,16.43 18,16V14Z" />
    )}
  </svg>
);

const IconBrokenHeart = ({ filled }: { filled: boolean }) => (
  <svg viewBox="0 0 24 24" height="22" width="22" fill="currentColor">
    {filled ? (
      <path d="M16,14q-0.42,0-0.71-0.29Q15,13.43 15,13t0.29-0.71T16,12h6q0.43,0 0.71,0.29T23,13t-0.29,0.71T22,14H16Zm-5.7,6.2q-0.35-0.13-0.63-0.4q-1.1-1-2.6-2.28q-1.5-1.27-2.85-2.74T1.94,11.73T1,8.48Q1,6.13 2.58,4.56T6.5,3Q7.8,3 8.98,3.54T11,5.07q0.85-1 2.03-1.54T15.5,3q1.57,0 2.79,0.74T20.2,5.6q0.27,0.48-0.09,0.96T19.08,7q-0.1,0-0.2,0q-0.1,0-0.2,0q-2.13,0-3.9,1.71Q13,10.43 13,13q0,1.05 0.34,1.99T14.4,16.7q0.28,0.3 0.24,0.7T14.3,18.08l-1.97,1.75q-0.28,0.28-0.63,0.39q-0.35,0.11-0.7,0.11T10.3,20.2Z" />
    ) : (
      <path d="M16,14q-0.42,0-0.71-0.29Q15,13.43 15,13t0.29-0.71T16,12h6q0.43,0 0.71,0.29T23,13t-0.29,0.71T22,14H16Zm-5.15-2.35ZM1,8.48Q1,6.13 2.58,4.56T6.5,3Q7.8,3 8.98,3.55T11,5.1q0.85-1 2.03-1.55T15.5,3q2.28,0 3.91,1.55t1.64,3.83q0,0.15 0,0.29T21.03,8.95q-0.05,0.6-0.4,0.84q-0.35,0.24-0.74,0.2T19.2,9.67T18.95,8.95q0.03-0.15 0.04-0.29Q19,8.52 19,8.38q0-1.45-1.02-2.41T15.5,5q-1.15,0-2.1,0.65t-1.65,1.6q-0.13,0.2-0.32,0.29Q11.23,7.63 11,7.63q-0.22,0-0.42-0.1q-0.2-0.1-0.33-0.27Q9.55,6.3 8.6,5.65T6.5,5Q5.08,5 4.04,5.99Q3,6.97 3,8.48Q3,9.3 3.35,10.15T4.6,12.11q0.9,1.11 2.45,2.6T11,18.3l2.23-1.95q0.3-0.28 0.7-0.25t0.68,0.3q0.3,0.3 0.29,0.74t-0.34,0.71l-2.22,1.97q-0.28,0.25-0.63,0.38T11,20.33T10.3,20.2T9.68,19.8q-1.13-1-2.61-2.28q-1.49-1.27-2.84-2.74T1.94,11.73T1,8.48Z" />
    )}
  </svg>
);



export default function LikeButton({ 
  trackId, 
  className = "player-btn",
  type = 'like' 
}: { 
  trackId: number, 
  className?: string,
  type?: 'like' | 'dislike' 
}) {
  const { user } = useAuth();
  const [reaction, setReaction] = useState<'LIKE' | 'DISLIKE' | null>(null);

  useEffect(() => {
    if (!user) return;
    api.get(`/reactions/${trackId}`)
      .then((res) => setReaction(res.data?.type || null))
      .catch(() => setReaction(null));
  }, [trackId, user]);

  useEffect(() => {
    const handleLikeUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ trackId: number; reaction: 'LIKE' | 'DISLIKE' | null }>;
      if (customEvent.detail.trackId === trackId) {
        setReaction(customEvent.detail.reaction);
      }
    };
    window.addEventListener('like-updated', handleLikeUpdate);
    return () => window.removeEventListener('like-updated', handleLikeUpdate);
  }, [trackId]);

  const handleReaction = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;

    const targetType = type === 'like' ? 'LIKE' : 'DISLIKE';
    const newReaction = reaction === targetType ? null : targetType;
    setReaction(newReaction);
    
    window.dispatchEvent(new CustomEvent('like-updated', { detail: { trackId, reaction: newReaction } }));

    try {
      if (newReaction === null) {
        await api.delete(`/reactions/${trackId}`);
      } else {
        await api.post(`/reactions/${trackId}`, { type: newReaction });
      }
    } catch (err) {
      setReaction(reaction);
      window.dispatchEvent(new CustomEvent('like-updated', { detail: { trackId, reaction } }));
    }
  };

  const isActive = reaction === (type === 'like' ? 'LIKE' : 'DISLIKE');

  return (
    <button
      className={`${className} ${isActive ? 'is-active' : ''}`}
      onClick={handleReaction}
      title={type === 'like' ? (isActive ? 'Убрать из избранного' : 'В избранное') : (isActive ? 'Убрать дизлайк' : 'Не нравится')}
      style={{ 
        color: isActive 
          ? (type === 'like' ? 'var(--accent)' : '#6eb4ff') 
          : undefined
      }}
    >
      {type === 'like' ? (
        <IconHeart filled={isActive} />
      ) : (
        <IconBrokenHeart filled={isActive} />
      )}
    </button>
  );
}