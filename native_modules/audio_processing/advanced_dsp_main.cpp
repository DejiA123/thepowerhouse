#include "advanced_dsp_engine.hpp"
#include <iostream>
#include <memory>

using namespace powerhouse::dsp;

int main() {
    std::cout << "=== Advanced C++ DSP Engine ===\n\n";

    try {
        // Create test signal using factory (shared_ptr)
        auto signal = create_test_signal<float>(1000, 440.0f, 44100);
        
        // Demonstrate move semantics with unique_ptr ownership
        AudioBuffer<float> buffer(1000, 44100);
        
        // Fill with test data
        for (size_t i = 0; i < buffer.size(); ++i) {
            buffer[i] = std::sin(2.0f * M_PI * 440.0f * i / 44100.0f);
        }
        
        // Apply gain using lambda with capture
        std::cout << "\n[Processing] Applying transformations...\n";
        apply_function(buffer, [](float sample) { 
            return sample * 0.5f;  // Reduce volume by half
        });
        
        // Create processor chain using templates
        auto chain = AudioProcessorChain<float, 
            GainProcessor<float>, 
            CompressorProcessor<float>
        >(
            GainProcessor<float>(1.5f),
            CompressorProcessor<float>(0.8f, 4.0f)
        );
        
        // Process through the chain
        chain.process(buffer);
        
        // Analyze results using ranges
        AudioAnalyzer<float>::print_stats(buffer);
        
        // Demonstrate exception safety
        try {
            [[maybe_unused]] auto& out_of_bounds = buffer[2000]; // Will throw
        } catch (const std::out_of_range& e) {
            std::cout << "\n[Safety] Caught out-of-bounds access: " 
                      << e.what() << "\n";
        }
        
        std::cout << "\n✓ Advanced C++ demo complete\n";
        
    } catch (const std::exception& e) {
        std::cerr << "Error: " << e.what() << "\n";
        return 1;
    }
    
    // RAII ensures automatic cleanup
    return 0;
}
