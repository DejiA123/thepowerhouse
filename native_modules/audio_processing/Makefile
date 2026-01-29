CC=gcc
CXX=g++
CFLAGS=-I.
CXXFLAGS=-std=c++20 -I. -Wall -Wextra

all: audio_module advanced_dsp

audio_module: dsp_core.o dsp_optimizer.o
	$(CXX) -o audio_module dsp_core.o dsp_optimizer.o

advanced_dsp: advanced_dsp_main.o
	$(CXX) $(CXXFLAGS) -o advanced_dsp advanced_dsp_main.o

dsp_core.o: dsp_core.c
	$(CC) -c -o dsp_core.o dsp_core.c $(CFLAGS)

dsp_optimizer.o: dsp_optimizer.cpp
	$(CXX) -c -o dsp_optimizer.o dsp_optimizer.cpp $(CXXFLAGS)

advanced_dsp_main.o: advanced_dsp_main.cpp advanced_dsp_engine.hpp
	$(CXX) $(CXXFLAGS) -c -o advanced_dsp_main.o advanced_dsp_main.cpp

clean:
	rm -f *.o audio_module advanced_dsp
