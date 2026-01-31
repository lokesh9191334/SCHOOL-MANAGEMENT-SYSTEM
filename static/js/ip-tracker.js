// Enhanced IP Address Tracking and Geolocation System

class IPTracker {
    constructor() {
        this.init();
    }

    init() {
        this.setupIPGeolocation();
        this.setupActivityMonitoring();
        this.setupRealTimeTracking();
    }

    setupIPGeolocation() {
        // Get user's IP information on page load
        this.getUserIPInfo();
    }

    async getUserIPInfo() {
        try {
            // Get IP information from multiple sources for accuracy
            const ipData = await this.fetchIPData();
            
            if (ipData) {
                this.storeIPInfo(ipData);
                this.updateUIWithIPInfo(ipData);
            }
        } catch (error) {
            console.log('Error getting IP info:', error);
        }
    }

    async fetchIPData() {
        const ipServices = [
            'https://ipapi.co/json/',
            'https://api.ipify.org?format=json',
            'https://ipinfo.io/json',
            'https://api.ipgeolocation.io/ipgeo?apiKey=free'
        ];

        for (const service of ipServices) {
            try {
                const response = await fetch(service);
                if (response.ok) {
                    const data = await response.json();
                    return this.normalizeIPData(data);
                }
            } catch (error) {
                continue;
            }
        }
        return null;
    }

    normalizeIPData(data) {
        // Normalize different API responses to standard format
        return {
            ip: data.ip || data.query || data.ip_address,
            country: data.country_name || data.country || data.countryCode,
            city: data.city || 'Unknown',
            region: data.region || data.region_name || data.state || 'Unknown',
            latitude: data.latitude || data.lat,
            longitude: data.longitude || data.lon || data.lng,
            isp: data.org || data.isp || data.connection?.organization || 'Unknown',
            timezone: data.timezone || data.time_zone?.id || 'Unknown',
            isVPN: this.detectVPN(data),
            isProxy: this.detectProxy(data),
            threatLevel: this.assessThreatLevel(data)
        };
    }

    detectVPN(ipData) {
        // Simple VPN detection based on ISP and other factors
        const vpnKeywords = ['vpn', 'hosting', 'cloud', 'server', 'data center'];
        const isp = (ipData.isp || '').toLowerCase();
        const org = (ipData.org || '').toLowerCase();
        
        return vpnKeywords.some(keyword => 
            isp.includes(keyword) || org.includes(keyword)
        );
    }

    detectProxy(ipData) {
        // Proxy detection based on various factors
        const proxyKeywords = ['proxy', 'tor', 'anonymous'];
        const isp = (ipData.isp || '').toLowerCase();
        const org = (ipData.org || '').toLowerCase();
        
        return proxyKeywords.some(keyword => 
            isp.includes(keyword) || org.includes(keyword)
        );
    }

    assessThreatLevel(ipData) {
        let threatLevel = 'low';
        
        // Check for suspicious patterns
        if (this.detectVPN(ipData)) {
            threatLevel = 'medium';
        }
        
        if (this.detectProxy(ipData)) {
            threatLevel = 'high';
        }
        
        // Check for known malicious IP ranges (simplified)
        if (this.isSuspiciousIP(ipData.ip)) {
            threatLevel = 'critical';
        }
        
        return threatLevel;
    }

    isSuspiciousIP(ip) {
        // Simplified suspicious IP detection
        const suspiciousRanges = [
            '10.0.0.', // Private networks
            '192.168.',
            '172.16.'
        ];
        
        return suspiciousRanges.some(range => ip.startsWith(range));
    }

    storeIPInfo(ipData) {
        // Store IP information in localStorage for tracking
        const storedData = {
            ...ipData,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            screenResolution: `${screen.width}x${screen.height}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        };
        
        localStorage.setItem('userIPInfo', JSON.stringify(storedData));
        
        // Send to server for activity logging
        this.sendIPToServer(storedData);
    }

    async sendIPToServer(ipData) {
        try {
            const response = await fetch('/api/log-ip-info', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(ipData)
            });
            
            if (response.ok) {
                console.log('IP info logged successfully');
            }
        } catch (error) {
            console.log('Error sending IP info to server:', error);
        }
    }

    updateUIWithIPInfo(ipData) {
        // Update UI elements with IP information
        this.updateIPDisplay(ipData);
        this.updateSecurityIndicators(ipData);
    }

    updateIPDisplay(ipData) {
        const ipDisplay = document.getElementById('current-ip-display');
        if (ipDisplay) {
            ipDisplay.innerHTML = `
                <div class="ip-info-display">
                    <div class="ip-address">
                        <i class="fas fa-globe me-2"></i>
                        <strong>${ipData.ip}</strong>
                        <span class="badge bg-${this.getThreatLevelColor(ipData.threatLevel)} ms-2">
                            ${ipData.threatLevel.toUpperCase()}
                        </span>
                    </div>
                    <div class="ip-location">
                        <i class="fas fa-map-marker-alt me-2"></i>
                        ${ipData.city}, ${ipData.region}, ${ipData.country}
                    </div>
                    <div class="ip-isp">
                        <i class="fas fa-network-wired me-2"></i>
                        ${ipData.isp}
                    </div>
                </div>
            `;
        }
    }

    updateSecurityIndicators(ipData) {
        const securityPanel = document.getElementById('security-indicators');
        if (securityPanel) {
            securityPanel.innerHTML = `
                <div class="security-status">
                    <div class="indicator ${ipData.isVPN ? 'warning' : 'success'}">
                        <i class="fas fa-shield-alt me-2"></i>
                        VPN: ${ipData.isVPN ? 'Detected' : 'Not Detected'}
                    </div>
                    <div class="indicator ${ipData.isProxy ? 'danger' : 'success'}">
                        <i class="fas fa-user-secret me-2"></i>
                        Proxy: ${ipData.isProxy ? 'Detected' : 'Not Detected'}
                    </div>
                    <div class="indicator">
                        <i class="fas fa-clock me-2"></i>
                        Timezone: ${ipData.timezone}
                    </div>
                </div>
            `;
        }
    }

    getThreatLevelColor(level) {
        const colors = {
            'low': 'success',
            'medium': 'warning',
            'high': 'danger',
            'critical': 'dark'
        };
        return colors[level] || 'secondary';
    }

    setupActivityMonitoring() {
        // Monitor user activity for security
        this.trackPageViews();
        this.trackFormSubmissions();
        this.trackFailedLogins();
    }

    trackPageViews() {
        // Track page views with IP info
        const trackPageView = () => {
            const ipData = JSON.parse(localStorage.getItem('userIPInfo') || '{}');
            const pageData = {
                url: window.location.href,
                title: document.title,
                timestamp: new Date().toISOString(),
                ipInfo: ipData
            };
            
            this.sendActivityToServer('page_view', pageData);
        };

        // Track initial page view
        trackPageView();
        
        // Track page changes (for SPAs)
        let lastUrl = window.location.href;
        setInterval(() => {
            if (window.location.href !== lastUrl) {
                lastUrl = window.location.href;
                trackPageView();
            }
        }, 1000);
    }

    trackFormSubmissions() {
        // Track form submissions
        document.addEventListener('submit', (e) => {
            const form = e.target;
            const formData = new FormData(form);
            const ipData = JSON.parse(localStorage.getItem('userIPInfo') || '{}');
            
            const submissionData = {
                formId: form.id || 'unknown',
                formAction: form.action || window.location.href,
                timestamp: new Date().toISOString(),
                ipInfo: ipData,
                hasSensitiveData: this.hasSensitiveData(formData)
            };
            
            this.sendActivityToServer('form_submission', submissionData);
        });
    }

    trackFailedLogins() {
        // Track failed login attempts
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    const errorMessages = document.querySelectorAll('.alert-danger, .error-message');
                    errorMessages.forEach((error) => {
                        if (error.textContent.includes('login') || error.textContent.includes('password')) {
                            const ipData = JSON.parse(localStorage.getItem('userIPInfo') || '{}');
                            
                            const loginFailureData = {
                                timestamp: new Date().toISOString(),
                                ipInfo: ipData,
                                errorMessage: error.textContent,
                                userAgent: navigator.userAgent
                            };
                            
                            this.sendActivityToServer('login_failure', loginFailureData);
                        }
                    });
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    hasSensitiveData(formData) {
        // Check if form contains sensitive data
        const sensitiveFields = ['password', 'credit_card', 'ssn', 'social_security'];
        for (let [key, value] of formData.entries()) {
            if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
                return true;
            }
        }
        return false;
    }

    async sendActivityToServer(activityType, data) {
        try {
            const response = await fetch('/api/log-activity', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    activity_type: activityType,
                    data: data
                })
            });
            
            if (response.ok) {
                console.log(`${activityType} logged successfully`);
            }
        } catch (error) {
            console.log(`Error logging ${activityType}:`, error);
        }
    }

    setupRealTimeTracking() {
        // Real-time location tracking (if user permits)
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const locationData = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                        timestamp: new Date().toISOString()
                    };
                    
                    this.sendLocationToServer(locationData);
                },
                (error) => {
                    console.log('Geolocation denied or unavailable');
                }
            );
        }
    }

    async sendLocationToServer(locationData) {
        try {
            const response = await fetch('/api/log-location', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(locationData)
            });
            
            if (response.ok) {
                console.log('Location logged successfully');
            }
        } catch (error) {
            console.log('Error logging location:', error);
        }
    }

    // Public methods
    getCurrentIPInfo() {
        return JSON.parse(localStorage.getItem('userIPInfo') || '{}');
    }

    isSuspiciousActivity() {
        const ipData = this.getCurrentIPInfo();
        return ipData.threatLevel === 'high' || ipData.threatLevel === 'critical';
    }

    getSecurityReport() {
        const ipData = this.getCurrentIPInfo();
        return {
            ip: ipData.ip || 'Unknown',
            location: `${ipData.city}, ${ipData.country}`,
            threatLevel: ipData.threatLevel || 'unknown',
            isVPN: ipData.isVPN || false,
            isProxy: ipData.isProxy || false,
            lastSeen: ipData.timestamp || 'Unknown'
        };
    }
}

// Initialize IP Tracker
document.addEventListener('DOMContentLoaded', function() {
    window.ipTracker = new IPTracker();
    
    // Add IP info to admin dashboard
    if (window.location.pathname.includes('/admin') || 
        window.location.pathname.includes('/dashboard')) {
        window.ipTracker.getUserIPInfo();
    }
    
    console.log('IP Tracker initialized');
});
