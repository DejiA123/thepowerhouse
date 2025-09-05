// Service Worker for PowerHouse Connect App
// Handles background audio playback and offline functionality

// Skip service worker in development mode
if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
  console.log('🔧 Development mode: Skipping service worker');
  self.skipWaiting();
  // Don't register any event listeners in development
  self.addEventListener('fetch', () => {});
  // Exit early without registering other listeners
  self.addEventListener('install', () => {});
  self.addEventListener('activate', () => {});
} else {

const CACHE_NAME = 'powerhouse-connect-v2';
const AUDIO_CACHE_NAME = 'powerhouse-audio-v2';

// Install event - cache essential resources
self.addEventListener('install', (event) => {
  console.log('🎵 Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/bible-icon.svg',
        '/favicon.ico'
      ]);
    })
  );
  // Activate new SW immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🎵 Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== AUDIO_CACHE_NAME) {
            console.log('🎵 Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Take control of the page immediately
  self.clients.claim();
});

// Fetch event - handle audio requests and caching
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Handle audio-related requests
  if (request.url.includes('audio') || request.url.includes('tts') || request.url.includes('speech')) {
    event.respondWith(
      caches.open(AUDIO_CACHE_NAME).then((cache) => {
        return cache.match(request).then((response) => {
          if (response) {
            console.log('🎵 Service Worker: Serving cached audio:', request.url);
            return response;
          }
          
          return fetch(request).then((fetchResponse) => {
            // Cache successful audio responses
            if (fetchResponse && fetchResponse.status === 200) {
              cache.put(request, fetchResponse.clone());
            }
            return fetchResponse;
          });
        });
      })
    );
    return;
  }
  
  // Handle other requests with network-first strategy
  event.respondWith(
    fetch(request).catch(() => {
      return caches.match(request);
    })
  );
});

// Background sync for audio playback
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-audio') {
    console.log('🎵 Service Worker: Background audio sync triggered');
    event.waitUntil(
      // Handle background audio sync
      Promise.resolve()
    );
  }
});

// Enhanced background audio handling for iOS
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'AUDIO_STATE_UPDATE') {
    console.log('🎵 Service Worker: Audio state update received:', event.data);
    
    // Store audio state for background persistence
    if (event.data.autoPlayNext || event.data.loopChapter) {
      try {
        localStorage.setItem('sw_audio_state', JSON.stringify({
          autoPlayNext: event.data.autoPlayNext,
          loopChapter: event.data.loopChapter,
          book: event.data.book,
          chapter: event.data.chapter,
          timestamp: Date.now()
        }));
        console.log('🎵 Service Worker: Audio state persisted for background playback');
      } catch (error) {
        console.warn('🎵 Service Worker: Failed to persist audio state:', error);
      }
    }
  }
});

// Handle push notifications for audio controls
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    console.log('🎵 Service Worker: Push notification received:', data);
    
    const options = {
      body: data.body || 'Audio Bible notification',
      icon: '/bible-icon.svg',
      badge: '/bible-icon.svg',
      tag: 'audio-bible',
      requireInteraction: true,
      actions: [
        {
          action: 'play',
          title: 'Play',
          icon: '/bible-icon.svg'
        },
        {
          action: 'pause',
          title: 'Pause',
          icon: '/bible-icon.svg'
        },
        {
          action: 'next',
          title: 'Next Chapter',
          icon: '/bible-icon.svg'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'Audio Bible', options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('🎵 Service Worker: Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'play') {
    // Send message to main thread to play audio
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => {
        client.postMessage({ type: 'AUDIO_CONTROL', action: 'play' });
      });
    });
  } else if (event.action === 'pause') {
    // Send message to main thread to pause audio
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => {
        client.postMessage({ type: 'AUDIO_CONTROL', action: 'pause' });
      });
    });
  } else if (event.action === 'next') {
    // Send message to main thread to go to next chapter
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => {
        client.postMessage({ type: 'AUDIO_CONTROL', action: 'next' });
      });
    });
  } else {
    // Default action - focus the app
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        if (clients.length > 0) {
          return clients[0].focus();
        }
        return self.clients.openWindow('/');
      })
    );
  }
});

// Handle messages from main thread
self.addEventListener('message', (event) => {
  console.log('🎵 Service Worker: Message received:', event.data);
  
  if (event.data.type === 'REGISTER_AUDIO') {
    // Register background audio playback
    console.log('🎵 Service Worker: Audio registered for background playback');
  } else if (event.data.type === 'AUDIO_ENDED') {
    // Handle audio ended event
    console.log('🎵 Service Worker: Audio ended, checking for auto-play');
  }
});

console.log('🎵 Service Worker: Loaded and ready for background audio support');

} // End of else block for production mode
