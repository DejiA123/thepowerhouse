#include <stdio.h>
#include <stdlib.h>
#include <math.h>
#include "dsp_core.h"

// Basic DSP processing in C
void process_audio_buffer(AudioBuffer *buf) {
    if (buf == NULL || buf->buffer == NULL) return;

    for (int i = 0; i < buf->size; i++) {
        // Simple gain application (Volume boost)
        buf->buffer[i] *= 1.5f;
        
        // Hard clipping
        if (buf->buffer[i] > 1.0f) buf->buffer[i] = 1.0f;
        if (buf->buffer[i] < -1.0f) buf->buffer[i] = -1.0f;
    }
    printf("Processed %d samples in C kernel.\n", buf->size);
}

float calculate_rms(AudioBuffer *buf) {
    if (buf == NULL || buf->size == 0) return 0.0f;
    
    float sum_sq = 0.0f;
    for (int i = 0; i < buf->size; i++) {
        sum_sq += buf->buffer[i] * buf->buffer[i];
    }
    return sqrtf(sum_sq / buf->size);
}
