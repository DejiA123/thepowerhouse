import LiveProgress, { type Stage } from '@/components/choir/LiveProgress';

/**
 * The live progress while a song's music is made. Real timings on the church's music
 * server (Nov 2026): about 2½ minutes when it's awake, about 5 when the first song wakes
 * it (no task yet: "Waking up the music studio").
 */
const AWAKE_S = 170;
const WAKING_S = 330;
/**
 * Studio quality (the studio server: full model, 50 steps, the 4B planner, on an L40S),
 * measured through the app's own path (Nov 2026): 131 s for a 4-minute song with the
 * studio awake, 261 s when it had to wake and load its models first (it sleeps after 3
 * idle minutes, so most studio songs wake it).
 */
const STUDIO_AWAKE_S = 135;
const STUDIO_WAKING_S = 265;

const STAGES: Stage[] = [
  { from: 0, text: 'Sending your song to the studio' },
  { from: 0.06, text: 'Reading the words and planning the arrangement' },
  { from: 0.22, text: 'Laying down the drums and bass' },
  { from: 0.4, text: 'Adding the keys, organ and band' },
  { from: 0.58, text: 'Recording the lead voice' },
  { from: 0.72, text: 'Bringing in the choir' },
  { from: 0.86, text: 'Mixing and mastering' },
  { from: 0.95, text: 'Almost there' },
];

const MusicProgress = ({ startedAt, taskAt, server, studio = false }: { startedAt: string | null; taskAt: string | null; server: boolean; studio?: boolean }) => {
  const started = startedAt ? Date.parse(startedAt) : Date.now();
  const elapsed = (Date.now() - started) / 1000;
  // When the server was asleep, its wake-up is added to the usual time; other music
  // services answer within the function's time (about a minute)
  const handedOver = taskAt ? Math.max(0, (Date.parse(taskAt) - started) / 1000) : null;
  const waking = server && (handedOver === null ? elapsed > 12 : handedOver > 12);
  const awake = studio ? STUDIO_AWAKE_S : AWAKE_S;
  const expected = !server ? 70 : handedOver !== null ? (handedOver > 12 ? handedOver : 0) + awake : waking ? (studio ? STUDIO_WAKING_S : WAKING_S) : awake;
  return (
    <LiveProgress
      testId="music-progress"
      title={studio ? 'Making the music · Studio quality' : 'Making the music'}
      startedAt={started}
      expectedS={expected}
      stages={STAGES}
      stageOverride={waking && handedOver === null ? (studio ? 'Waking up the studio (it loads its bigger models first)' : 'Waking up the music studio (the first song of the day takes a little longer)') : null}
      note="Voices, choir and band. You can leave this page; the song keeps being made and will be here when you come back."
    />
  );
};

export default MusicProgress;
