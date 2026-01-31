// Auto-refresh System - Seamless 90-second refresh without user notification

class AutoRefreshManager {
    constructor() {
        this.refreshInterval = 90000; // 90 seconds in milliseconds
        this.warningTime = 5000; // 5 seconds before refresh
        this.refreshTimer = null;
        this.warningShown = false;
        this.isRefreshing = false;
        this.lastActivity = Date.now();
        this.init();
    }

    init() {
        // Setup activity tracking
        this.setupActivityTracking();
        
        // Start the refresh cycle
        this.startRefreshCycle();
        
        // Setup visibility change handling
        this.setupVisibilityHandling();
        
        // Setup network status monitoring
        this.setupNetworkMonitoring();
        
        // Setup smooth refresh
        this.setupSmoothRefresh();
    }

    setupActivityTracking() {
        // Track user activity to prevent refresh during active use
        const events = [
            'mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click',
            'keydown', 'keyup', 'input', 'change', 'focus', 'blur'
        ];

        events.forEach(event => {
            document.addEventListener(event, () => {
                this.lastActivity = Date.now();
                this.hideWarning();
            }, { passive: true });
        });
    }

    setupVisibilityHandling() {
        // Handle tab visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // Tab is hidden, pause refresh
                this.pauseRefresh();
            } else {
                // Tab is visible, resume refresh
                this.resumeRefresh();
                this.lastActivity = Date.now();
            }
        });
    }

    setupNetworkMonitoring() {
        // Monitor network status
        window.addEventListener('online', () => {
            this.showNetworkStatus('online');
        });

        window.addEventListener('offline', () => {
            this.showNetworkStatus('offline');
            this.pauseRefresh();
        });
    }

    setupSmoothRefresh() {
        // Preload critical resources for smooth refresh
        this.preloadCriticalResources();
    }

    preloadCriticalResources() {
        // Preload essential CSS and JS files
        const criticalResources = [
            '/static/css/premium-design.css',
            '/static/css/notifications.css',
            '/static/js/main.js',
            '/static/js/notifications.js'
        ];

        criticalResources.forEach(resource => {
            const link = document.createElement('link');
            link.rel = 'prefetch';
            link.href = resource;
            document.head.appendChild(link);
        });
    }

    startRefreshCycle() {
        this.scheduleNextRefresh();
    }

    scheduleNextRefresh() {
        // Clear any existing timer
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
        }

        // Calculate time since last activity
        const timeSinceActivity = Date.now() - this.lastActivity;

        // If user has been inactive for the full interval, show warning immediately
        if (timeSinceActivity >= this.refreshInterval) {
            this.showWarning();
        }
        // If user has been inactive long enough to show warning soon, schedule warning
        else if (timeSinceActivity >= this.refreshInterval - this.warningTime) {
            const timeUntilWarning = (this.refreshInterval - this.warningTime) - timeSinceActivity;
            this.refreshTimer = setTimeout(() => {
                this.showWarning();
            }, timeUntilWarning);
        }
        // Otherwise, check again in 1 second
        else {
            this.refreshTimer = setTimeout(() => {
                this.scheduleNextRefresh();
            }, 1000);
        }
    }

    showWarning() {
        if (this.warningShown || this.isRefreshing) return;

        this.warningShown = true;
        this.createWarningIndicator();

        // Show subtle notification
        this.showSubtleNotification('Page will refresh in 5 seconds...');

        // Schedule the actual refresh after warning time
        setTimeout(() => {
            this.performSmoothRefresh();
        }, this.warningTime);
    }

    hideWarning() {
        this.warningShown = false;
        this.removeWarningIndicator();
        this.hideSubtleNotification();
    }

    createWarningIndicator() {
        // Create a subtle refresh indicator
        const indicator = document.createElement('div');
        indicator.id = 'refresh-warning-indicator';
        indicator.innerHTML = `
            <div style="
                position: fixed;
                top: 20px;
                right: 20px;
                background: linear-gradient(135deg, #667eea, #764ba2);
                color: white;
                padding: 12px 20px;
                border-radius: 12px;
                box-shadow: 0 8px 25px rgba(0,0,0,0.15);
                z-index: 9999;
                font-size: 14px;
                font-weight: 600;
                opacity: 0;
                transform: translateY(-20px);
                transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255,255,255,0.2);
            ">
                <i class="fas fa-sync-alt me-2"></i>
                Refreshing soon...
            </div>
        `;
        
        document.body.appendChild(indicator);
        
        // Animate in
        setTimeout(() => {
            indicator.style.opacity = '1';
            indicator.style.transform = 'translateY(0)';
        }, 100);
    }

    removeWarningIndicator() {
        const indicator = document.getElementById('refresh-warning-indicator');
        if (indicator) {
            indicator.style.opacity = '0';
            indicator.style.transform = 'translateY(-20px)';
            setTimeout(() => {
                if (indicator.parentNode) {
                    indicator.parentNode.removeChild(indicator);
                }
            }, 500);
        }
    }

    showSubtleNotification(message) {
        // Create a subtle notification that doesn't interrupt user
        const notification = document.createElement('div');
        notification.id = 'subtle-refresh-notification';
        notification.innerHTML = `
            <div style="
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: rgba(0,0,0,0.8);
                color: white;
                padding: 10px 15px;
                border-radius: 8px;
                font-size: 12px;
                z-index: 9998;
                opacity: 0;
                transform: translateY(20px);
                transition: all 0.3s ease;
                max-width: 250px;
            ">
                ${message}
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateY(0)';
        }, 100);
        
        // Auto hide after 3 seconds
        setTimeout(() => {
            this.hideSubtleNotification();
        }, 3000);
    }

    hideSubtleNotification() {
        const notification = document.getElementById('subtle-refresh-notification');
        if (notification) {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(20px)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }
    }

    showNetworkStatus(status) {
        let statusElement = document.getElementById('network-status');
        if (!statusElement) {
            const statusDiv = document.createElement('div');
            statusDiv.id = 'network-status';
            statusDiv.style.cssText = `
                position: fixed;
                top: 20px;
                left: 20px;
                padding: 8px 12px;
                border-radius: 8px;
                font-size: 12px;
                font-weight: 600;
                z-index: 9997;
                opacity: 0;
                transform: translateY(-20px);
                transition: all 0.3s ease;
            `;
            document.body.appendChild(statusDiv);
        }

        statusElement = document.getElementById('network-status');
        if (status === 'online') {
            statusElement.style.background = 'linear-gradient(135deg, #28a745, #20c997)';
            statusElement.style.color = 'white';
            statusElement.innerHTML = '<i class="fas fa-wifi me-1"></i> Online';
        } else {
            statusElement.style.background = 'linear-gradient(135deg, #dc3545, #c82333)';
            statusElement.style.color = 'white';
            statusElement.innerHTML = '<i class="fas fa-wifi-slash me-1"></i> Offline';
        }

        // Animate in
        setTimeout(() => {
            statusElement.style.opacity = '1';
            statusElement.style.transform = 'translateY(0)';
        }, 100);

        // Auto hide after 3 seconds
        setTimeout(() => {
            if (statusElement && statusElement.parentNode) {
                statusElement.style.opacity = '0';
                statusElement.style.transform = 'translateY(-20px)';
                setTimeout(() => {
                    statusElement.parentNode.removeChild(statusElement);
                }, 300);
            }
        }, 3000);
    }

    performSmoothRefresh() {
        if (this.isRefreshing) return;
        
        this.isRefreshing = true;
        this.hideWarning();
        
        // Save current scroll position
        const scrollX = window.scrollX;
        const scrollY = window.scrollY;
        
        // Save current form data
        const formData = this.saveFormData();
        
        // Show loading indicator
        this.showLoadingIndicator();
        
        // Perform the refresh
        setTimeout(() => {
            // Reload the page
            window.location.reload();
        }, 500);
    }

    saveFormData() {
        // Save form data to sessionStorage to restore after refresh
        const forms = document.querySelectorAll('form');
        const formData = {};
        
        forms.forEach((form, index) => {
            const formElements = form.querySelectorAll('input, select, textarea');
            formData[`form_${index}`] = {};
            
            formElements.forEach(element => {
                if (element.name) {
                    formData[`form_${index}`][element.name] = element.value;
                }
            });
        });
        
        if (Object.keys(formData).length > 0) {
            sessionStorage.setItem('savedFormData', JSON.stringify(formData));
        }
        
        return formData;
    }

    restoreFormData() {
        // Restore form data after refresh
        const savedData = sessionStorage.getItem('savedFormData');
        if (savedData) {
            try {
                const formData = JSON.parse(savedData);
                
                Object.keys(formData).forEach(formKey => {
                    const formIndex = formKey.replace('form_', '');
                    const form = document.querySelectorAll('form')[formIndex];
                    
                    if (form) {
                        Object.keys(formData[formKey]).forEach(fieldName => {
                            const field = form.querySelector(`[name="${fieldName}"]`);
                            if (field) {
                                field.value = formData[formKey][fieldName];
                            }
                        });
                    }
                });
                
                // Clear saved data after restoration
                sessionStorage.removeItem('savedFormData');
            } catch (error) {
                console.log('Error restoring form data:', error);
            }
        }
    }

    showLoadingIndicator() {
        const loader = document.createElement('div');
        loader.id = 'smooth-refresh-loader';
        loader.innerHTML = `
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(255,255,255,0.95);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                backdrop-filter: blur(5px);
            ">
                <div style="
                    text-align: center;
                    color: #333;
                ">
                    <div style="
                        width: 40px;
                        height: 40px;
                        border: 4px solid #667eea;
                        border-top: 4px solid transparent;
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                        margin-bottom: 10px;
                    "></div>
                    <div style="font-size: 14px; font-weight: 600;">
                        Updating...
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(loader);
    }

    pauseRefresh() {
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
            this.refreshTimer = null;
        }
        this.hideWarning();
    }

    resumeRefresh() {
        if (!this.isRefreshing) {
            this.scheduleNextRefresh();
        }
    }

    // Public methods
    forceRefresh() {
        this.performSmoothRefresh();
    }

    getStatus() {
        return {
            nextRefreshIn: this.refreshTimer ? Math.max(0, this.refreshInterval - (Date.now() - this.lastActivity)) : null,
            isRefreshing: this.isRefreshing,
            lastActivity: this.lastActivity
        };
    }
}

// Initialize the auto-refresh system
document.addEventListener('DOMContentLoaded', function() {
    window.autoRefreshManager = new AutoRefreshManager();
    
    // Restore form data if available
    window.autoRefreshManager.restoreFormData();
    
    // Add keyboard shortcut for manual refresh (Ctrl+R)
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === 'r') {
            e.preventDefault();
            window.autoRefreshManager.forceRefresh();
        }
    });
    
    console.log('Auto-refresh system initialized (90-second cycle)');
});

// Add CSS for loading animation
const style = document.createElement('style');
style.textContent = `
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    
    #smooth-refresh-loader {
        animation: fadeIn 0.3s ease-in;
    }
    
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
`;
document.head.appendChild(style);
