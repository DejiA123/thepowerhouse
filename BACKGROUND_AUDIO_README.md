# Background Audio Bible Feature

## Overview

The PowerHouse Connect app now supports **background audio playback** for the Bible, allowing users to continue listening to audio Bible chapters even when the app is closed, minimized, or running in the background. This feature includes automatic chapter progression and is controlled through device media controls.

## Features

### 🎵 Background Audio Playback
- **Persistent Audio**: Audio continues playing when the app is closed or backgrounded
- **iOS Compatibility**: Optimized for iPhone/iPad background audio
- **Android Support**: Full background audio support on Android devices
- **PWA Support**: Works as a Progressive Web App with background audio
- **Invisible Controls**: No visible UI elements - fully controlled through device

### 🔄 Automatic Chapter Progression
- **Auto-play Next**: Automatically plays the next chapter when enabled
- **Smart Navigation**: Handles transitions between books and chapters
- **Configurable**: Users can enable/disable auto-play feature
- **Seamless Continuity**: No interruption between chapters

### 🎛️ Device-Based Audio Controls
- **Lock Screen Controls**: Control audio from device lock screen
- **Notification Center**: Audio controls in notification area
- **Control Center (iOS)**: Access audio controls from iOS control center
- **Quick Settings (Android)**: Audio controls in Android quick settings
- **Media Keys**: Desktop keyboard media controls

## How It Works

### Technical Implementation

#### 1. Global Audio Context
The `GlobalAudioContext` manages all audio state globally across the app:
- Maintains audio playback state
- Handles chapter navigation
- Manages auto-play functionality
- Coordinates with service worker
- **No visible UI elements**

#### 2. Service Worker
A service worker (`/public/sw.js`) provides:
- Background audio persistence
- Offline audio caching
- Push notification support
- Audio control messages

#### 3. PWA Manifest
The web app manifest (`/public/manifest.json`) enables:
- Standalone app mode
- Background audio capabilities
- Home screen installation
- Native app-like experience

#### 4. Media Session API
The Media Session API provides:
- Lock screen controls
- Notification center controls
- Device media controls
- Background audio persistence

### Audio Flow

1. **User starts audio** on Bible page
2. **GlobalAudioContext** manages playback
3. **Service worker** registers background audio
4. **Audio continues** when app is backgrounded
5. **Auto-play** advances to next chapter
6. **Device controls** remain accessible

## Usage

### Starting Background Audio

1. Navigate to the Bible page
2. Select a book and chapter
3. Enable "Auto-play next chapter" if desired
4. Click the play button
5. Audio starts and continues in background

### Background Playback

- **Minimize app**: Audio continues playing
- **Switch apps**: Audio persists in background
- **Lock screen**: Audio continues (with media controls)
- **Close app**: Audio may continue depending on device

### Audio Controls (Device-Based)

#### iOS Devices
- **Lock Screen**: Swipe up for audio controls
- **Control Center**: Swipe down from top-right corner
- **Notification Center**: Audio controls in notifications
- **Siri**: Voice commands for audio control

#### Android Devices
- **Lock Screen**: Audio controls visible on lock screen
- **Quick Settings**: Pull down notification shade
- **Media Controls**: Dedicated media control panel
- **Google Assistant**: Voice commands for audio

#### Desktop Browsers
- **Media Keys**: Play/pause, next/previous track
- **Browser Tab**: Audio controls in browser tab
- **System Media**: OS-level media controls

## Device Compatibility

### iOS (iPhone/iPad)
- ✅ Background audio support
- ✅ Lock screen controls
- ✅ Control center integration
- ✅ Auto-play restrictions (rate limited)
- ⚠️ Requires user interaction to start

### Android
- ✅ Full background audio
- ✅ Lock screen controls
- ✅ Notification controls
- ✅ Auto-play support
- ✅ Background process support

### Desktop (Chrome/Edge/Firefox)
- ✅ Background tab audio
- ✅ Media session controls
- ✅ Keyboard shortcuts
- ✅ Full auto-play support

## Configuration

### Auto-play Settings

Users can configure auto-play behavior:
- **Enable/disable**: Toggle in Bible page settings
- **Chapter progression**: Automatic next chapter
- **Book transitions**: Seamless book changes
- **Delay timing**: 2-second delay between chapters

### Voice Settings

Audio voice preferences:
- **Pitch control**: Adjust voice pitch
- **Rate control**: Adjust speaking speed
- **Voice selection**: Choose preferred voice
- **Platform optimization**: Automatic device tuning

## Troubleshooting

### Common Issues

#### Audio Stops When App is Backgrounded
1. Ensure PWA is installed
2. Check device audio settings
3. Verify service worker is registered
4. Check browser permissions

#### Auto-play Not Working
1. Verify auto-play is enabled
2. Check device auto-play settings
3. Ensure next chapter exists
4. Check console for errors

#### Can't Control Audio
1. Use device lock screen controls
2. Check notification center
3. Use device media controls
4. Verify media session is active

### Debug Information

Enable debug logging:
```javascript
// In browser console
localStorage.setItem('debug', 'audio:*');
```

Check service worker status:
```javascript
// In browser console
navigator.serviceWorker.getRegistrations().then(registrations => {
  console.log('Service Workers:', registrations);
});
```

Check media session status:
```javascript
// In browser console
console.log('Media Session:', navigator.mediaSession);
console.log('Playback State:', navigator.mediaSession?.playbackState);
```

## Future Enhancements

### Planned Features
- **Audio progress bar**: Visual progress indicator (optional)
- **Playlist support**: Custom chapter sequences
- **Sleep timer**: Auto-stop after set time
- **Audio bookmarks**: Save listening position
- **Offline audio**: Download chapters for offline use

### Technical Improvements
- **Web Audio API**: Enhanced audio processing
- **Audio streaming**: Progressive audio loading
- **Voice cloning**: Custom voice options
- **Multi-language**: International voice support

## Development

### File Structure
```
src/
├── contexts/
│   └── GlobalAudioContext.tsx    # Main audio context (invisible)
├── components/
│   └── FloatingAudioControls.tsx # Audio control UI (hidden)
public/
├── sw.js                         # Service worker
├── manifest.json                 # PWA manifest
└── index.html                    # HTML with PWA meta tags
```

### Key Components

#### GlobalAudioContext
- Manages global audio state
- Handles chapter navigation
- Coordinates with service worker
- Manages auto-play logic
- **No visible UI**

#### Media Session API
- Provides device-based controls
- Enables lock screen controls
- Supports background audio
- Cross-platform compatibility

#### Service Worker
- Enables background audio
- Handles offline functionality
- Manages audio caching
- Provides push notifications

### Testing

Test background audio functionality:
1. Start audio playback
2. Minimize/background app
3. Verify audio continues
4. Test auto-play progression
5. Use device controls
6. Verify media session controls

## Support

For technical support or feature requests:
- Check console logs for errors
- Verify device compatibility
- Test with different browsers
- Check PWA installation status
- Use device media controls

---

**Note**: The audio controls are now invisible but fully functional. Users control audio through their device's lock screen, notification center, control center, or media controls. Background audio behavior may vary by device, browser, and operating system. The app automatically optimizes for the best possible experience on each platform.
