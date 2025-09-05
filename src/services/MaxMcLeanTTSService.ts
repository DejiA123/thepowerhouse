
import { audioService } from './audioService';

export interface MaxMcLeanTTSResponse {
  audioUrl: string;
  voiceName: string;
  duration?: number;
}

class MaxMcLeanTTSService {
  async generateMaxMcLeanStyleTTS(text: string): Promise<MaxMcLeanTTSResponse | null> {
    try {
      console.log('Attempting to generate Max McLean style TTS with ultra-realistic voice');
      
      const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
      
      if (!apiKey || apiKey === 'your_elevenlabs_api_key_here') {
        console.log('ElevenLabs API key not configured, will use high-quality browser voice');
        return null;
      }
      
      // Use Antoni voice (ErXwobaYiN019PkySvjV) - deep, warm, and authoritative
      // Perfect for Bible narration in the style of Max McLean
      const voiceId = 'ErXwobaYiN019PkySvjV';
      
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey
        },
        body: JSON.stringify({
          text: text.substring(0, 5000), // Limit text length for TTS
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.25, // Lower for natural variation like Max McLean
            similarity_boost: 0.95, // High for consistency
            style: 0.6, // Dramatic style for Bible reading
            use_speaker_boost: true,
            speaking_rate: 0.82 // Slower, more deliberate like Max McLean
          }
        })
      });
      
      if (!response.ok) {
        console.error('ElevenLabs TTS failed:', response.status);
        return null;
      }
      
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      return {
        audioUrl,
        voiceName: 'Antoni (Max McLean Style)',
        duration: Math.floor(text.length / 15) // Rough estimate
      };
      
    } catch (error) {
      console.error('Error generating Max McLean style TTS:', error);
      return null;
    }
  }
}

export const maxMcLeanTTSService = new MaxMcLeanTTSService();
