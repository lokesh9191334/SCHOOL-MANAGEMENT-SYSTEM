// Mobile Detection and PWA Enhancement Script
class MobilePWA {
    constructor() {
        this.isMobile = this.detectMobile();
        this.isTablet = this.detectTablet();
        this.isStandalone = this.detectStandalone();
        this.init();
    }

    detectMobile() {
        // More aggressive mobile detection
        const userAgent = navigator.userAgent || navigator.vendor || window.opera;
        const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
        const isTabletDevice = /iPad|Android(?!.*Mobile)|Tablet/i.test(userAgent);
        const isSmallScreen = window.innerWidth <= 1024; // Changed from 768 to 1024
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        
        return (isMobileDevice || isTabletDevice || isSmallScreen) && isTouchDevice;
    }

    detectTablet() {
        return /iPad|Android(?!.*Mobile)|Tablet/i.test(navigator.userAgent) || 
               (window.innerWidth > 768 && window.innerWidth <= 1024);
    }

    detectStandalone() {
        return ('standalone' in window.navigator) && window.navigator.standalone ||
               window.matchMedia('(display-mode: standalone)').matches;
    }

    init() {
        // Add mobile class to body
        if (this.isMobile) {
            document.body.classList.add('mobile-device');
        }
        if (this.isTablet) {
            document.body.classList.add('tablet-device');
        }
        if (this.isStandalone) {
            document.body.classList.add('standalone-mode');
        }

        // Handle safe area insets
        this.setupSafeAreas();
        
        // Setup touch interactions
        this.setupTouchInteractions();
        
        // Setup viewport optimization
        this.setupViewport();
        
        // Setup PWA features
        this.setupPWAFeatures();
    }

    setupSafeAreas() {
        // Add safe area CSS variables
        const style = document.createElement('style');
        style.textContent = `
            :root {
                --safe-area-inset-top: env(safe-area-inset-top, 0px);
                --safe-area-inset-bottom: env(safe-area-inset-bottom, 0px);
                --safe-area-inset-left: env(safe-area-inset-left, 0px);
                --safe-area-inset-right: env(safe-area-inset-right, 0px);
            }
        `;
        document.head.appendChild(style);
    }

    setupTouchInteractions() {
        // Prevent zoom on double tap
        let lastTouchEnd = 0;
        document.addEventListener('touchend', function (event) {
            const now = (new Date()).getTime();
            if (now - lastTouchEnd <= 300) {
                event.preventDefault();
            }
            lastTouchEnd = now;
        }, false);

        // Add ripple effect to buttons
        this.addRippleEffect();
    }

    addRippleEffect() {
        const style = document.createElement('style');
        style.textContent = `
            .ripple {
                position: relative;
                overflow: hidden;
            }
            .ripple-effect {
                position: absolute;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.5);
                transform: scale(0);
                animation: ripple-animation 0.6s ease-out;
                pointer-events: none;
            }
            @keyframes ripple-animation {
                to {
                    transform: scale(4);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);

        // Add ripple to all buttons and clickable elements
        document.addEventListener('click', function(e) {
            const element = e.target.closest('button, .btn, .action-card, .nav-item');
            if (element && !element.classList.contains('ripple')) {
                element.classList.add('ripple');
                const ripple = document.createElement('span');
                ripple.classList.add('ripple-effect');
                
                const rect = element.getBoundingClientRect();
                const size = Math.max(rect.width, rect.height);
                const x = e.clientX - rect.left - size / 2;
                const y = e.clientY - rect.top - size / 2;
                
                ripple.style.width = ripple.style.height = size + 'px';
                ripple.style.left = x + 'px';
                ripple.style.top = y + 'px';
                
                element.appendChild(ripple);
                setTimeout(() => ripple.remove(), 600);
            }
        });
    }

    setupViewport() {
        // Better viewport optimization for mobile
        const viewport = document.querySelector('meta[name="viewport"]');
        if (viewport) {
            if (this.isMobile) {
                viewport.setAttribute('content', 
                    'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
                );
            }
        }
        
        // Add mobile class for additional styling
        if (this.isMobile) {
            document.body.classList.add('mobile-device');
            document.documentElement.classList.add('mobile-device');
        }
    }

    setupPWAFeatures() {
        // Install prompt
        let deferredPrompt;
        
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            
            // Show install button after a delay
            setTimeout(() => {
                this.showInstallButton(deferredPrompt);
            }, 3000);
        });

        // Handle app installed
        window.addEventListener('appinstalled', () => {
            console.log('PWA installed successfully');
            this.hideInstallButton();
        });
    }

    showInstallButton(deferredPrompt) {
        // Check if button already exists
        if (document.querySelector('.install-pwa-btn')) return;

        const installBtn = document.createElement('button');
        installBtn.className = 'install-pwa-btn';
        installBtn.innerHTML = '<i class="fas fa-download"></i> Install App';
        installBtn.style.cssText = `
            position: fixed;
            bottom: 80px;
            right: 20px;
            background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
            color: white;
            border: none;
            padding: 12px 20px;
            border-radius: 25px;
            font-weight: 600;
            box-shadow: 0 4px 15px rgba(37, 99, 235, 0.3);
            z-index: 1000;
            cursor: pointer;
            transition: all 0.3s ease;
        `;

        installBtn.addEventListener('click', () => {
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === 'accepted') {
                    console.log('User accepted the install prompt');
                } else {
                    console.log('User dismissed the install prompt');
                }
                deferredPrompt = null;
                this.hideInstallButton();
            });
        });

        document.body.appendChild(installBtn);
    }

    hideInstallButton() {
        const installBtn = document.querySelector('.install-pwa-btn');
        if (installBtn) {
            installBtn.remove();
        }
    }

    // Method to redirect to mobile templates
    redirectToMobile() {
        if (this.isMobile && !window.location.pathname.includes('/mobile')) {
            const currentPath = window.location.pathname;
            
            // Check if we should show mobile login
            if (currentPath === '/login' || currentPath === '/auth/login' || currentPath === '/') {
                window.location.href = '/auth/login';
                return true;
            }
            
            // Check if we should show mobile dashboard
            if (currentPath === '/' || currentPath === '/dashboard') {
                window.location.href = '/dashboard';
                return true;
            }
        }
        return false;
    }
}

// Initialize mobile detection
document.addEventListener('DOMContentLoaded', () => {
    const mobilePWA = new MobilePWA();
    
    // Make it globally available
    window.MobilePWA = mobilePWA;
    
    // Auto-redirect to mobile templates if needed - DISABLED
    // redirectToMobile();
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MobilePWA;
}
