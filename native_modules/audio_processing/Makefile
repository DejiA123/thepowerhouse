CC=gcc
CXX=g++
CFLAGS=-I.

all: audio_module

audio_module: dsp_core.o dsp_optimizer.o
	$(CXX) -o audio_module dsp_core.o dsp_optimizer.o

dsp_core.o: dsp_core.c
	$(CC) -c -o dsp_core.o dsp_core.c $(CFLAGS)

dsp_optimizer.o: dsp_optimizer.cpp
	$(CXX) -c -o dsp_optimizer.o dsp_optimizer.cpp $(CFLAGS)

clean:
	rm -f *.o audio_module
