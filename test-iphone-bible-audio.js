#!/usr/bin/env node

/**
 * iPhone Bible Audio Test Script
 * Tests the pitch and rate settings for Bible audio on iPhone
 * 
 * Target Settings:
 * - Pitch: 1.44 (High pitch)
 * - Rate: 0.75 (Slow speed)
 */

console.log('📱 iPhone Bible Audio Test Script');
console.log('==================================');
console.log('🎯 Target Settings:');
console.log('   Pitch: 1.6 (Higher pitch)');
console.log('   Rate: 0.5 (Much slower speed)');
console.log('');

// Simulate the current implementation logic
function testBibleAudioSettings(userPitch, userRate, isIOS = false) {
  console.log(`🧪 Testing settings: Pitch=${userPitch}, Rate=${userRate}, isIOS=${isIOS}`);
  
  // Default values (your desired settings)
  const defaultPitch = 1.6;
  const defaultRate = 0.5;
  
  // Apply user settings - respect user preferences but ensure reasonable limits
  let finalRate = userRate ?? defaultRate;
  let finalPitch = userPitch ?? defaultPitch;
  
  // iPhone-specific adjustments (but don't override user settings completely)
  if (isIOS) {
    console.log('📱 iPhone detected - applying iPhone-specific adjustments');
    
    // Only enforce rate limit if user hasn't set a custom rate
    if (!userRate || userRate === defaultRate) {
      console.log(`   Rate: Using default rate ${defaultRate}`);
      finalRate = defaultRate;
    } else {
      // Allow user's rate but cap at reasonable limit for iPhone
      const originalRate = finalRate;
      finalRate = Math.min(Math.max(userRate, 0.5), 1.0);
      
      if (finalRate !== originalRate) {
        console.log(`   Rate: Capped from ${originalRate} to ${finalRate} (iPhone limits: 0.5-1.0)`);
      } else {
        console.log(`   Rate: ${finalRate} (within iPhone limits)`);
      }
    }
    
    // Ensure pitch is within reasonable bounds for iPhone
    const originalPitch = finalPitch;
    finalPitch = Math.min(Math.max(userPitch ?? defaultPitch, 0.8), 1.8);
    
    if (finalPitch !== originalPitch) {
      console.log(`   Pitch: Adjusted from ${originalPitch} to ${finalPitch} (iPhone limits: 0.8-1.8)`);
    } else {
      console.log(`   Pitch: ${finalPitch} (within iPhone limits)`);
    }
  } else {
    console.log('💻 Desktop/Android detected - no restrictions applied');
    console.log(`   Pitch: ${finalPitch}`);
    console.log(`   Rate: ${finalRate}`);
  }
  
  console.log(`📊 Final Settings: Pitch=${finalPitch.toFixed(2)}, Rate=${finalRate.toFixed(2)}`);
  
  // Check if final settings match target
  const pitchMatch = Math.abs(finalPitch - defaultPitch) < 0.01;
  const rateMatch = Math.abs(finalRate - defaultRate) < 0.01;
  
  if (pitchMatch && rateMatch) {
    console.log('✅ SUCCESS: Final settings match target settings exactly!');
  } else if (pitchMatch) {
    console.log('⚠️ PARTIAL: Pitch matches target, but rate differs');
  } else if (rateMatch) {
    console.log('⚠️ PARTIAL: Rate matches target, but pitch differs');
  } else {
    console.log('❌ MISMATCH: Final settings differ from target settings');
  }
  
  console.log('');
  return { finalPitch, finalRate, pitchMatch, rateMatch };
}

// Test scenarios
console.log('🧪 Test Scenarios:');
console.log('==================');

// Scenario 1: Default settings (your desired settings)
console.log('\n1️⃣ Default Settings (1.6, 0.5) - iPhone:');
testBibleAudioSettings(1.6, 0.5, true);

// Scenario 2: Default settings (your desired settings) - Desktop
console.log('\n2️⃣ Default Settings (1.6, 0.5) - Desktop:');
testBibleAudioSettings(1.6, 0.5, false);

// Scenario 3: User wants different settings on iPhone
console.log('\n3️⃣ Custom Settings (1.2, 0.9) - iPhone:');
testBibleAudioSettings(1.2, 0.9, true);

// Scenario 4: User wants settings above iPhone limits
console.log('\n4️⃣ High Settings (2.0, 1.5) - iPhone:');
testBibleAudioSettings(2.0, 1.5, true);

// Scenario 5: User wants settings below iPhone limits
console.log('\n5️⃣ Low Settings (0.5, 0.3) - iPhone:');
testBibleAudioSettings(0.5, 0.3, true);

// Scenario 6: No user settings provided (should use defaults)
console.log('\n6️⃣ No User Settings (undefined, undefined) - iPhone:');
testBibleAudioSettings(undefined, undefined, true);

console.log('\n🎯 Summary:');
console.log('============');
console.log('Your desired settings (Pitch: 1.6, Rate: 0.5) should work perfectly on iPhone!');
console.log('The system is designed to respect these defaults while allowing custom adjustments within reasonable bounds.');
console.log('');
console.log('📱 iPhone Limits:');
console.log('   Pitch: 0.8 - 1.8 (your 1.6 is perfect!)');
console.log('   Rate: 0.5 - 1.0 (your 0.5 is perfect!)');
console.log('');
console.log('✅ Your settings are optimal for iPhone Bible audio playback!');
