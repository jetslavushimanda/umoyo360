const CACHE = 'umoyo360-v1';

const STATIC = [
  '/',
  '/index.html',
  '/dashboard.html',
  '/symptom-nutrition.html',
  '/meal-budget.html',
  '/cook-with.html',
  '/meal-planner.html',
  '/bmi-calculator.html',
  '/health-tracker.html',
  '/risk-assessment.html',
  '/water-tracker.html',
  '/pregnancy-nutrition.html',
  '/child-growth.html',
  '/medication-food.html',
  '/nutrition-quiz.html',
  '/education.html',
  '/profile.html',
  '/register.html',
  '/css/style.css',
  '/css/education.css',
  '/manifest.json',
  '/icons/icon.svg',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Let Firebase, Google APIs, and CDN requests go straight to network
  if (
    url.includes('firestore.googleapis.com') ||
    url.includes('firebase') ||
    url.includes('gstatic.com') ||
    url.includes('googleapis.com') ||
    url.includes('cdnjs.cloudflare.com') ||
    !url.startsWith(self.location.origin)
  ) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      }).catch(() => caches.match('/dashboard.html'));
    })
  );
});
