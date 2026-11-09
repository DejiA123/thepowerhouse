import LiveProgress, { type Stage } from '@/components/choir/LiveProgress';

/**
 * The live progress while a song is split into Music only and Voices only on the music
 * server (two RoFormer models, then blended). An estimate from the song's length: about
 * 45 s to wake the splitter and load its models, plus about half the song's length to
 * split it. `LiveProgress` slows down rather than stopping if it takes longer.
 */
const splitSeconds = (songS: number | null | undefined) => Math.round(45 + 0.5 * (songS && songS > 20 ? songS : 240));

const STAGES: Stage[] = [
  { from: 0, text: 'Sending the song to the studio' },
  { from: 0.1, text: 'Getting the splitter ready' },
  { from: 0.25, text: 'Listening to the whole song' },
  { from: 0.38, text: 'Lifting the voices away from the band' },
  { from: 0.58, text: 'Checking the instruments with a second model' },
  { from: 0.76, text: 'Blending the two for the cleanest music' },
  { from: 0.88, text: 'Saving Music only and Voices only' },
  { from: 0.95, text: 'Almost there' },
];

const SplitProgress = ({ startedAt, songS, done }: { startedAt: number; songS?: number | null; done?: boolean }) => (
  <LiveProgress
    testId="versions-waiting"
    title="Splitting music and voices"
    startedAt={startedAt}
    expectedS={splitSeconds(songS)}
    stages={STAGES}
    done={done}
    note="The full song plays now. You can leave this page; the two versions keep being made and will be here when you come back."
  />
);

export default SplitProgress;
