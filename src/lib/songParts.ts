import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Compose a song → Listen by part: play one section of the recording at a time (a verse,
 * the chorus, the vamp), and loop it for rehearsal. The times come from the song-writer
 * function (`song_drafts.audio_sections`: Gemini listens to the recording with the words;
 * checked against speech recognition to within about a second, Nov 2026), so each part
 * starts half a second early to be sure of its first word.
 */
export interface PartTime {
  name: string;
  start: number;
  end: number;
}

const LEAD_IN = 0.5;

export const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/** "Chorus", "Chorus 2", "Chorus 3" when a name comes back */
export function partLabels(parts: PartTime[]) {
  const seen = new Map<string, number>();
  const total = new Map<string, number>();
  parts.forEach((p) => total.set(p.name, (total.get(p.name) ?? 0) + 1));
  return parts.map((p) => {
    const n = (seen.get(p.name) ?? 0) + 1;
    seen.set(p.name, n);
    return (total.get(p.name) ?? 0) > 1 && n > 1 ? `${p.name} ${n}` : p.name;
  });
}

/**
 * Which part each of the song's sections is (the nth section with a name = the nth part with
 * it), so a section heading can play its own part. Sections renamed since the music was made
 * have none.
 */
export function partForSections(sections: { name: string }[], parts: PartTime[]) {
  const count = new Map<string, number>();
  return sections.map((s) => {
    const n = count.get(s.name) ?? 0;
    count.set(s.name, n + 1);
    let k = -1;
    let seen = 0;
    parts.some((p, i) => {
      if (p.name !== s.name) return false;
      if (seen++ === n) k = i;
      return k >= 0;
    });
    return k;
  });
}

/** Plays parts of the song through the page's own <audio> */
export function usePartPlayer(audio: HTMLAudioElement | null, parts: PartTime[] | null) {
  const [playing, setPlaying] = useState<number | null>(null);
  const [loop, setLoop] = useState(false);
  const [at, setAt] = useState(0);
  const state = useRef({ playing: null as number | null, loop: false, parts });
  state.current = { playing, loop, parts };

  // A new recording (or none): nothing is playing as a part
  useEffect(() => setPlaying(null), [audio]);

  useEffect(() => {
    if (!audio) return;
    const onTime = () => {
      const { playing: i, loop: again, parts: list } = state.current;
      if (i === null || !list?.[i]) return;
      const p = list[i];
      setAt(audio.currentTime);
      if (audio.currentTime >= p.end) {
        if (again) audio.currentTime = Math.max(0, p.start - LEAD_IN);
        else {
          audio.pause();
          setPlaying(null);
        }
      }
    };
    // The full player's own play/seek outside the part ends "part" mode
    const onPause = () => {
      // Switching between Full song / Music only / Voices only isn't stopping
      if (state.current.playing !== null && !audio.seeking && audio.dataset.switching !== '1') setPlaying(null);
    };
    const onSeeked = () => {
      if (audio.dataset.switching === '1') return;
      const { playing: i, parts: list } = state.current;
      if (i !== null && list?.[i] && (audio.currentTime < list[i].start - LEAD_IN - 1 || audio.currentTime > list[i].end)) setPlaying(null);
    };
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('seeked', onSeeked);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('seeked', onSeeked);
    };
  }, [audio]);

  const play = useCallback(
    (i: number) => {
      const p = parts?.[i];
      if (!audio || !p) return;
      if (state.current.playing === i && !audio.paused) {
        audio.pause();
        setPlaying(null);
        return;
      }
      setPlaying(i);
      state.current.playing = i;
      setAt(p.start);
      audio.currentTime = Math.max(0, p.start - LEAD_IN);
      void audio.play().catch(() => setPlaying(null));
    },
    [audio, parts],
  );

  return { playing, play, loop, setLoop, at };
}
