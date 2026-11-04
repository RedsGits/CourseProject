import { useState, useEffect, useRef } from 'react';
import { api } from '../../api/client';
import UploadTracksModal from './UploadTracksModal';
import EditAlbumModal from './EditAlbumModal';
import type { Album, Track } from '../../types';
import EditTrackModal from './EditTrackModal';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers';
import SortableAlbumTrackRow from './SortableAlbumTrackRow';
import TrackCover from '../TrackCover';
import KaraokeEditorModal from './KaraokeEditorModal';
import { formatAlbumType } from '../../api/format'
import { useAuth } from '../../store/auth';

interface AlbumWithTracks extends Album {
  tracks: Track[];
}

interface Props {
  albumId: number;
  onClose: () => void;
  onChange: () => void;
}

function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function AlbumDetailModal({ albumId, onClose, onChange }: Props) {
  const [album, setAlbum] = useState<AlbumWithTracks | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [karaokeTrack, setKaraokeTrack] = useState<Track | null>(null);

  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const coverInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !album) return;

    const oldIndex = album.tracks.findIndex((t) => t.id === active.id);
    const newIndex = album.tracks.findIndex((t) => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const newTracks = arrayMove(album.tracks, oldIndex, newIndex);
    setAlbum({ ...album, tracks: newTracks });

    try {
        await api.put(`/albums/${albumId}/reorder`, { trackIds: newTracks.map((t) => t.id) });
    } catch (err: any) {
        alert(err.response?.data?.error || 'Не удалось сохранить порядок');
        await loadAlbum();
    }
  };

  const loadAlbum = async () => {
    try {
      const { data } = await api.get<AlbumWithTracks>(`/albums/${albumId}`);
      setAlbum(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка загрузки альбома');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlbum();
  }, [albumId]);

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    try {
      const fd = new FormData();
      fd.append('cover', file);
      await api.post(`/albums/${albumId}/cover`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await loadAlbum();
      onChange();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Не удалось загрузить обложку');
    } finally {
      setUploadingCover(false);
      e.target.value = '';
    }
  };

  const handleDeleteTrack = async (trackId: number, title: string) => {
    if (!confirm(`Удалить трек «${title}»? Файл будет удалён с диска.`)) return;
    try {
      await api.delete(`/tracks/${trackId}`);
      await loadAlbum();
      onChange();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Не удалось удалить трек');
    }
  };

  const handleDeleteAlbum = async () => {
    if (!album) return;
    if (album.tracks.length > 0) {
      alert(`Нельзя удалить альбом: в нём ${album.tracks.length} трек(ов). Сначала удалите их.`);
      return;
    }
    if (!confirm(`Удалить альбом «${album.title}»?`)) return;
    try {
      await api.delete(`/albums/${albumId}`);
      onClose();
      onChange();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Не удалось удалить альбом');
    }
  };

  const primary = album?.artists.find((a) => a.role === 'PRIMARY');
  const featured = album?.artists.filter((a) => a.role === 'FEATURED') ?? [];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="album-detail-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {loading ? (
          <p className="muted" style={{ padding: '40px', textAlign: 'center' }}>Загрузка...</p>
        ) : error || !album ? (
          <p className="muted" style={{ padding: '40px', textAlign: 'center' }}>{error ?? 'Альбом не найден'}</p>
        ) : (
          <>
            <div className="album-detail-header">
              <div
                className="album-detail-cover-wrap"
                onClick={() => !isAdmin && coverInputRef.current?.click()}
                title={!isAdmin ? "Изменить обложку" : undefined}
              >
                <TrackCover
                  coverUrl={album.coverUrl}
                  alt={album.title}
                  className="album-detail-cover"
                />
                {uploadingCover && (
                  <div className="album-detail-cover-overlay">Загрузка...</div>
                )}
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleCoverUpload}
                />
              </div>

              <div className="album-detail-info">
                <span className="label-form-label">{formatAlbumType(album.type)}</span>
                <h2 className="album-detail-title">{album.title}</h2>
                <p className="album-detail-artists">
                  {primary?.name ?? '—'}
                  {featured.length > 0 && `, ${featured.map((a) => a.name).join(', ')}`}
                </p>
                {album.year && <p className="muted" style={{ fontSize: '13px' }}>{album.year}</p>}
              </div>

              <button className="album-detail-close" onClick={onClose} title="Закрыть">
                ✕
              </button>
            </div>

            <div className="album-detail-actions">
              {!isAdmin && (
                <>
                  <button className="label-track-btn" onClick={() => setUploadOpen(true)}>
                    + Загрузить треки
                  </button>
                  <button className="label-track-btn" onClick={() => setEditOpen(true)}>
                    ✎ Редактировать
                  </button>
                </>
              )}
              <button
                className="label-track-btn label-track-btn-danger"
                onClick={handleDeleteAlbum}
              >
                Удалить альбом
              </button>
            </div>

            <div className="album-detail-tracks">
              <h3 className="album-detail-tracks-title">
                Треки ({album.tracks.length})
              </h3>
                {album.tracks.length === 0 ? (
                <p className="muted">Пока нет треков. Загрузите первый.</p>
                ) : (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                    modifiers={[restrictToVerticalAxis, restrictToParentElement]}
                >
                    <SortableContext
                    items={album.tracks.map((t) => t.id)}
                    strategy={verticalListSortingStrategy}
                    >
                    {album.tracks.map((track, index) => (
                        <SortableAlbumTrackRow
                          key={track.id}
                          track={track}
                          index={index}
                          onEdit={() => setEditingTrack(track)}
                          onKaraoke={() => setKaraokeTrack(track)}
                          onDelete={() => handleDeleteTrack(track.id, track.title)}
                        />
                    ))}
                    </SortableContext>
                </DndContext>
                )}
            </div>
          </>
        )}
      </div>

      {uploadOpen && album && (
        <UploadTracksModal
          album={album}
          onClose={() => setUploadOpen(false)}
          onSuccess={() => {
            setUploadOpen(false);
            loadAlbum();
            onChange();
          }}
        />
      )}

      {editOpen && album && (
        <EditAlbumModal
          album={album}
          onClose={() => setEditOpen(false)}
          onSuccess={() => {
            setEditOpen(false);
            loadAlbum();
            onChange();
          }}
        />
      )}
      {editingTrack && (
        <EditTrackModal
            track={editingTrack}
            onClose={() => setEditingTrack(null)}
            onSuccess={() => {
            setEditingTrack(null);
            loadAlbum();
            onChange();
            }}
        />
      )}

      {karaokeTrack && (
        <KaraokeEditorModal
            track={karaokeTrack}
            onClose={() => setKaraokeTrack(null)}
            onSuccess={() => {
            setKaraokeTrack(null);
            loadAlbum();
            onChange();
            }}
        />
      )}
    </div>
  );
}