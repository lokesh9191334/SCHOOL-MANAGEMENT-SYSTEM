// Real-time Notification System

class NotificationSystem {
    constructor() {
        this.notificationCount = 0;
        this.messageCount = 0;
        this.paymentCount = 0;
        this.updateInterval = null;
        this.apiAvailable = false;
        this.init();
    }

    init() {
        // Check if API endpoints are available before starting
        this.checkAPIAvailability().then(() => {
            if (this.apiAvailable) {
                this.startRealTimeUpdates();
                this.setupEventListeners();
                this.updateCounts();
            } else {
                console.debug('API endpoints not available, notification system disabled');
            }
        });
    }

    async checkAPIAvailability() {
        try {
            // Check if any of the required API endpoints exist
            const response = await fetch('/api/notifications/count', { 
                method: 'HEAD',
                signal: AbortSignal.timeout(2000) // 2 second timeout
            });
            this.apiAvailable = response.ok;
        } catch (error) {
            this.apiAvailable = false;
        }
    }

    startRealTimeUpdates() {
        // Update counts every 30 seconds
        this.updateInterval = setInterval(() => {
            this.updateCounts();
        }, 30000);

        // Listen for server-sent events (if implemented)
        this.setupEventSource();
    }

    setupEventSource() {
        // Don't setup EventSource if API is not available
        if (!this.apiAvailable) {
            return;
        }

        try {
            // Only setup EventSource if user is authenticated and API exists
            if (!window.location.pathname.includes('/login') && 
                !window.location.pathname.includes('/register') &&
                document.querySelector('.sidebar')) {
                
                const eventSource = new EventSource('/api/notifications/stream');
                
                eventSource.onmessage = (event) => {
                    const data = JSON.parse(event.data);
                    this.handleRealTimeNotification(data);
                };

                eventSource.onerror = () => {
                    console.debug('EventSource connection not available, using polling only');
                    eventSource.close();
                };
            }
        } catch (error) {
            console.debug('EventSource not supported or not available');
        }
    }

    setupEventListeners() {
        // Mark notifications as read when clicking on notification link
        document.addEventListener('click', (e) => {
            if (e.target.closest('.notification-link')) {
                this.markNotificationsAsRead();
            }
        });

        // Handle message sending
        const messageForm = document.getElementById('messageForm');
        if (messageForm) {
            messageForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.sendMessage();
            });
        }
    }

    async updateCounts() {
        // Don't update counts if API is not available
        if (!this.apiAvailable) {
            return;
        }

        try {
            // Check if user is authenticated before making API calls
            if (!window.location.pathname.includes('/login') && 
                !window.location.pathname.includes('/register') &&
                document.querySelector('.sidebar')) {
                
                const [notifications, messages, payments] = await Promise.all([
                    this.fetchNotificationCount(),
                    this.fetchMessageCount(),
                    this.fetchPaymentCount()
                ]);

                this.updateBadge('notificationCount', notifications.count);
                this.updateBadge('messageCount', messages.count);
                this.updateBadge('paymentCount', payments.count);
            }
        } catch (error) {
            // Silently handle errors to avoid console spam
            console.debug('Notification counts update skipped:', error.message);
        }
    }

    async fetchNotificationCount() {
        try {
            const response = await fetch('/api/notifications/count');
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.debug('Notification count API not available');
        }
        return { count: 0 };
    }

    async fetchMessageCount() {
        try {
            const response = await fetch('/api/messages/count');
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.debug('Message count API not available');
        }
        return { count: 0 };
    }

    async fetchPaymentCount() {
        try {
            const response = await fetch('/api/payments/count');
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.debug('Payment count API not available');
        }
        return { count: 0 };
    }

    updateBadge(elementId, count) {
        const badge = document.getElementById(elementId);
        if (badge) {
            if (count > 0) {
                badge.textContent = count > 99 ? '99+' : count;
                badge.style.display = 'inline-flex';
                badge.classList.add('pulse');
            } else {
                badge.style.display = 'none';
                badge.classList.remove('pulse');
            }
        }
    }

    handleRealTimeNotification(data) {
        switch (data.type) {
            case 'notification':
                this.showNotificationToast(data);
                this.updateCounts();
                break;
            case 'message':
                this.showMessageToast(data);
                this.updateCounts();
                break;
            case 'payment':
                this.showPaymentToast(data);
                this.updateCounts();
                break;
        }
    }

    showNotificationToast(data) {
        const toast = this.createToast({
            type: data.notification_type || 'info',
            title: 'New Notification',
            message: data.message,
            duration: 5000
        });
        document.body.appendChild(toast);
    }

    showMessageToast(data) {
        const toast = this.createToast({
            type: 'message',
            title: `New message from ${data.sender_name}`,
            message: data.message,
            duration: 5000
        });
        document.body.appendChild(toast);
    }

    showPaymentToast(data) {
        const toast = this.createToast({
            type: 'payment',
            title: 'Payment Received',
            message: `₹${data.amount} received from ${data.student_name}`,
            duration: 5000
        });
        document.body.appendChild(toast);
    }

    createToast(options) {
        const toast = document.createElement('div');
        toast.className = `notification-toast ${options.type}`;
        
        toast.innerHTML = `
            <div class="notification-toast-header">
                <div class="notification-toast-title">${options.title}</div>
                <button class="notification-toast-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
            <div class="notification-toast-body">
                ${options.message}
            </div>
        `;

        // Auto remove after duration
        setTimeout(() => {
            if (toast.parentElement) {
                toast.style.animation = 'slideOutRight 0.3s ease-out';
                setTimeout(() => toast.remove(), 300);
            }
        }, options.duration || 5000);

        return toast;
    }

    async sendMessage() {
        const recipientId = document.getElementById('recipientId').value;
        const message = document.getElementById('messageContent').value;

        if (!recipientId || !message) {
            this.showError('Please fill in all fields');
            return;
        }

        try {
            const response = await fetch('/api/send-message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    recipient_id: recipientId,
                    message: message
                })
            });

            const result = await response.json();
            
            if (result.success) {
                this.showSuccess('Message sent successfully');
                document.getElementById('messageContent').value = '';
                this.updateCounts();
            } else {
                this.showError(result.message || 'Failed to send message');
            }
        } catch (error) {
            this.showError('Error sending message');
        }
    }

    async markNotificationsAsRead() {
        try {
            await fetch('/api/notifications/mark-read', {
                method: 'POST'
            });
        } catch (error) {
            console.error('Error marking notifications as read:', error);
        }
    }

    showSuccess(message) {
        this.showToast(message, 'success');
    }

    showError(message) {
        this.showToast(message, 'error');
    }

    showToast(message, type) {
        const toast = this.createToast({
            type: type,
            title: type === 'success' ? 'Success' : 'Error',
            message: message,
            duration: 3000
        });
        document.body.appendChild(toast);
    }

    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
    }
}

// Initialize notification system when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    window.notificationSystem = new NotificationSystem();
});

// Add pulse animation for badges
const style = document.createElement('style');
style.textContent = `
    @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.1); }
        100% { transform: scale(1); }
    }
    
    .pulse {
        animation: pulse 2s infinite;
    }
`;
document.head.appendChild(style);

// Helper functions for global access
window.showNotificationToast = function(data) {
    if (window.notificationSystem) {
        window.notificationSystem.showNotificationToast(data);
    }
};

window.showMessageToast = function(data) {
    if (window.notificationSystem) {
        window.notificationSystem.showMessageToast(data);
    }
};

window.showPaymentToast = function(data) {
    if (window.notificationSystem) {
        window.notificationSystem.showPaymentToast(data);
    }
};
