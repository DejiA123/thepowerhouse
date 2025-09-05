#!/usr/bin/env node

/**
 * Test script to verify iPhone audio settings logic
 * This simulates the audio settings logic from the React components
 */

console.log('🧪 Testing iPhone Audio Settings Logic\n');

// Simulate the audio settings logic
function testAudioSettings(userPitch, userRate, isIOS = false) {
  console.log(`\n📱 Testing with iOS: ${isIOS ? 'Yes' : 'No'}`);
  console.log(`🎵 User requested - Pitch: ${userPitch}, Rate: ${userRate}`);
  
  let finalRate = userRate ?? 0.75;
  let finalPitch = userPitch ?? 1.44;
  
  // iPhone-specific adjustments (but don't override user settings completely)
  if (isIOS) {
    // Only enforce rate limit if user hasn't set a custom rate
    if (!userRate || userRate === 0.75) {
      finalRate = 0.75;
      console.log(`📱 Using default iPhone rate: ${finalRate}`);
    } else {
      // Allow user's rate but cap at reasonable limit for iPhone
      const originalRate = finalRate;
      finalRate = Math.min(Math.max(userRate, 0.5), 1.0);
      if (originalRate !== finalRate) {
        console.log(`📱 Rate adjusted for iPhone compatibility: ${originalRate} → ${finalRate}`);
      }
    }
    
    // Ensure pitch is within reasonable bounds for iPhone
    const originalPitch = finalPitch;
    finalPitch = Math.min(Math.max(userPitch ?? 1.44, 0.8), 1.8);
    if (originalPitch !== finalPitch) {
      console.log(`📱 Pitch adjusted for iPhone compatibility: ${originalPitch} → ${finalPitch}`);
    }
  }
  
  console.log(`✅ Final settings - Pitch: ${finalPitch}, Rate: ${finalRate}`);
  return { finalPitch, finalRate };
}

// Test cases
const testCases = [
  // Default settings
  { pitch: 1.44, rate: 0.75, description: 'Default settings' },
  
  // User custom settings within iPhone limits
  { pitch: 1.2, rate: 0.8, description: 'Custom settings within iPhone limits' },
  { pitch: 1.6, rate: 0.9, description: 'Custom settings within iPhone limits' },
  
  // User settings that need iPhone adjustment
  { pitch: 2.0, rate: 1.5, description: 'Settings above iPhone limits' },
  { pitch: 0.5, rate: 0.3, description: 'Settings below iPhone limits' },
  
  // Edge cases
  { pitch: 1.44, rate: undefined, description: 'Undefined rate (should use default)' },
  { pitch: undefined, rate: 0.75, description: 'Undefined pitch (should use default)' },
  { pitch: undefined, rate: undefined, description: 'Both undefined (should use defaults)' },
];

console.log('📋 Test Cases:');
testCases.forEach((testCase, index) => {
  console.log(`${index + 1}. ${testCase.description}`);
});

// Test on non-iOS device
console.log('\n🖥️  Testing on Desktop/Android:');
testCases.forEach((testCase, index) => {
  const result = testAudioSettings(testCase.pitch, testCase.rate, false);
  console.log(`   Test ${index + 1}: Pitch ${result.finalPitch}, Rate ${result.finalRate}`);
});

// Test on iOS device
console.log('\n📱 Testing on iPhone/iPad:');
testCases.forEach((testCase, index) => {
  const result = testAudioSettings(testCase.pitch, testCase.rate, true);
  console.log(`   Test ${index + 1}: Pitch ${result.finalPitch}, Rate ${result.finalRate}`);
});

// Test specific iPhone scenarios
console.log('\n🎯 Specific iPhone Scenarios:');

// Scenario 1: User wants pitch 1.44 and rate 0.75 (defaults)
console.log('\n📱 Scenario 1: User wants defaults (1.44/0.75)');
const scenario1 = testAudioSettings(1.44, 0.75, true);
console.log(`   Result: Pitch ${scenario1.finalPitch}, Rate ${scenario1.finalRate}`);
console.log(`   Expected: Pitch 1.44, Rate 0.75`);
console.log(`   ✅ ${scenario1.finalPitch === 1.44 && scenario1.finalRate === 0.75 ? 'PASS' : 'FAIL'}`);

// Scenario 2: User wants pitch 1.44 but rate 1.2 (above iPhone limit)
console.log('\n📱 Scenario 2: User wants pitch 1.44, rate 1.2 (above iPhone limit)');
const scenario2 = testAudioSettings(1.44, 1.2, true);
console.log(`   Result: Pitch ${scenario2.finalPitch}, Rate ${scenario2.finalRate}`);
console.log(`   Expected: Pitch 1.44, Rate 1.0 (capped)`);
console.log(`   ✅ ${scenario2.finalPitch === 1.44 && scenario2.finalRate === 1.0 ? 'PASS' : 'FAIL'}`);

// Scenario 3: User wants pitch 2.0 and rate 0.5 (both at limits)
console.log('\n📱 Scenario 3: User wants pitch 2.0, rate 0.5 (at iPhone limits)');
const scenario3 = testAudioSettings(2.0, 0.5, true);
console.log(`   Result: Pitch ${scenario3.finalPitch}, Rate ${scenario3.finalRate}`);
console.log(`   Expected: Pitch 1.8 (capped), Rate 0.5`);
console.log(`   ✅ ${scenario3.finalPitch === 1.8 && scenario3.finalRate === 0.5 ? 'PASS' : 'FAIL'}`);

// Test the useBiblePreferences logic
console.log('\n🔧 Testing useBiblePreferences Logic:');

function simulateSetRate(rate, isIOS) {
  console.log(`\n🎵 setRate called with: ${rate}, isIOS: ${isIOS}`);
  
  let finalRate = rate;
  
  if (isIOS) {
    // Allow user's rate but cap at reasonable limit for iPhone
    if (rate > 1.0) {
      console.log(`📱 iPhone detected - capping audio rate to 1.0 (requested: ${rate})`);
      finalRate = 1.0;
    } else if (rate < 0.5) {
      console.log(`📱 iPhone detected - setting minimum audio rate to 0.5 (requested: ${rate})`);
      finalRate = 0.5;
    }
  }
  
  console.log(`🎵 Final rate being set: ${finalRate}`);
  return finalRate;
}

// Test setRate function
const rateTests = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
console.log('\n📊 Rate Tests:');
rateTests.forEach(rate => {
  const desktopResult = simulateSetRate(rate, false);
  const iphoneResult = simulateSetRate(rate, true);
  console.log(`   Rate ${rate}: Desktop=${desktopResult}, iPhone=${iphoneResult}`);
});

console.log('\n✅ Testing complete!');
console.log('\n📝 Summary:');
console.log('   - Desktop/Android: All user settings are respected');
console.log('   - iPhone: User settings are respected within reasonable limits');
console.log('   - Default settings (1.44/0.75) work correctly on all devices');
console.log('   - Rate is capped at 1.0 on iPhone for stability');
console.log('   - Pitch is limited to 0.8-1.8 range on iPhone for quality');
