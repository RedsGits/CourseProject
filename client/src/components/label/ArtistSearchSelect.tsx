import { useState, useMemo } from 'react';
import type { Artist } from '../../types';

interface Props {
  artists: Artist[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  primaryArtistId?: number | null;
}

export default function ArtistSearchSelect({ artists, selectedIds, onChange, primaryArtistId }: Props) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filtered = useMemo(() => {
    return artists.filter(
      (a) =>
        a.id !== primaryArtistId &&
        a.name.toLowerCase().includes(query.toLowerCase())
    );
  }, [artists, query, primaryArtistId]);

  const toggle = (id: number) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const selectedArtists = artists.filter((a) => selectedIds.includes(a.id));

  return (
    <div style={{ position: 'relative' }}>
      {selectedArtists.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
          {selectedArtists.map((a) => (
            <span key={a.id} className="search-tab active" style={{ padding: '4px 10px', fontSize: '12px', cursor: 'pointer' }} onClick={() => toggle(a.id)}>
              {a.name} ✕
            </span>
          ))}
        </div>
      )}

      <input
        type="text"
        placeholder="Поиск артиста для фита..."
        value={query}
        onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
      />

      {isOpen && query.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
          borderRadius: '8px', marginTop: '4px', maxHeight: '150px', overflowY: 'auto',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
        }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '8px 12px', color: 'var(--text-muted)', fontSize: '13px' }}>Ничего не найдено</div>
          ) : (
            filtered.slice(0, 5).map((a) => (
              <div
                key={a.id}
                onClick={() => toggle(a.id)}
                style={{
                  padding: '8px 12px', cursor: 'pointer', fontSize: '14px',
                  background: selectedIds.includes(a.id) ? 'var(--bg-hover)' : 'transparent'
                }}
              >
                {selectedIds.includes(a.id) ? '✓ ' : ''} {a.name}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}