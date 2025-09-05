interface AudioGenerationRequest {
  text: string;
  book: string;
  chapter: number;
  voice?: string;
  speed?: number;
}

interface AudioGenerationResponse {
  success: boolean;
  audioUrl?: string;
  filename?: string;
  message?: string;
  error?: string;
}

export const audioDownloadService = {
  async generateAudioFile(request: AudioGenerationRequest): Promise<AudioGenerationResponse> {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-audio-file`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(request)
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Audio generation error:', error);
      return {
        success: false,
        error: 'Failed to generate audio file'
      };
    }
  },

  downloadAudioFile(audioUrl: string, filename: string): void {
    const a = document.createElement('a');
    a.href = audioUrl;
    a.download = filename;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  },

  // Fallback method for when backend is not available
  generateTextFile(text: string, filename: string): void {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}; 