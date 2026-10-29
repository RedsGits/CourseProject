import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FastAverageColor } from 'fast-average-color';
import { api } from '../api/client';
import { useAuth } from '../store/auth';
import { usePlayer } from '../store/player';
import SortableTrackRow from '../components/SortableTrackRow';
import type { Track } from '../types';

import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
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

const IconTrash = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
  </svg>
);

const IconEdit = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
  </svg>
);

export default function PlaylistDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { setTrack, current, isPlaying, togglePlay, updateQueue, playbackContext, removeTrackFromQueue, stop } = usePlayer();
  const navigate = useNavigate();
  
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCoverOpen, setIsCoverOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [recentlyDropped, setRecentlyDropped] = useState<number | null>(null);
  
  const [isDeletePlaylistModalOpen, setIsDeletePlaylistModalOpen] = useState(false);
  const [trackToDelete, setTrackToDelete] = useState<number | null>(null);

  const [dominantColor, setDominantColor] = useState<string>('var(--bg-elevated)');
  const imgRef = useRef<HTMLImageElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 500, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchPlaylist = () => {
    api.get<Playlist>(`/playlists/${id}`)
      .then((res) => {
        setPlaylist(res.data);
        setEditedName(res.data.name);
      })
      .catch((err) => {
        console.error(err);
        setError(true);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPlaylist();
  }, [id]);

  const extractColor = async (img: HTMLImageElement) => {
    try {
      const fac = new FastAverageColor();
      const color = await fac.getColorAsync(img);
      setDominantColor(color.hex);
    } catch (err) {
      console.error('Ошибка извлечения цвета:', err);
    }
  };

  const handleImageLoad = () => {
    if (imgRef.current) extractColor(imgRef.current);
  };

  useEffect(() => {
    setDominantColor('var(--bg-elevated)');
    if (playlist?.coverUrl) {
      const timer = setTimeout(() => {
        if (imgRef.current) extractColor(imgRef.current);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [id, playlist?.coverUrl]);

  useEffect(() => {
    if (isEditingName) {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }
  }, [isEditingName]);

  const tracks = playlist?.tracks || [];
  const filteredTracks = tracks.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()));
  const isPlaylistPlaying = isPlaying && playbackContext === `playlist-${id}`;

  const handleMainPlay = () => {
    if (isPlaylistPlaying) {
      togglePlay();
    } else if (tracks.length > 0) {
      setTrack(tracks[0], tracks, `playlist-${id}`);
    }
  };

  const handleTogglePrivacy = async () => {
    if (!playlist) return;
    const newStatus = !playlist.isPublic;
    setPlaylist({ ...playlist, isPublic: newStatus });
    try {
      await api.patch(`/playlists/${id}`, { isPublic: newStatus });
    } catch (err) {
      setPlaylist({ ...playlist, isPublic: !newStatus });
    }
  };

  const handleSaveName = async () => {
    if (!playlist || !editedName.trim() || editedName === playlist.name) {
      setIsEditingName(false);
      setEditedName(playlist?.name || '');
      return;
    }

    const newName = editedName.trim();
    setPlaylist({ ...playlist, name: newName });
    setIsEditingName(false);

    try {
      await api.patch(`/playlists/${id}`, { name: newName });
    } catch (err) {
      console.error('Ошибка смены названия:', err);
      setPlaylist({ ...playlist, name: playlist.name });
      setEditedName(playlist.name);
    }
  };

  const handleKeyDownName = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSaveName();
    if (e.key === 'Escape') {
      setIsEditingName(false);
      setEditedName(playlist?.name || '');
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
      await api.put(`/playlists/${id}/reorder`, { trackIds: newTracks.map(t => t.id) });
    } catch (err) {
      console.error('Ошибка сохранения порядка:', err);
    }
  };

  const handleDeleteTrackClick = (e: React.MouseEvent, trackId: number) => {
    e.stopPropagation();
    setTrackToDelete(trackId);
  };

  const confirmDeleteTrack = async () => {
    if (!trackToDelete) return;
    try {
      await api.delete(`/playlists/${id}/tracks/${trackToDelete}`);
      setPlaylist((prev) => prev ? { ...prev, tracks: prev.tracks?.filter(t => t.id !== trackToDelete) } : null);
      removeTrackFromQueue(trackToDelete);
      setTrackToDelete(null);
    } catch (err) {
      console.error('Ошибка удаления трека:', err);
    }
  };

  const confirmDeletePlaylist = async () => {
    try {
      await api.delete(`/playlists/${id}`);
      if (playbackContext === `playlist-${id}`) stop();
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

  const getTitleFontSize = (text: string) => {
    const len = text.length;
    if (len <= 15) return '64px';
    if (len <= 25) return '52px';
    if (len <= 35) return '42px';
    if (len <= 45) return '34px';
    return '28px';
  };

  return (
    <div className="playlist-page">
      <div 
        className="playlist-gradient-bg" 
        style={{ background: `linear-gradient(to bottom, ${dominantColor} 0%, var(--bg) 80%)` }}
      />

      <header className="playlist-header" style={{ position: 'relative', zIndex: 1 }}>
        <div className="playlist-cover-large playlist-cover-interactive" onClick={() => setIsCoverOpen(true)}>
          {playlist.coverUrl ? (
            <img 
              ref={imgRef}
              src={`http://localhost:5000/uploads/${playlist.coverUrl}`} 
              alt="Cover" 
              className="playlist-cover-img"
              crossOrigin="anonymous"
              onLoad={handleImageLoad}
            />
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
            
            <div className="playlist-name-wrapper">
              {isEditingName ? (
                <input
                  ref={nameInputRef}
                  type="text"
                  className="playlist-name-input"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  onBlur={handleSaveName}
                  onKeyDown={handleKeyDownName}
                  maxLength={50}
                  style={{ fontSize: getTitleFontSize(editedName) }}
                />
              ) : (
                <>
                  <h1 className="playlist-name" style={{ fontSize: getTitleFontSize(playlist.name) }}>
                    {playlist.name}
                  </h1>
                  {isOwner && (
                    <button 
                      className="playlist-name-edit-btn" 
                      onClick={() => setIsEditingName(true)}
                      title="Изменить название"
                    >
                      <IconEdit />
                    </button>
                  )}
                </>
              )}
            </div>

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
              <div className="playlist-owner-controls">
                <label className="toggle-switch">
                  <input type="checkbox" checked={playlist.isPublic} onChange={handleTogglePrivacy} />
                  <span className="toggle-slider"></span>
                  <span className={`toggle-label ${playlist.isPublic ? 'is-public' : ''}`}>
                    {playlist.isPublic ? 'Публичный' : 'Приватный'}
                  </span>
                </label>
                <button className="btn-pill btn-delete-pill" onClick={() => setIsDeletePlaylistModalOpen(true)}>
                  <IconTrash /> Удалить
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div style={{ position: 'relative', zIndex: 1 }}>
        {tracks.length > 0 && (
          <div className="search-input-wrap playlist-search-wrap">
            <span className="search-input-icon">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
              </svg>
            </span>
            <input type="text" placeholder="Поиск в плейлисте..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            {searchQuery.length > 0 && (
              <button className="search-clear-btn" onClick={() => setSearchQuery('')}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></svg>
              </button>
            )}
          </div>
        )}

        <div className="search-tracks-list one-col">
          {tracks.length === 0 ? (
            <p className="muted">В этом плейлисте пока нет треков.</p>
          ) : filteredTracks.length === 0 ? (
            <p className="muted">По запросу «{searchQuery}» ничего не найдено.</p>
          ) : searchQuery ? (
            filteredTracks.map((track) => (
              <SortableTrackRow
                key={track.id}
                track={track}
                isCurrent={current?.id === track.id}
                isPlaying={current?.id === track.id && isPlaying}
                isOwner={isOwner}
                isRecentlyDropped={false}
                onPlay={() => setTrack(track, filteredTracks, `playlist-${id}`)}
                onDelete={(e) => handleDeleteTrackClick(e, track.id)}
                togglePlay={togglePlay}
              />
            ))
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd} modifiers={[restrictToVerticalAxis, restrictToParentElement]}>
              <SortableContext items={tracks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                {tracks.map((track) => {
                  const isCurrent = current?.id === track.id;
                  return (
                    <SortableTrackRow
                      key={track.id}
                      track={track}
                      isCurrent={!!isCurrent}
                      isPlaying={!!isCurrent && isPlaying}
                      isOwner={isOwner}
                      isRecentlyDropped={recentlyDropped === track.id}
                      onPlay={() => setTrack(track, tracks, `playlist-${id}`)}
                      onDelete={(e) => handleDeleteTrackClick(e, track.id)}
                      togglePlay={togglePlay}
                    />
                  );
                })}
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>

      {isDeletePlaylistModalOpen && (
        <div className="modal-overlay" onClick={() => setIsDeletePlaylistModalOpen(false)}>
          <div className="auth-card modal-card" onClick={(e) => e.stopPropagation()}>
            <h1 className="modal-title">Удалить плейлист?</h1>
            <p className="modal-desc">Вы уверены, что хотите навсегда удалить плейлист <strong>{playlist.name}</strong>? Это действие нельзя отменить.</p>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setIsDeletePlaylistModalOpen(false)}>Отмена</button>
              <button className="btn-danger" onClick={confirmDeletePlaylist}>Удалить</button>
            </div>
          </div>
        </div>
      )}

      {trackToDelete !== null && (
        <div className="modal-overlay" onClick={() => setTrackToDelete(null)}>
          <div className="auth-card modal-card" onClick={(e) => e.stopPropagation()}>
            <h1 className="modal-title">Удалить трек?</h1>
            <p className="modal-desc">Вы уверены, что хотите убрать этот трек из плейлиста?</p>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setTrackToDelete(null)}>Отмена</button>
              <button className="btn-danger" onClick={confirmDeleteTrack}>Удалить</button>
            </div>
          </div>
        </div>
      )}

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