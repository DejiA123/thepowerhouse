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

// Fetch event - handle audio requests and caching; bypass video to keep Range support
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Bypass SW for video to ensure Range/streaming works in iOS PWA
  const isVideo = request.destination === 'video' || request.url.match(/\.mp4(\?|$)/i) || request.headers.has('range');
  if (isVideo) {
    event.respondWith(fetch(request));
    return;
  }
  
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
    fetch(request).catch(() => caches.match(request))
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
  } else if (event.data && event.data.type === 'AUDIO_CHAPTER_CHANGE') {
    console.log('🎵 Service Worker: Chapter change message received:', event.data);
    
    // Store the chapter change for background persistence
    try {
      localStorage.setItem('sw_chapter_change', JSON.stringify({
        book: event.data.book,
        chapter: event.data.chapter,
        isAutoPlay: event.data.isAutoPlay,
        timestamp: Date.now()
      }));
      console.log('🎵 Service Worker: Chapter change persisted for background playback');
    } catch (error) {
      console.warn('🎵 Service Worker: Failed to persist chapter change:', error);
    }
  } else if (event.data && event.data.type === 'CHECK_PENDING_CHAPTER_CHANGE') {
    console.log('🎵 Service Worker: Checking for pending chapter changes');
    
    try {
      const pendingChange = localStorage.getItem('sw_chapter_change');
      if (pendingChange) {
        const changeData = JSON.parse(pendingChange);
        console.log('🎵 Service Worker: Found pending chapter change:', changeData);
        
        // Send the pending change back to the main thread
        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage({
            type: 'PENDING_CHAPTER_CHANGE',
            data: changeData
          });
        }
        
        // Clear the pending change
        localStorage.removeItem('sw_chapter_change');
      }
    } catch (error) {
      console.warn('🎵 Service Worker: Error checking pending chapter changes:', error);
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

// Enhanced background audio message handling
self.addEventListener('message', (event) => {
  console.log('🎵 Service Worker: Enhanced message received:', event.data);
  
  if (event.data.type === 'AUDIO_ENDED') {
    console.log('🎵 Service Worker: Audio ended, processing auto-play logic');
    
    const { book, chapter, autoPlayNext } = event.data;
    if (autoPlayNext) {
      // Schedule next chapter in background
      setTimeout(() => {
        console.log('🎵 Service Worker: Auto-triggering next chapter from background');
        
        // Store the scheduled chapter change
        try {
          localStorage.setItem('sw_scheduled_next', JSON.stringify({
            book,
            nextChapter: chapter + 1,
            timestamp: Date.now(),
            isAutoPlay: true
          }));
          
          // Try to communicate with main thread if available
          self.clients.matchAll().then((clients) => {
            clients.forEach((client) => {
              client.postMessage({
                type: 'BACKGROUND_NEXT_CHAPTER',
                book,
                chapter: chapter + 1
              });
            });
          });
        } catch (error) {
          console.warn('🎵 Service Worker: Failed to schedule next chapter:', error);
        }
      }, 500); // Small delay to ensure proper background execution
    }
  } else if (event.data.type === 'SCHEDULE_NEXT_CHAPTER') {
    console.log('🎵 Service Worker: Scheduling next chapter from background');
    
    const { book, chapter } = event.data;
    
    // Schedule immediate execution for background scenarios
    setTimeout(() => {
      console.log('🎵 Service Worker: Executing scheduled next chapter');
      
      try {
        localStorage.setItem('sw_chapter_change', JSON.stringify({
          book,
          chapter: chapter + 1,
          isAutoPlay: true,
          timestamp: Date.now()
        }));
        
        // Notify all clients
        self.clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            client.postMessage({
              type: 'EXECUTE_NEXT_CHAPTER',
              book,
              chapter: chapter + 1,
              isAutoPlay: true
            });
          });
        });
      } catch (error) {
        console.warn('🎵 Service Worker: Failed to execute next chapter:', error);
      }
    }, 100);
  } else if (event.data.type === 'REGISTER_AUDIO_CONTEXT') {
    console.log('🎵 Service Worker: Audio context registered for enhanced background playback');
  }
});

console.log('🎵 Service Worker: Loaded and ready for background audio support');

} // End of else block for production mode
