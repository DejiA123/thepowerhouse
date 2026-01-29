#ifndef DSP_CORE_H
#define DSP_CORE_H

typedef struct {
    float *buffer;
    int size;
    int sample_rate;
} AudioBuffer;

void process_audio_buffer(AudioBuffer *buf);
float calculate_rms(AudioBuffer *buf);

#endif
