import { useState, useEffect } from 'react';
import { useAuth } from '../../store/auth';
import { api } from '../../api/client';
import CreateArtistModal from './CreateArtistModal';
import ArtistDetailModal from './ArtistDetailModal';
import type { Artist, Track } from '../../types';

function countryName(code: string | null): string | null {
  if (!code) return null;
  try {
    return new Intl.DisplayNames(['ru'], { type: 'region' }).of(code) ?? null;
  } catch {
    return null;
  }
}

export default function ArtistsTab() {
  const { user } = useAuth();
  const [artists, setArtists] = useState<Artist[]>([]);
  const [editableIds, setEditableIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [openedArtistId, setOpenedArtistId] = useState<number | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const requests: Promise<any>[] = [api.get<Artist[]>('/artists')];
      if (user?.role === 'LABEL') {
        requests.push(api.get<Track[]>(`/tracks?labelId=${user.id}`));
      }

      const [artistsRes, tracksRes] = await Promise.all(requests);
      setArtists(artistsRes.data);

      if (user?.role === 'LABEL' && tracksRes) {
        const ids = new Set<number>();
        for (const t of tracksRes.data as Track[]) {
          for (const a of t.artists ?? []) ids.add(a.id);
        }
        setEditableIds(ids);
      } else {
        setEditableIds(new Set(artistsRes.data.map((a: Artist) => a.id)));
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка загрузки артистов');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const canEdit = (artistId: number) => {
    if (user?.role === 'ADMIN') return true;
    return editableIds.has(artistId);
  };

  if (loading) return <p className="muted">Загрузка артистов...</p>;
  if (error) return <p className="muted">{error}</p>;

  return (
    <div>
      <div className="label-tab-header">
        <h2 className="label-tab-title">Артисты ({artists.length})</h2>
        <button className="btn-pill" onClick={() => setCreateOpen(true)}>
          + Создать артиста
        </button>
      </div>

      {artists.length === 0 ? (
        <p className="muted">Пока нет артистов. Создайте первого.</p>
      ) : (
        <div className="library-grid">
          {artists.map((artist) => {
            const country = countryName(artist.countryCode);
            return (
              <div key={artist.id} className="library-card label-artist-card">
                <div
                  className="label-artist-card-body"
                  onClick={() => setOpenedArtistId(artist.id)}
                >
                  <div className="library-card-cover">
                    <img
                      src={artist.imageUrl ? `http://localhost:5000/uploads/${artist.imageUrl}` : '/Defpfp.png'}
                      alt={artist.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        if (!e.currentTarget.src.includes('Defpfp')) {
                          e.currentTarget.src = '/Defpfp.png';
                        }
                      }}
                    />
                  </div>
                  <div className="library-card-info">
                    <div className="library-card-title">{artist.name}</div>
                    {artist.countryCode && country && (
                      <div className="library-card-sub">
                        <span className={`fi fi-${artist.countryCode.toLowerCase()}`} style={{ marginRight: '6px' }} />
                        {country}
                      </div>
                    )}
                  </div>
                </div>
                <div className="label-album-actions">
                  <button
                    className="label-track-btn"
                    onClick={() => setOpenedArtistId(artist.id)}
                    disabled={!canEdit(artist.id)}
                    title={canEdit(artist.id) ? 'Открыть' : 'У вас нет треков этого артиста'}
                  >
                    {canEdit(artist.id) ? 'Открыть' : 'Просмотр'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {createOpen && (
        <CreateArtistModal
          onClose={() => setCreateOpen(false)}
          onSuccess={() => {
            setCreateOpen(false);
            loadData();
          }}
        />
      )}

      {openedArtistId !== null && (
        <ArtistDetailModal
          artistId={openedArtistId}
          canEdit={canEdit(openedArtistId)}
          canDelete={user?.role === 'ADMIN'}
          onClose={() => setOpenedArtistId(null)}
          onChange={() => loadData()}
        />
      )}
    </div>
  );
}