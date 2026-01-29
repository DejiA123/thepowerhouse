#ifndef ADVANCED_DSP_ENGINE_HPP
#define ADVANCED_DSP_ENGINE_HPP

#include <iostream>
#include <vector>
#include <memory>
#include <algorithm>
#include <numeric>
#include <cmath>
#include <stdexcept>
#include <concepts>
#include <ranges>
#include <span>

/**
 * Advanced DSP Engine - Production-Grade Modern C++
 * Demonstrates: Templates, Smart Pointers, RAII, Move Semantics, C++20 features
 * 
 * Modern C++ Features:
 * - Concepts (C++20)
 * - Ranges library (C++20)
 * - Smart pointers (unique_ptr, shared_ptr)
 * - Template metaprogramming
 * - Move semantics and perfect forwarding
 * - RAII pattern
 * - Const correctness
 */

namespace powerhouse::dsp {

// C++20 Concept: Numeric types only
template<typename T>
concept Numeric = std::is_arithmetic_v<T>;

// Template class for type-safe audio buffer with RAII
template<Numeric T>
class AudioBuffer {
private:
    std::unique_ptr<T[]> data_;
    size_t size_;
    int sample_rate_;

public:
    // Constructor with smart pointer initialization
    AudioBuffer(size_t size, int sample_rate = 44100)
        : data_(std::make_unique<T[]>(size))
        , size_(size)
        , sample_rate_(sample_rate)
    {
        std::fill_n(data_.get(), size_, T{});
        std::cout << "[AudioBuffer] Allocated " << size_ 
                  << " samples at " << sample_rate_ << "Hz\n";
    }

    // Move constructor (C++11)
    AudioBuffer(AudioBuffer&& other) noexcept
        : data_(std::move(other.data_))
        , size_(other.size_)
        , sample_rate_(other.sample_rate_)
    {
        other.size_ = 0;
        other.sample_rate_ = 0;
    }

    // Move assignment operator
    AudioBuffer& operator=(AudioBuffer&& other) noexcept {
        if (this != &other) {
            data_ = std::move(other.data_);
            size_ = other.size_;
            sample_rate_ = other.sample_rate_;
            other.size_ = 0;
            other.sample_rate_ = 0;
        }
        return *this;
    }

    // Delete copy operations (move-only type)
    AudioBuffer(const AudioBuffer&) = delete;
    AudioBuffer& operator=(const AudioBuffer&) = delete;

    // Destructor (RAII cleanup)
    ~AudioBuffer() {
        if (size_ > 0) {
            std::cout << "[AudioBuffer] Deallocating " << size_ << " samples\n";
        }
    }

    // Access operators with bounds checking
    T& operator[](size_t idx) {
        if (idx >= size_) throw std::out_of_range("Index out of bounds");
        return data_[idx];
    }

    const T& operator[](size_t idx) const {
        if (idx >= size_) throw std::out_of_range("Index out of bounds");
        return data_[idx];
    }

    // Getters (const correctness)
    size_t size() const noexcept { return size_; }
    int sample_rate() const noexcept { return sample_rate_; }
    T* data() noexcept { return data_.get(); }
    const T* data() const noexcept { return data_.get(); }

    // Get span view (C++20)
    std::span<T> as_span() { return std::span<T>(data_.get(), size_); }
    std::span<const T> as_span() const { return std::span<const T>(data_.get(), size_); }
};

// Template function with perfect forwarding
template<Numeric T, typename Func>
void apply_function(AudioBuffer<T>& buffer, Func&& func) {
    auto span = buffer.as_span();
    std::ranges::transform(span, span.begin(), std::forward<Func>(func));
}

// Variadic template for multiple processors
template<Numeric T, typename... Processors>
class AudioProcessorChain {
private:
    std::tuple<Processors...> processors_;

public:
    explicit AudioProcessorChain(Processors&&... procs)
        : processors_(std::forward<Processors>(procs)...)
    {
        std::cout << "[ProcessorChain] Initialized with " 
                  << sizeof...(Processors) << " processors\n";
    }

    void process(AudioBuffer<T>& buffer) {
        std::apply([&buffer](auto&&... procs) {
            (procs.process(buffer), ...);  // Fold expression (C++17)
        }, processors_);
    }
};

// Concrete processor: Gain
template<Numeric T>
class GainProcessor {
private:
    T gain_;

public:
    explicit GainProcessor(T gain) : gain_(gain) {}

    void process(AudioBuffer<T>& buffer) const {
        std::cout << "[Gain] Applying gain: " << gain_ << "\n";
        auto span = buffer.as_span();
        std::ranges::transform(span, span.begin(), 
            [g = gain_](T sample) { return sample * g; });
    }
};

// Concrete processor: Compressor with smart threshold
template<Numeric T>
class CompressorProcessor {
private:
    T threshold_;
    T ratio_;

public:
    CompressorProcessor(T threshold, T ratio) 
        : threshold_(threshold), ratio_(ratio) {}

    void process(AudioBuffer<T>& buffer) const {
        std::cout << "[Compressor] threshold=" << threshold_ 
                  << ", ratio=" << ratio_ << "\n";
        
        auto span = buffer.as_span();
        std::ranges::transform(span, span.begin(), 
            [t = threshold_, r = ratio_](T sample) {
                T abs_sample = std::abs(sample);
                if (abs_sample > t) {
                    T excess = abs_sample - t;
                    T compressed = t + (excess / r);
                    return (sample < 0) ? -compressed : compressed;
                }
                return sample;
            });
    }
};

// Modern statistics calculator using ranges (C++20)
template<Numeric T>
class AudioAnalyzer {
public:
    static T calculate_rms(const AudioBuffer<T>& buffer) {
        auto span = buffer.as_span();
        
        // Use ranges to calculate RMS
        auto sum_squares = std::ranges::fold_left(
            span | std::views::transform([](T s) { return s * s; }),
            T{0},
            std::plus<>{}
        );
        
        return std::sqrt(sum_squares / buffer.size());
    }

    static T calculate_peak(const AudioBuffer<T>& buffer) {
        auto span = buffer.as_span();
        
        auto max_abs = std::ranges::max(
            span | std::views::transform([](T s) { return std::abs(s); })
        );
        
        return max_abs;
    }

    static void print_stats(const AudioBuffer<T>& buffer) {
        T rms = calculate_rms(buffer);
        T peak = calculate_peak(buffer);
        
        std::cout << "\n=== Audio Statistics ===\n";
        std::cout << "  RMS Level: " << rms << "\n";
        std::cout << "  Peak Level: " << peak << "\n";
        std::cout << "  Sample Rate: " << buffer.sample_rate() << "Hz\n";
        std::cout << "  Buffer Size: " << buffer.size() << " samples\n";
    }
};

// Factory function using shared_ptr for shared ownership
template<Numeric T>
std::shared_ptr<AudioBuffer<T>> create_test_signal(
    size_t size, 
    T frequency, 
    int sample_rate = 44100)
{
    auto buffer = std::make_shared<AudioBuffer<T>>(size, sample_rate);
    
    const T two_pi = static_cast<T>(2.0 * M_PI);
    const T angular_freq = two_pi * frequency / sample_rate;
    
    for (size_t i = 0; i < size; ++i) {
        (*buffer)[i] = std::sin(angular_freq * i);
    }
    
    std::cout << "[Factory] Created " << frequency << "Hz test signal\n";
    return buffer;
}

} // namespace powerhouse::dsp

#endif // ADVANCED_DSP_ENGINE_HPP
