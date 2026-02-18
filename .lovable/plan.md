
# Improve Choir Academy Lesson Content

## What's Changing
Three modules in the Choir Academy will be rewritten with clearer, more practical, beginner-friendly content and exercises.

## 1. The Mechanics of Resonance (Vocal Lessons 101)
- Explain what the soft palate is in simple terms (the fleshy area at the back of the roof of your mouth)
- Add a "yawn test" so beginners can feel the soft palate lifting
- Provide step-by-step vowel shaping instructions with tongue position guidance
- Add a mirror self-check so users know they're doing it right

## 2. Interval Ear Training (Vocal Harmony & Blending)
- Replace abstract music theory with well-known Gospel song references (e.g. "Amazing Grace," "How Great Is Our God," "Way Maker")
- Teach intervals by singing along to familiar melodies -- e.g. the first two notes of a song = a specific interval
- Add a practical "Harmonise a Gospel Song" exercise where beginners pick a simple song and learn to add a basic third above or below
- Keep it choir-focused so anyone can follow along even without music theory background

## 3. Dynamic Sensitivity in Groups
- Explain "The Pyramid of Sound" with a clear visual analogy (building blocks)
- Add a practical group volume exercise: start singing at level 3/10 and gradually build, then bring it back down
- Include a "Listen and Adjust" exercise where singers practise matching the volume of the person next to them
- Add tips like "if you can't hear the person next to you, you're too loud"

## Technical Details
- All changes are in a single file: `src/pages/ChoirPage.tsx` (lines 864-898)
- The content and exercises properties of each module object will be updated
- Existing exercise types (`vowel-practice`) will be preserved; new structured exercises added where the modules currently have none
- No new components or dependencies needed
- The existing build errors in `ChoirPage.tsx` (unrelated type errors) will also be fixed as part of this change
