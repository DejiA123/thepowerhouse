// Service Worker for PowerHouse Connect App
// Handles background audio playback and offline functionality

// Skip service worker in development mode
if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
  console.log('🔧 Development mode: Skipping service worker');
  self.addEventListener('install', () => self.skipWaiting());
  self.addEventListener('activate', () => self.clients.claim());
  // In dev, we still need a fetch handler to not break the app, but it does nothing.
  self.addEventListener('fetch', () => { return; });

} else {

  const CACHE_NAME = 'powerhouse-connect-v3'; // Incremented cache version
  const AUDIO_CACHE_NAME = 'powerhouse-audio-v3'; // Incremented cache version

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
      }).then(() => self.clients.claim()) // Claim clients after cleaning cache
    );
  });

  // Fetch event - The single source of truth for handling all network requests
  self.addEventListener('fetch', (event) => {
    const { request } = event;

    // --- VIDEO BYPASS ---
    // Aggressively bypass SW for video to ensure Range/streaming works, especially on iOS.
    // This is the crucial fix for the "black screen" video issue.
    const isVideoRequest = request.destination === 'video' || request.url.endsWith('.mp4') || request.headers.has('range');
    if (isVideoRequest) {
      // By simply returning, we let the browser handle the request as if the SW didn't exist.
      // We DO NOT use event.respondWith() here.
      console.log('🎵 SW Bypass for Video/Range Request:', request.url);
      return;
    }

    // --- AUDIO CACHING ---
    // Handle audio with a cache-first strategy.
    if (request.url.includes('audio') || request.url.includes('tts') || request.url.includes('speech')) {
      event.respondWith(
        caches.open(AUDIO_CACHE_NAME).then(async (cache) => {
          const cachedResponse = await cache.match(request);
          if (cachedResponse) {
            console.log('🎵 SW Cache Hit (Audio):', request.url);
            return cachedResponse;
          }
          // Not in cache, fetch from network, then cache it
          console.log('🎵 SW Network Fetch (Audio):', request.url);
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        })
      );
      return; // End execution for audio requests
    }

    // --- OTHER REQUESTS (Network-First Strategy) ---
    // For all other requests (app shell, images, etc.), go to network first.
    event.respondWith(
      fetch(request).catch(() => {
        // If network fails, try to serve from the main cache.
        console.log('🎵 SW Network Failed, Fallback to Cache:', request.url);
        return caches.match(request);
      })
    );
  });

  // Consolidated Message event listener
  self.addEventListener('message', (event) => {
    console.log('🎵 SW Message Received:', event.data);
    const { data } = event;
    if (!data) return;

    switch (data.type) {
      case 'AUDIO_STATE_UPDATE':
        console.log('🎵 SW: Audio state update received:', data);
        if (data.autoPlayNext || data.loopChapter) {
          try {
            localStorage.setItem('sw_audio_state', JSON.stringify({
              autoPlayNext: data.autoPlayNext,
              loopChapter: data.loopChapter,
              book: data.book,
              chapter: data.chapter,
              timestamp: Date.now()
            }));
            console.log('🎵 SW: Audio state persisted.');
          } catch (error) {
            console.warn('🎵 SW: Failed to persist audio state:', error);
          }
        }
        break;

      case 'AUDIO_CHAPTER_CHANGE':
        console.log('🎵 SW: Chapter change message received:', data);
        try {
          localStorage.setItem('sw_chapter_change', JSON.stringify({
            book: data.book,
            chapter: data.chapter,
            isAutoPlay: data.isAutoPlay,
            timestamp: Date.now()
          }));
          console.log('🎵 SW: Chapter change persisted.');
        } catch (error) {
          console.warn('🎵 SW: Failed to persist chapter change:', error);
        }
        break;

      case 'CHECK_PENDING_CHAPTER_CHANGE':
        console.log('🎵 SW: Checking for pending chapter changes');
        try {
          const pendingChange = localStorage.getItem('sw_chapter_change');
          if (pendingChange) {
            const changeData = JSON.parse(pendingChange);
            console.log('🎵 SW: Found pending chapter change:', changeData);
            if (event.ports && event.ports[0]) {
              event.ports[0].postMessage({ type: 'PENDING_CHAPTER_CHANGE', data: changeData });
            }
            localStorage.removeItem('sw_chapter_change');
          }
        } catch (error) {
          console.warn('🎵 SW: Error checking pending chapter changes:', error);
        }
        break;

      case 'AUDIO_ENDED':
        console.log('🎵 SW: Audio ended, processing auto-play logic');
        if (data.autoPlayNext) {
          setTimeout(() => {
            console.log('🎵 SW: Auto-triggering next chapter from background');
            self.clients.matchAll().then((clients) => {
              clients.forEach((client) => {
                client.postMessage({
                  type: 'BACKGROUND_NEXT_CHAPTER',
                  book: data.book,
                  chapter: data.chapter + 1
                });
              });
            });
          }, 500);
        }
        break;

      case 'SCHEDULE_NEXT_CHAPTER':
         console.log('🎵 SW: Scheduling next chapter from background');
         setTimeout(() => {
           console.log('🎵 SW: Executing scheduled next chapter');
           self.clients.matchAll().then((clients) => {
             clients.forEach((client) => {
               client.postMessage({
                 type: 'EXECUTE_NEXT_CHAPTER',
                 book: data.book,
                 chapter: data.chapter + 1,
                 isAutoPlay: true
               });
             });
           });
         }, 100);
        break;
      
      case 'REGISTER_AUDIO_CONTEXT':
        console.log('🎵 SW: Audio context registered for enhanced background playback');
        break;
        
      default:
        console.log('🎵 SW: Received unhandled message type:', data.type);
        break;
    }
  });


  // Background sync for audio playback
  self.addEventListener('sync', (event) => {
    if (event.tag === 'background-audio') {
      console.log('🎵 Service Worker: Background audio sync triggered');
      event.waitUntil(Promise.resolve());
    }
  });

  // Handle push notifications for audio controls
  self.addEventListener('push', (event) => {
    if (event.data) {
      const data = event.data.json();
      console.log('🎵 SW: Push notification received:', data);
      const options = {
        body: data.body || 'Audio Bible notification',
        icon: '/bible-icon.svg',
        badge: '/bible-icon.svg',
        tag: 'audio-bible',
        requireInteraction: true,
        actions: [
          { action: 'play', title: 'Play', icon: '/bible-icon.svg' },
          { action: 'pause', title: 'Pause', icon: '/bible-icon.svg' },
          { action: 'next', title: 'Next Chapter', icon: '/bible-icon.svg' }
        ]
      };
      event.waitUntil(self.registration.showNotification(data.title || 'Audio Bible', options));
    }
  });

  // Handle notification clicks
  self.addEventListener('notificationclick', (event) => {
    console.log('🎵 SW: Notification clicked:', event.action);
    event.notification.close();
    const action = event.action;

    if (action === 'play' || action === 'pause' || action === 'next') {
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'AUDIO_CONTROL', action: action });
        });
      });
    } else {
      // Default action - focus the app
      event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
          if (clients.length > 0) {
            return clients[0].focus();
          }
          return self.clients.openWindow('/');
        })
      );
    }
  });

  console.log('🎵 Service Worker: Loaded and ready for background audio support');

} // End of else block for production mode