// Test script to verify punctuation pauses are working correctly
const testText = "In the beginning, God created the heavens and the earth. The earth was formless and empty, and darkness covered the deep waters. And the Spirit of God was hovering over the surface of the waters. Then God said, 'Let there be light,' and there was light.";

// Simulate the punctuation emphasis function
function addPunctuationEmphasis(text) {
  return text
    // Add longer pauses after sentence endings (periods, exclamation, question marks)
    .replace(/([.!?])\s*/g, '$1... ')
    // Add medium pauses after semicolons and colons
    .replace(/([;:])\s*/g, '$1.. ')
    // Add shorter pauses after commas
    .replace(/([,])\s*/g, '$1. ')
    // Add brief pauses after other punctuation like dashes
    .replace(/([-–—])\s*/g, '$1. ')
    // Clean up multiple dots and spaces
    .replace(/\.{4,}/g, '...') // Limit to max 3 dots
    .replace(/\s+/g, ' ')
    .trim();
}

console.log('Original text:');
console.log(testText);
console.log('\n' + '='.repeat(80) + '\n');

const processedText = addPunctuationEmphasis(testText);
console.log('Processed text with punctuation pauses:');
console.log(processedText);
console.log('\n' + '='.repeat(80) + '\n');

// Show where pauses were added
const pausePositions = [];
let match;
const regex = /([.,;:!?])\.+/g;
while ((match = regex.exec(processedText)) !== null) {
  pausePositions.push({
    punctuation: match[1],
    position: match.index,
    pauseLength: match[0].length - 1
  });
}

console.log('Pause positions:');
pausePositions.forEach((pause, index) => {
  console.log(`${index + 1}. "${pause.punctuation}" at position ${pause.position} (${pause.pauseLength} dots)`);
});

console.log('\n' + '='.repeat(80) + '\n');
console.log('Punctuation pause summary:');
console.log(`- Commas (,): ${pausePositions.filter(p => p.punctuation === ',').length} pauses`);
console.log(`- Periods (.): ${pausePositions.filter(p => p.punctuation === '.').length} pauses`);
console.log(`- Semicolons (;): ${pausePositions.filter(p => p.punctuation === ';').length} pauses`);
console.log(`- Colons (:): ${pausePositions.filter(p => p.punctuation === ':').length} pauses`);
console.log(`- Exclamation marks (!): ${pausePositions.filter(p => p.punctuation === '!').length} pauses`);
console.log(`- Question marks (?): ${pausePositions.filter(p => p.punctuation === '?').length} pauses`); 