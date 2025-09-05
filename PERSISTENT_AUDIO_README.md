# Persistent Audio Bible Service

## Overview

The persistent audio Bible service allows users to continue listening to Bible audio even when navigating to different pages in the app. The audio functionality, including auto-play for the next chapter, continues working seamlessly across navigation.

## Features

### 1. Global Audio Context (`GlobalAudioContext.tsx`)
- **Persistent State**: Audio state is maintained globally across all pages
- **Auto-play Support**: Automatically plays the next chapter when enabled
- **Cross-navigation**: Audio continues playing when users navigate to other pages
- **Book/Chapter Navigation**: Handles transitions between books and chapters

### 2. Floating Audio Controls (`FloatingAudioControls.tsx`)
- **Always Visible**: Appears when audio is playing, regardless of current page
- **Full Controls**: Play, pause, stop, next chapter, previous chapter
- **Auto-play Indicator**: Shows when auto-play is enabled
- **Responsive Design**: Adapts to mobile and desktop layouts

### 3. Integration with Bible Page
- **Seamless Integration**: Bible page uses global audio context for playback
- **Auto-play Sync**: Auto-play settings are synchronized with global context
- **Backward Compatibility**: Maintains existing local audio controls

## How It Works

### Audio Flow
1. User starts audio on Bible page
2. Audio is managed by `GlobalAudioContext`
3. User navigates to other pages (News, Give, etc.)
4. Floating controls appear, allowing continued control
5. When chapter ends, auto-play continues to next chapter
6. Audio persists until user stops it or reaches end of Bible

### Key Components

#### GlobalAudioContext
```typescript
// Main functions
playBibleChapter(book, chapter, text, autoPlayNext)
pause()
resume()
stop()
goToNextChapter()
goToPreviousChapter()
```

#### FloatingAudioControls
- Fixed position at bottom of screen
- Shows current book and chapter
- Displays loading state
- Auto-play indicator

#### BibleChapterContent Integration
- Uses `playBibleChapter()` instead of local audio
- Syncs auto-play settings with global context
- Maintains local controls for immediate feedback

## Usage

### Starting Audio
1. Navigate to Bible page
2. Select a book and chapter
3. Click play button
4. Audio starts and floating controls appear

### Navigating While Listening
1. Audio continues playing
2. Floating controls remain visible
3. Use controls to pause, resume, or navigate chapters
4. Auto-play continues to next chapter when enabled

### Stopping Audio
- Click stop button in floating controls
- Audio stops and controls disappear
- Can restart from any page

## Technical Implementation

### State Management
- Global audio state in `GlobalAudioContext`
- Local UI state in `BibleChapterContent`
- Synchronized auto-play settings

### Audio Service Integration
- Uses existing `audioService` for ElevenLabs TTS
- Maintains high-quality voice synthesis
- Handles mobile and desktop optimizations

### Navigation Handling
- Audio state persists across React Router navigation
- Floating controls positioned above bottom navigation
- Responsive design for different screen sizes

## Benefits

1. **Uninterrupted Listening**: Users can browse other app features while listening
2. **Seamless Experience**: No need to return to Bible page for controls
3. **Auto-play Continuity**: Next chapters play automatically across navigation
4. **Consistent Controls**: Same interface regardless of current page
5. **Mobile Optimized**: Works well on mobile devices with floating controls

## Future Enhancements

- Audio progress indicator
- Playlist functionality
- Background audio support
- Audio speed controls in floating UI
- Sleep timer functionality 