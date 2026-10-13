/**
 * The AI voice: Supertonic 2 by Supertone (OpenRAIL-M licence), a natural
 * text-to-speech model small and fast enough to run on the phone itself.
 * Downloaded once from Hugging Face (pinned to one release) and kept on the
 * device, so it also works offline.
 */
const REPO = 'https://huggingface.co/Supertone/supertonic-2/resolve/75e6727618a02f323c720cba9478152d4bc16ca4';

export const MODEL_CACHE = 'ai-voice-model-v1';

export interface ModelFile {
  name: string;
  url: string;
  bytes: number;
}

export const MODEL_FILES: ModelFile[] = [
  { name: 'tts.json', url: `${REPO}/onnx/tts.json`, bytes: 8_699 },
  { name: 'unicode_indexer.json', url: `${REPO}/onnx/unicode_indexer.json`, bytes: 262_196 },
  { name: 'duration_predictor.onnx', url: `${REPO}/onnx/duration_predictor.onnx`, bytes: 1_521_526 },
  { name: 'text_encoder.onnx', url: `${REPO}/onnx/text_encoder.onnx`, bytes: 27_431_318 },
  { name: 'vector_estimator.onnx', url: `${REPO}/onnx/vector_estimator.onnx`, bytes: 132_471_364 },
  { name: 'vocoder.onnx', url: `${REPO}/onnx/vocoder.onnx`, bytes: 101_405_066 },
];

/** The speech engine's own program (served by this site) */
export const RUNTIME_BYTES = 25_749_873;

export const voiceStyleUrl = (id: string) => `${REPO}/voice_styles/${id}.json`;

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

export const totalDownloadBytes = () => MODEL_FILES.reduce((sum, f) => sum + f.bytes, 0) + RUNTIME_BYTES + 420_000;

export const AI_VOICE_CREDIT = 'AI voice: Supertonic 2 by Supertone, made on this device.';
