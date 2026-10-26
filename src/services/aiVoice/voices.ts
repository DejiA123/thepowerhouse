/** The voices that can read the translations without a narrator (each has a sample in /audio/voices). */
export interface AiVoice {
  id: string;
  name: string;
  gender: 'male' | 'female';
}

export const AI_VOICES: AiVoice[] = [
  { id: 'M1', name: 'James', gender: 'male' },
  { id: 'M2', name: 'Daniel', gender: 'male' },
  { id: 'M3', name: 'Samuel', gender: 'male' },
  { id: 'M4', name: 'Nathan', gender: 'male' },
  { id: 'M5', name: 'Peter', gender: 'male' },
  { id: 'F1', name: 'Grace', gender: 'female' },
  { id: 'F2', name: 'Ruth', gender: 'female' },
  { id: 'F3', name: 'Hannah', gender: 'female' },
  { id: 'F4', name: 'Esther', gender: 'female' },
  { id: 'F5', name: 'Naomi', gender: 'female' },
];

export const DEFAULT_VOICE = 'M1';
