// Service Worker for PowerHouse Connect App
// Handles background audio playback and offline functionality

// Skip service worker in development mode
if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
  console.log('🔧 Development mode: Skipping service worker');
  self.skipWaiting();
  // Don't register any event listeners in development
  self.addEventListener('fetch', () => { });
  // Exit early without registering other listeners
  self.addEventListener('install', () => { });
  self.addEventListener('activate', () => { });
} else {

  const CACHE_NAME = 'powerhouse-connect-v3';
  const AUDIO_CACHE_NAME = 'powerhouse-audio-v3';

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

  // Store audio state in memory for background persistence
  let swAudioState = {
    autoPlayNext: false,
    loopChapter: false,
    book: '',
    chapter: 0,
    timestamp: Date.now()
  };

  let swScheduledNext = null;
  let swChapterChange = null;

  // Enhanced background audio handling for iOS
  self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'AUDIO_STATE_UPDATE') {
      console.log('🎵 Service Worker: Audio state update received:', event.data);

      // Store audio state for background persistence
      swAudioState = {
        autoPlayNext: event.data.autoPlayNext,
        loopChapter: event.data.loopChapter,
        book: event.data.book,
        chapter: event.data.chapter,
        timestamp: Date.now()
      };
      console.log('🎵 Service Worker: Audio state updated in memory');

    } else if (event.data && event.data.type === 'AUDIO_CHAPTER_CHANGE') {
      console.log('🎵 Service Worker: Chapter change message received:', event.data);

      swChapterChange = {
        book: event.data.book,
        chapter: event.data.chapter,
        isAutoPlay: event.data.isAutoPlay,
        timestamp: Date.now()
      };

    } else if (event.data && event.data.type === 'CHECK_PENDING_CHAPTER_CHANGE') {
      console.log('🎵 Service Worker: Checking for pending chapter changes');

      if (swChapterChange) {
        console.log('🎵 Service Worker: Found pending chapter change:', swChapterChange);

        // Send the pending change back to the main thread
        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage({
            type: 'PENDING_CHAPTER_CHANGE',
            data: swChapterChange
          });
        }

        swChapterChange = null;
      }
    } else if (event.data && event.data.type === 'AUDIO_ENDED') {
      console.log('🎵 Service Worker: Audio ended, processing auto-play logic');

      const { book, chapter, autoPlayNext } = event.data;
      if (autoPlayNext) {
        // Schedule next chapter in background
        setTimeout(() => {
          console.log('🎵 Service Worker: Auto-triggering next chapter from background');

          swScheduledNext = {
            book,
            nextChapter: chapter + 1,
            timestamp: Date.now(),
            isAutoPlay: true
          };

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
        }, 500); // Small delay to ensure proper background execution
      }
    } else if (event.data.type === 'SCHEDULE_NEXT_CHAPTER') {
      console.log('🎵 Service Worker: Scheduling next chapter from background');

      const { book, chapter } = event.data;

      // Schedule immediate execution for background scenarios
      setTimeout(() => {
        console.log('🎵 Service Worker: Executing scheduled next chapter');

        swChapterChange = {
          book,
          chapter: chapter + 1,
          isAutoPlay: true,
          timestamp: Date.now()
        };

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
      }, 100);
    } else if (event.data.type === 'REGISTER_AUDIO_CONTEXT') {
      console.log('🎵 Service Worker: Audio context registered for enhanced background playback');
    }
  });

  console.log('🎵 Service Worker: Loaded and ready for background audio support');

} // End of else block for production mode
