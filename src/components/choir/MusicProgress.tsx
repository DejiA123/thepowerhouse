import LiveProgress, { type Stage } from '@/components/choir/LiveProgress';

/**
 * The live progress while a song's music is made. Real timings on the church's music
 * server (Nov 2026): about 2½ minutes when it's awake, about 5 when the first song wakes
 * it (no task yet: "Waking up the music studio").
 */
const AWAKE_S = 170;
const WAKING_S = 330;

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

const MusicProgress = ({ startedAt, taskAt, server }: { startedAt: string | null; taskAt: string | null; server: boolean }) => {
  const started = startedAt ? Date.parse(startedAt) : Date.now();
  const elapsed = (Date.now() - started) / 1000;
  // When the server was asleep, its wake-up is added to the usual time; other music
  // services answer within the function's time (about a minute)
  const handedOver = taskAt ? Math.max(0, (Date.parse(taskAt) - started) / 1000) : null;
  const waking = server && (handedOver === null ? elapsed > 12 : handedOver > 12);
  const expected = !server ? 70 : handedOver !== null ? (handedOver > 12 ? handedOver : 0) + AWAKE_S : waking ? WAKING_S : AWAKE_S;
  return (
    <LiveProgress
      testId="music-progress"
      title="Making the music"
      startedAt={started}
      expectedS={expected}
      stages={STAGES}
      stageOverride={waking && handedOver === null ? 'Waking up the music studio (the first song of the day takes a little longer)' : null}
      note="Voices, choir and band. You can leave this page; the song keeps being made and will be here when you come back."
    />
  );
};

export default MusicProgress;
