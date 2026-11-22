import { useState, useMemo } from 'react';
import type { Artist } from '../../types';

interface Props {
  artists: Artist[];
  selectedId: number | null;
  onChange: (id: number | null) => void;
}

export default function ArtistSingleSelect({ artists, selectedId, onChange }: Props) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const selectedArtist = artists.find((a) => a.id === selectedId);

  const filtered = useMemo(() => {
    return artists.filter((a) => a.name.toLowerCase().includes(query.toLowerCase()));
  }, [artists, query]);

  return (
    <div style={{ position: 'relative' }}>
      <input
        type="text"
        placeholder="Поиск артиста..."
        value={isOpen ? query : selectedArtist?.name || ''}
        onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
        onFocus={() => { setIsOpen(true); setQuery(''); }}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
      />
      {isOpen && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
          borderRadius: '8px', marginTop: '4px', maxHeight: '150px', overflowY: 'auto',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
        }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '8px 12px', color: 'var(--text-muted)', fontSize: '13px' }}>Не найдено</div>
          ) : (
            filtered.slice(0, 5).map((a) => (
              <div
                key={a.id}
                onClick={() => { onChange(a.id); setIsOpen(false); }}
                style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '14px', background: a.id === selectedId ? 'var(--bg-hover)' : 'transparent' }}
              >
                {a.name}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}