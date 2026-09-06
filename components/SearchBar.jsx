'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Crest from '@/components/Crest';
import { useDic } from '@/components/I18nProvider';
import { PLATFORMS, PLATFORM_LABEL } from '@/lib/config';

export default function SearchBar({
  placeholder = null,
  onPick = null,
  autoFocus = false,
  inline = false,
}) {
  const dic = useDic();
  const router = useRouter();
  const [term, setTerm] = useState('');
  const [platform, setPlatform] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cursor, setCursor] = useState(0);
  const boxRef = useRef(null);

  useEffect(() => {
    const q = term.trim();
    if (q.length < 2) {
      setResults([]);
      setError('');
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(
          `/api/ea/search?q=${encodeURIComponent(q)}&platform=${platform}`,
          { signal: controller.signal },
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || dic.search.failed);
        setResults(data.results || []);
        setCursor(0);
        setOpen(true);
      } catch (err) {
        if (err.name !== 'AbortError') {
          setResults([]);
          setError(err.message);
          setOpen(true);
        }
      } finally {
        setLoading(false);
      }
    }, 380);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [term, platform]);

  useEffect(() => {
    function onDocClick(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  function pick(club) {
    setOpen(false);
    setTerm(club.name);
    if (onPick) onPick(club);
    else router.push(`/clube/${club.platform}/${club.clubId}`);
  }

  function onKeyDown(e) {
    if (!open || !results.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor((c) => (c + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => (c - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      pick(results[cursor]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div className={`searchbox${inline ? ' inline' : ''}`} ref={boxRef}>
      <div className="searchfield">
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          style={{ color: 'var(--dim)', flexShrink: 0 }}
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
        <input
          value={term}
          autoFocus={autoFocus}
          onChange={(e) => setTerm(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder || dic.search.placeholder}
          aria-label={dic.search.ariaSearch}
        />
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          aria-label={dic.search.ariaPlatform}
        >
          <option value="">{dic.search.all}</option>
          {PLATFORMS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.short}
            </option>
          ))}
        </select>
        <button className="btn" disabled={loading} onClick={() => setOpen(true)}>
          {loading ? dic.search.searching : dic.search.searchBtn}
        </button>
      </div>

      {open && (
        <div className="results">
          {error && <div className="empty-note">{error}</div>}
          {!error && !results.length && !loading && (
            <div className="empty-note">{dic.search.none}</div>
          )}
          {results.map((club, i) => (
            <button
              key={`${club.platform}-${club.clubId}`}
              className={`result-item ${i === cursor ? 'active' : ''}`}
              onMouseEnter={() => setCursor(i)}
              onClick={() => pick(club)}
            >
              <Crest club={club} size={34} radius={9} />
              <span className="grow">
                <div className="nm">{club.name}</div>
                <div className="meta">
                  {PLATFORM_LABEL[club.platform] || club.platform}
                  {club.gamesPlayed ? ` · ${club.gamesPlayed} ${dic.common.games}` : ''}
                </div>
              </span>
              <span className="meta">#{club.clubId}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
