# Mobile & PWA Features

## Key Features
- Mobile navigation with slide-out sidebar and overlay
- Touch gestures to open menu
- Bottom navigation for quick access
- Responsive design for portrait and landscape
- Installable app via web manifest
- Offline mode via service worker caching
- Push notification readiness
- Native app feel and automatic updates
- Optimized performance for mobile

## Files
- static/css/mobile-pwa.css
- templates/base.html
- templates/mobile/base.html
- static/manifest.json
- static/sw.js

## Usage
- Visit `/mobile` or `/mobile-test` to verify mobile features.
- On mobile, use the hamburger icon or swipe from the left edge to open the menu.
- Add to Home Screen from browser menu to install the app.
- Offline caching and background sync are handled in the service worker.

## Notes
- Push notifications require a server to send Web Push messages.
- Icons are located under `static/icons/` for install banners and notifications.
