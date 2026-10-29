import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../store/auth';
import { usePlayer } from '../store/player';
import SortableTrackRow from '../components/SortableTrackRow';
import type { Track } from '../types';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers';

interface Playlist {
  id: number;
  name: string;
  isPublic: boolean;
  userId: number;
  coverUrl: string | null;
  owner?: { name: string | null; email: string; } | null;
  tracks?: Track[];
}

export default function PlaylistDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { setTrack, current, isPlaying, togglePlay, updateQueue } = usePlayer();
  const navigate = useNavigate();
  
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCoverOpen, setIsCoverOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [recentlyDropped, setRecentlyDropped] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 500, 
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchPlaylist = () => {
    api.get<Playlist>(`/playlists/${id}`)
      .then((res) => setPlaylist(res.data))
      .catch((err) => {
        console.error(err);
        setError(true);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPlaylist();
  }, [id]);

  const tracks = playlist?.tracks || [];
  const isPlaylistPlaying = isPlaying && current && tracks.some(t => t.id === current.id);

  const handleMainPlay = () => {
    if (isPlaylistPlaying) {
      togglePlay();
    } else if (tracks.length > 0) {
      setTrack(tracks[0], tracks);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id || !playlist) return;

    const oldIndex = tracks.findIndex((t) => t.id === active.id);
    const newIndex = tracks.findIndex((t) => t.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const newTracks = arrayMove(tracks, oldIndex, newIndex);
    setPlaylist({ ...playlist, tracks: newTracks });

    updateQueue(newTracks);

    setRecentlyDropped(active.id as number);
    setTimeout(() => setRecentlyDropped(null), 300);

    try {
      await api.put(`/playlists/${id}/reorder`, {
        trackIds: newTracks.map(t => t.id)
      });
    } catch (err) {
      console.error('Ошибка сохранения порядка:', err);
    }
  };

  const handleDeleteTrack = async (e: React.MouseEvent, trackId: number) => {
    e.stopPropagation();
    if (!window.confirm('Удалить трек из плейлиста?')) return;
    try {
      await api.delete(`/playlists/${id}/tracks/${trackId}`);
      setPlaylist((prev) => prev ? { ...prev, tracks: prev.tracks?.filter(t => t.id !== trackId) } : null);
    } catch (err) {
      console.error('Ошибка удаления:', err);
    }
  };

  const handleDeletePlaylist = async () => {
    if (!window.confirm('Вы уверены, что хотите удалить плейлист?')) return;
    try {
      await api.delete(`/playlists/${id}`);
      navigate('/library');
    } catch (err) {
      console.error('Ошибка удаления плейлиста:', err);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('cover', file);

    try {
      const { data } = await api.post(`/playlists/${id}/cover`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPlaylist((prev) => prev ? { ...prev, coverUrl: data.coverUrl } : null);
    } catch (err) {
      console.error('Ошибка загрузки обложки:', err);
      alert('Не удалось загрузить обложку');
    } finally {
      setIsUploading(false);
    }
  };

  if (loading) return <p className="muted">Загрузка...</p>;
  if (error || !playlist) return <p className="muted">Плейлист не найден или у вас нет к нему доступа.</p>;

  const isOwner = user?.id === playlist.userId;

  return (
    <div className="playlist-page">
      <header className="playlist-header">
        <div className="playlist-cover-large playlist-cover-interactive" onClick={() => setIsCoverOpen(true)}>
          {playlist.coverUrl ? (
            <img src={`http://localhost:5000/uploads/${playlist.coverUrl}`} alt="Cover" className="playlist-cover-img" />
          ) : (
            <svg viewBox="0 0 24 24" width="80" height="80" fill="#fff">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
          )}
          {isOwner && (
            <div className="playlist-cover-overlay">
              <button className="btn-upload-cover" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }} disabled={isUploading}>
                {isUploading ? 'Загрузка...' : 'Изменить обложку'}
              </button>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" style={{ display: 'none' }} onClick={(e) => e.stopPropagation()} />
            </div>
          )}
        </div>

        <div className="playlist-header-content">
          <div className="playlist-info">
            <span className="playlist-type">{playlist.isPublic ? 'Публичный плейлист' : 'Приватный плейлист'}</span>
            <h1 className="playlist-name">{playlist.name}</h1>
            <div className="playlist-meta">
              <span>{playlist.owner?.name || playlist.owner?.email || 'Пользователь'}</span>
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
            {isOwner && (
              <button className="btn-delete-playlist" onClick={handleDeletePlaylist} title="Удалить плейлист">Удалить</button>
            )}
          </div>
        </div>
      </header>

      <div className="search-tracks-list one-col">
        {tracks.length === 0 ? (
          <p className="muted">В этом плейлисте пока нет треков.</p>
        ) : (
          <DndContext 
            sensors={sensors} 
            collisionDetection={closestCenter} 
            onDragEnd={handleDragEnd}
            modifiers={[restrictToVerticalAxis, restrictToParentElement]}
          >
            <SortableContext items={tracks.map(t => t.id)} strategy={verticalListSortingStrategy}>
              {tracks.map((track) => {
                const isCurrent = current?.id === track.id;
                return (
                  <SortableTrackRow
                    key={track.id}
                    track={track}
                    isCurrent={!!isCurrent}
                    isOwner={isOwner}
                    isRecentlyDropped={recentlyDropped === track.id}
                    onPlay={() => setTrack(track, tracks)}
                    onDelete={(e) => handleDeleteTrack(e, track.id)}
                    togglePlay={togglePlay}
                  />
                );
              })}
            </SortableContext>
          </DndContext>
        )}
      </div>

      {isCoverOpen && (
        <div className="cover-fullscreen-modal" onClick={() => setIsCoverOpen(false)}>
          <div className="cover-fullscreen-content" onClick={(e) => e.stopPropagation()}>
            {playlist.coverUrl ? (
              <img src={`http://localhost:5000/uploads/${playlist.coverUrl}`} alt="Cover" className="cover-fullscreen-img" />
            ) : (
              <div className="cover-fullscreen-placeholder">
                <svg viewBox="0 0 24 24" width="120" height="120" fill="#fff"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" /></svg>
              </div>
            )}
            <button className="close-fullscreen-btn" onClick={() => setIsCoverOpen(false)}>✕</button>
          </div>
        </div>
      )}
    </div>
  );
}