import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../store/auth';
import { usePlayer } from '../store/player';
import SortableTrackRow from '../components/SortableTrackRow';
import type { Track } from '../types';

import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers';

export default function LikedTracks() {
  const { user } = useAuth();
  const { setTrack, current, isPlaying, togglePlay, updateQueue } = usePlayer();
  const navigate = useNavigate();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [recentlyDropped, setRecentlyDropped] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 500, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    api.get<Track[]>('/reactions/me')
      .then((res) => setTracks(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [user, navigate]);

  const isPlaylistPlaying = isPlaying && current && tracks.some(t => t.id === current.id);

  const handleMainPlay = () => {
    if (isPlaylistPlaying) togglePlay();
    else if (tracks.length > 0) setTrack(tracks[0], tracks);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = tracks.findIndex((t) => t.id === active.id);
    const newIndex = tracks.findIndex((t) => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const newTracks = arrayMove(tracks, oldIndex, newIndex);
    setTracks(newTracks);
    updateQueue(newTracks);

    setRecentlyDropped(active.id as number);
    setTimeout(() => setRecentlyDropped(null), 300);

    try {
      await api.put('/reactions/me/reorder', { trackIds: newTracks.map(t => t.id) });
    } catch (err) {
      console.error('Ошибка сохранения порядка:', err);
    }
  };

  if (loading) return <p className="muted">Загрузка...</p>;

  return (
    <div className="playlist-page">
      <header className="playlist-header">
        <div className="playlist-cover-large liked-cover">
          <svg viewBox="0 0 24 24" width="80" height="80" fill="#fff">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
        </div>
        
        <div className="playlist-header-content">
          <div className="playlist-info">
            <span className="playlist-type">Плейлист</span>
            <h1 className="playlist-name">Любимые треки</h1>
            <div className="playlist-meta">
              <span>{user?.name ?? 'Вы'}</span>
              <span>•</span>
              <span>{tracks.length} треков</span>
            </div>
          </div>

          <div className="playlist-actions-inline">
            <button className="btn-play-large" onClick={handleMainPlay} disabled={tracks.length === 0}>
              {isPlaylistPlaying ? (
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>
              ) : (
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
              )}
            </button>
          </div>
        </div>
      </header>

      <div className="search-tracks-list one-col">
        {tracks.length === 0 ? (
          <p className="muted">Вы пока не лайкнули ни одного трека.</p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd} modifiers={[restrictToVerticalAxis, restrictToParentElement]}>
            <SortableContext items={tracks.map(t => t.id)} strategy={verticalListSortingStrategy}>
              {tracks.map((track) => (
                <SortableTrackRow
                  key={track.id}
                  track={track}
                  isCurrent={current?.id === track.id}
                  isRecentlyDropped={recentlyDropped === track.id}
                  onPlay={() => setTrack(track, tracks)}
                  togglePlay={togglePlay}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}