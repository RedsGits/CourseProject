import { useState, useMemo } from 'react';
import { api } from '../../api/client';
import { parseLrc } from '../../api/lrc';
import type { Track } from '../../types';

interface Props {
  track: Track;
  onClose: () => void;
  onSuccess: () => void;
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const ms = Math.floor((sec % 1) * 100);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
}

function parseTimeString(str: string): number | null {
  if (!str.trim()) return null;
  const match = str.match(/^(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?$/);
  if (match) {
    const m = parseInt(match[1], 10);
    const s = parseInt(match[2], 10);
    const ms = match[3] ? parseInt(match[3].padEnd(3, '0'), 10) : 0;
    return m * 60 + s + ms / 1000;
  }
  const num = Number(str);
  return !isNaN(num) && num >= 0 ? num : null;
}

export default function KaraokeEditorModal({ track, onClose, onSuccess }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lrclibUrl, setLrclibUrl] = useState('');
  const [importing, setImporting] = useState(false);

  const lines = useMemo(() => {
    return track.lyrics ? track.lyrics.split('\n') : [];
  }, [track.lyrics]);

  const [timings, setTimings] = useState<Record<number, string>>(() => {
    const initial: Record<number, string> = {};
    
    if (track.syncedLyrics) {
      const parsed = parseLrc(track.syncedLyrics).filter(l => l.text.trim().length > 0);
      let lrcIdx = 0;

      for (let i = 0; i < lines.length; i++) {
        const plainText = lines[i].trim();
        if (!plainText) continue;

        if (lrcIdx < parsed.length) {
          initial[i] = formatTime(parsed[lrcIdx].time);
          lrcIdx++;
        }
      }
    }
    return initial;
  });

  const handleTimeChange = (index: number, val: string) => {
    setTimings((prev) => ({ ...prev, [index]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const payloadTimings: Array<{ lineIndex: number; time: number }> = [];

    for (const [indexStr, timeStr] of Object.entries(timings)) {
      if (!timeStr.trim()) continue;
      
      const time = parseTimeString(timeStr);
      if (time === null) {
        setError(`Неверный формат времени в строке ${Number(indexStr) + 1}. Используйте mm:ss.xx`);
        setSubmitting(false);
        return;
      }
      
      payloadTimings.push({ lineIndex: Number(indexStr), time });
    }

    if (payloadTimings.length === 0) {
      setError('Вы не расставили ни одного таймкода.');
      setSubmitting(false);
      return;
    }

    try {
      await api.patch(`/tracks/${track.id}/synced-lyrics`, { timings: payloadTimings });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка сохранения караоке');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClear = async () => {
    if (!confirm('Удалить караоке для этого трека?')) return;
    setSubmitting(true);
    try {
      await api.patch(`/tracks/${track.id}/synced-lyrics`, { timings: [] });
      onSuccess();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Ошибка удаления');
      setSubmitting(false);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Удалить полностью текст и караоке для этого трека? Это действие нельзя отменить.')) return;
    setSubmitting(true);
    try {
      await api.delete(`/tracks/${track.id}/lyrics`);
      onSuccess();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Ошибка удаления текста');
      setSubmitting(false);
    }
  };


  const handleImportFromUrl = async () => {
    if (!lrclibUrl.trim()) return;
    setImporting(true);
    setError(null);
    try {
      await api.post(`/tracks/${track.id}/lyrics/import`, { url: lrclibUrl });
      onSuccess(); 
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка импорта по ссылке');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="album-detail-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '800px', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}
      >
        <div className="album-detail-header" style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
          <div className="album-detail-info">
            <span className="label-form-label">Редактор караоке</span>
            <h2 className="album-detail-title" style={{ fontSize: '24px' }}>{track.title}</h2>
            <p className="muted" style={{ fontSize: '13px', marginTop: '4px' }}>
              Введите таймкод (например, 00:12.34) напротив строк, которые поются. Пропущенные строки не попадут в караоке.
            </p>
          </div>
          <button className="album-detail-close" onClick={onClose} title="Закрыть">✕</button>
        </div>

        {error && <div className="error" style={{ marginBottom: '16px' }}>{error}</div>}

        {!track.lyrics && (
          <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'var(--bg)', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <p className="label-form-label" style={{ marginBottom: '8px' }}>
              Нашли текст на lrclib, но автоматический поиск не сработал? Вставьте ссылку на трек:
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="https://lrclib.net/tracks/12345"
                value={lrclibUrl}
                onChange={(e) => { setLrclibUrl(e.target.value); setError(null); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault(); 
                    handleImportFromUrl();
                  }
                }}
                style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text)' }}
              />
              <button
                type="button"
                className="btn-pill"
                onClick={handleImportFromUrl}
                disabled={importing || !lrclibUrl.trim()}
              >
                {importing ? 'Импорт...' : 'Загрузить'}
              </button>
            </div>
          </div>
        )}

        <div className="karaoke-editor-list" style={{ flex: 1, overflowY: 'auto', paddingRight: '8px' }}>
          {lines.map((line, idx) => {
            if (!line.trim()) return null;

            return (
              <div key={idx} className="karaoke-editor-row">
                <div className="karaoke-editor-num">{idx + 1}</div>
                <div className="karaoke-editor-text">{line}</div>
                <input
                  type="text"
                  className="karaoke-editor-input"
                  placeholder="00:00.00"
                  value={timings[idx] || ''}
                  onChange={(e) => handleTimeChange(idx, e.target.value)}
                />
              </div>
            );
          })}
        </div>

        <div className="modal-actions" style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)', justifyContent: 'space-between' }}>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              type="button" 
              className="label-track-btn label-track-btn-danger" 
              onClick={handleClear} 
              disabled={submitting || !track.syncedLyrics}
              title="Оставит обычный текст, но удалит таймкоды"
            >
              Удалить караоке
            </button>

            <button 
              type="button" 
              className="label-track-btn label-track-btn-danger" 
              onClick={handleClearAll} 
              disabled={submitting || !track.lyrics}
              title="Удалит и обычный текст, и караоке"
            >
              Удалить весь текст
            </button>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button type="button" className="btn-cancel" onClick={onClose} disabled={submitting}>Отмена</button>
            <button type="button" className="btn-pill" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
          
        </div>
      </div>
    </div>
  );
}