/**
 * Security & UI Enhancements for School Management System
 * Provides comprehensive security measures and modern UI interactions
 */

class SecurityUIEnhancer {
    constructor() {
        this.init();
    }

    init() {
        this.setupCSRFProtection();
        this.setupInputValidation();
        this.setupSecureFileHandling();
        this.setupUIEnhancements();
        this.setupAccessibility();
        this.setupPerformanceOptimizations();
        this.setupErrorHandling();
    }

    // ===== CSRF PROTECTION =====
    setupCSRFProtection() {
        // Add CSRF token to all AJAX requests
        const csrfToken = this.getCSRFToken();

        // Override fetch for CSRF protection
        const originalFetch = window.fetch;
        window.fetch = function(url, options = {}) {
            if (typeof url === 'string' && !url.includes('csrf_exempt')) {
                options.headers = options.headers || {};
                options.headers['X-CSRFToken'] = csrfToken;
                options.headers['X-Requested-With'] = 'XMLHttpRequest';
            }
            return originalFetch.call(this, url, options);
        };

        // Protect all forms
        document.addEventListener('DOMContentLoaded', () => {
            this.protectForms();
        });
    }

    getCSRFToken() {
        // Try to get CSRF token from meta tag or cookie
        const metaToken = document.querySelector('meta[name="csrf-token"]');
        if (metaToken) return metaToken.getAttribute('content');

        // Fallback to cookie
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'csrf_token' || name === 'csrftoken') {
                return decodeURIComponent(value);
            }
        }
        return '';
    }

    protectForms() {
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
            if (!form.hasAttribute('data-csrf-exempt')) {
                form.addEventListener('submit', (e) => {
                    if (!this.validateFormSecurity(form)) {
                        e.preventDefault();
                        this.showSecurityError('Security validation failed');
                        return false;
                    }
                });
            }
        });
    }

    validateFormSecurity(form) {
        // Check for suspicious patterns
        const inputs = form.querySelectorAll('input, textarea, select');
        for (let input of inputs) {
            if (this.containsSuspiciousContent(input.value)) {
                return false;
            }
        }
        return true;
    }

    containsSuspiciousContent(content) {
        if (!content) return false;

        // XSS patterns
        const xssPatterns = [
            /<script[^>]*>.*?<\/script>/gi,
            /javascript:/gi,
            /on\w+\s*=/gi,
            /<iframe[^>]*>/gi,
            /<object[^>]*>/gi,
            /<embed[^>]*>/gi,
            /<form[^>]*>/gi,
            /<input[^>]*>/gi,
            /<meta[^>]*>/gi,
            /<link[^>]*>/gi
        ];

        // SQL injection patterns
        const sqlPatterns = [
            /(\b(union|select|insert|delete|update|drop|create|alter|exec|execute)\b)/gi,
            /(-{2}|\/\*|\*\/)/g,
            /('|(\\x27)|(\\x2D\\x2D)|(\\")|(\\x3B)|(\\x2F\\x2A)|(\\x2A\\x2F))/g
        ];

        const allPatterns = [...xssPatterns, ...sqlPatterns];

        return allPatterns.some(pattern => pattern.test(content));
    }

    // ===== INPUT VALIDATION =====
    setupInputValidation() {
        document.addEventListener('DOMContentLoaded', () => {
            this.setupRealTimeValidation();
            this.setupFileValidation();
        });
    }

    setupRealTimeValidation() {
        // Email validation
        const emailInputs = document.querySelectorAll('input[type="email"]');
        emailInputs.forEach(input => {
            input.addEventListener('blur', (e) => {
                if (e.target.value && !this.isValidEmail(e.target.value)) {
                    this.showFieldError(e.target, 'Please enter a valid email address');
                } else {
                    this.clearFieldError(e.target);
                }
            });
        });

        // Phone validation
        const phoneInputs = document.querySelectorAll('input[name*="phone"]');
        phoneInputs.forEach(input => {
            input.addEventListener('blur', (e) => {
                if (e.target.value && !this.isValidPhone(e.target.value)) {
                    this.showFieldError(e.target, 'Please enter a valid phone number');
                } else {
                    this.clearFieldError(e.target);
                }
            });
        });

        // Aadhaar validation
        const aadhaarInputs = document.querySelectorAll('input[name*="aadhaar"]');
        aadhaarInputs.forEach(input => {
            input.addEventListener('blur', (e) => {
                if (e.target.value && !this.isValidAadhaar(e.target.value)) {
                    this.showFieldError(e.target, 'Please enter a valid 12-digit Aadhaar number');
                } else {
                    this.clearFieldError(e.target);
                }
            });
        });

        // Prevent paste of malicious content
        document.addEventListener('paste', (e) => {
            const pastedText = e.clipboardData.getData('text');
            if (this.containsSuspiciousContent(pastedText)) {
                e.preventDefault();
                this.showSecurityError('Pasted content contains potentially malicious code');
            }
        });
    }

    setupFileValidation() {
        const fileInputs = document.querySelectorAll('input[type="file"]');
        fileInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                const files = e.target.files;
                for (let file of files) {
                    if (!this.isValidFile(file)) {
                        e.target.value = '';
                        this.showFieldError(e.target, 'Invalid file type or size');
                        break;
                    }
                }
            });
        });
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    isValidPhone(phone) {
        // Remove all non-digit characters
        const digits = phone.replace(/\D/g, '');
        // Check if it's a valid phone number (10-15 digits)
        return digits.length >= 10 && digits.length <= 15;
    }

    isValidAadhaar(aadhaar) {
        // Remove spaces and check if it's exactly 12 digits
        const digits = aadhaar.replace(/\s/g, '');
        return /^\d{12}$/.test(digits);
    }

    isValidFile(file) {
        // File type validation
        const allowedTypes = [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'application/pdf',
            'text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ];

        // File size validation (10MB max)
        const maxSize = 10 * 1024 * 1024;

        return allowedTypes.includes(file.type) && file.size <= maxSize;
    }

    // ===== SECURE FILE HANDLING =====
    setupSecureFileHandling() {
        document.addEventListener('DOMContentLoaded', () => {
            this.setupDragDropSecurity();
            this.setupFilePreviewSecurity();
        });
    }

    setupDragDropSecurity() {
        const dropZones = document.querySelectorAll('[data-drop-zone]');
        dropZones.forEach(zone => {
            zone.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.effectAllowed = 'copy';
            });

            zone.addEventListener('drop', (e) => {
                e.preventDefault();

                const files = Array.from(e.dataTransfer.files);
                const validFiles = files.filter(file => this.isValidFile(file));

                if (validFiles.length !== files.length) {
                    this.showSecurityError('Some files were rejected due to security restrictions');
                }

                // Handle valid files
                if (validFiles.length > 0) {
                    this.handleSecureFileDrop(zone, validFiles);
                }
            });
        });
    }

    setupFilePreviewSecurity() {
        // Secure image preview with size limits
        const imageInputs = document.querySelectorAll('input[type="file"][accept*="image"]');
        imageInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file && file.type.startsWith('image/')) {
                    this.createSecureImagePreview(file, e.target);
                }
            });
        });
    }

    createSecureImagePreview(file, inputElement) {
        if (file.size > 5 * 1024 * 1024) { // 5MB limit for previews
            this.showFieldError(inputElement, 'Image too large for preview');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                // Check image dimensions (max 4096x4096)
                if (img.width > 4096 || img.height > 4096) {
                    this.showFieldError(inputElement, 'Image dimensions too large');
                    return;
                }

                // Create secure preview
                this.displaySecurePreview(img, inputElement);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    displaySecurePreview(img, inputElement) {
        // Remove any existing preview
        const existingPreview = inputElement.parentNode.querySelector('.secure-preview');
        if (existingPreview) {
            existingPreview.remove();
        }

        // Create new secure preview
        const preview = document.createElement('div');
        preview.className = 'secure-preview mt-2';
        preview.innerHTML = `
            <img src="${img.src}" alt="Preview" style="max-width: 200px; max-height: 200px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" />
        `;

        inputElement.parentNode.appendChild(preview);
    }

    handleSecureFileDrop(zone, files) {
        const input = zone.querySelector('input[type="file"]');
        if (input) {
            // Create a new DataTransfer object for secure file assignment
            const dt = new DataTransfer();
            files.forEach(file => dt.items.add(file));
            input.files = dt.files;

            // Trigger change event
            input.dispatchEvent(new Event('change', { bubbles: true }));

            // Show success feedback
            this.showSuccessMessage(`${files.length} file(s) securely uploaded`);
        }
    }

    // ===== UI ENHANCEMENTS =====
    setupUIEnhancements() {
        document.addEventListener('DOMContentLoaded', () => {
            this.setupLoadingStates();
            this.setupAnimations();
            this.setupTooltips();
            this.setupResponsiveElements();
        });
    }

    setupLoadingStates() {
        // Enhanced loading states for forms
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
            form.addEventListener('submit', () => {
                const submitBtn = form.querySelector('button[type="submit"]');
                if (submitBtn && !submitBtn.disabled) {
                    this.setLoadingState(submitBtn);
                }
            });
        });

        // Enhanced loading states for buttons
        const actionButtons = document.querySelectorAll('[data-loading-text]');
        actionButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                if (!btn.disabled) {
                    const loadingText = btn.getAttribute('data-loading-text') || 'Loading...';
                    this.setLoadingState(btn, loadingText);
                }
            });
        });
    }

    setLoadingState(button, loadingText = 'Loading...') {
        const originalText = button.innerHTML;
        const originalDisabled = button.disabled;

        button.disabled = true;
        button.innerHTML = `
            <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
            ${loadingText}
        `;

        // Store original state for restoration
        button._originalHTML = originalText;
        button._originalDisabled = originalDisabled;

        // Auto-restore after 10 seconds (safety net)
        setTimeout(() => {
            this.restoreButtonState(button);
        }, 10000);
    }

    restoreButtonState(button) {
        if (button._originalHTML) {
            button.innerHTML = button._originalHTML;
            button.disabled = button._originalDisabled || false;
            delete button._originalHTML;
            delete button._originalDisabled;
        }
    }

    setupAnimations() {
        // Intersection Observer for scroll animations
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-fade-in');
                }
            });
        }, observerOptions);

        // Observe elements for animation
        const animateElements = document.querySelectorAll('.card, .alert, .table');
        animateElements.forEach(el => observer.observe(el));
    }

    setupTooltips() {
        // Initialize tooltips for elements with data-tooltip
        const tooltipElements = document.querySelectorAll('[data-tooltip]');
        tooltipElements.forEach(el => {
            el.setAttribute('title', el.getAttribute('data-tooltip'));
        });
    }

    setupResponsiveElements() {
        // Mobile menu enhancements
        const sidebar = document.querySelector('.sidebar');
        const content = document.querySelector('#content');

        if (sidebar && content) {
            // Close sidebar when clicking outside on mobile
            document.addEventListener('click', (e) => {
                if (window.innerWidth <= 768) {
                    if (!sidebar.contains(e.target) && !e.target.matches('.sidebar-toggle')) {
                        sidebar.classList.remove('show');
                    }
                }
            });
        }
    }

    // ===== ACCESSIBILITY ENHANCEMENTS =====
    setupAccessibility() {
        document.addEventListener('DOMContentLoaded', () => {
            this.setupKeyboardNavigation();
            this.setupScreenReaderSupport();
            this.setupFocusManagement();
        });
    }

    setupKeyboardNavigation() {
        // Enhanced keyboard navigation for forms
        document.addEventListener('keydown', (e) => {
            // Ctrl+Enter to submit forms
            if (e.ctrlKey && e.key === 'Enter') {
                const activeForm = document.activeElement.closest('form');
                if (activeForm) {
                    const submitBtn = activeForm.querySelector('button[type="submit"]');
                    if (submitBtn && !submitBtn.disabled) {
                        submitBtn.click();
                    }
                }
            }

            // Escape to close modals
            if (e.key === 'Escape') {
                const openModal = document.querySelector('.modal.show');
                if (openModal) {
                    const closeBtn = openModal.querySelector('[data-bs-dismiss="modal"]');
                    if (closeBtn) closeBtn.click();
                }
            }
        });
    }

    setupScreenReaderSupport() {
        // Add ARIA labels where missing
        const inputs = document.querySelectorAll('input:not([aria-label]):not([aria-labelledby])');
        inputs.forEach(input => {
            if (input.id) {
                const label = document.querySelector(`label[for="${input.id}"]`);
                if (label) {
                    input.setAttribute('aria-label', label.textContent.trim());
                }
            }
        });

        // Add live regions for dynamic content
        const notificationArea = document.createElement('div');
        notificationArea.setAttribute('aria-live', 'polite');
        notificationArea.setAttribute('aria-atomic', 'true');
        notificationArea.className = 'sr-only';
        notificationArea.id = 'sr-notifications';
        document.body.appendChild(notificationArea);
    }

    setupFocusManagement() {
        // Focus management for modals
        document.addEventListener('shown.bs.modal', (e) => {
            const modal = e.target;
            const focusableElements = modal.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            if (focusableElements.length) {
                focusableElements[0].focus();
            }
        });

        // Trap focus in modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                const modal = document.querySelector('.modal.show');
                if (modal) {
                    const focusableElements = modal.querySelectorAll(
                        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                    );
                    const firstElement = focusableElements[0];
                    const lastElement = focusableElements[focusableElements.length - 1];

                    if (e.shiftKey) {
                        if (document.activeElement === firstElement) {
                            lastElement.focus();
                            e.preventDefault();
                        }
                    } else {
                        if (document.activeElement === lastElement) {
                            firstElement.focus();
                            e.preventDefault();
                        }
                    }
                }
            }
        });
    }

    // ===== PERFORMANCE OPTIMIZATIONS =====
    setupPerformanceOptimizations() {
        // Lazy loading for images
        this.setupLazyLoading();

        // Debounced scroll events
        this.setupDebouncedScroll();

        // Memory management
        this.setupMemoryManagement();
    }

    setupLazyLoading() {
        const images = document.querySelectorAll('img[data-src]');
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.add('loaded');
                    imageObserver.unobserve(img);
                }
            });
        });

        images.forEach(img => imageObserver.observe(img));
    }

    setupDebouncedScroll() {
        let scrollTimeout;
        const scrollHandler = () => {
            // Add scroll-based optimizations here
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                // Perform scroll-based actions
            }, 16); // ~60fps
        };

        window.addEventListener('scroll', scrollHandler, { passive: true });
    }

    setupMemoryManagement() {
        // Clean up event listeners on page unload
        window.addEventListener('beforeunload', () => {
            // Clear any intervals, timeouts, or observers
            this.cleanup();
        });
    }

    cleanup() {
        // Cleanup method for memory management
        // Clear any stored references, remove event listeners, etc.
    }

    // ===== ERROR HANDLING =====
    setupErrorHandling() {
        // Global error handler
        window.addEventListener('error', (e) => {
            console.error('JavaScript Error:', e.error);
            this.logError('JavaScript Error', e.error);
        });

        // Unhandled promise rejections
        window.addEventListener('unhandledrejection', (e) => {
            console.error('Unhandled Promise Rejection:', e.reason);
            this.logError('Unhandled Promise Rejection', e.reason);
        });

        // Network error handling
        window.addEventListener('offline', () => {
            this.showNetworkStatus('You are currently offline', 'warning');
        });

        window.addEventListener('online', () => {
            this.showNetworkStatus('You are back online', 'success');
        });
    }

    logError(type, error) {
        // Send error to server for logging (if needed)
        const errorData = {
            type: type,
            message: error.message || error,
            stack: error.stack,
            url: window.location.href,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString()
        };

        // Could send to server endpoint
        console.log('Error logged:', errorData);
    }

    // ===== UTILITY METHODS =====
    showFieldError(field, message) {
        this.clearFieldError(field);

        field.classList.add('is-invalid');
        const errorDiv = document.createElement('div');
        errorDiv.className = 'invalid-feedback d-block';
        errorDiv.textContent = message;
        field.parentNode.appendChild(errorDiv);

        // Announce to screen readers
        this.announceToScreenReader(message);
    }

    clearFieldError(field) {
        field.classList.remove('is-invalid');
        const existingError = field.parentNode.querySelector('.invalid-feedback');
        if (existingError) {
            existingError.remove();
        }
    }

    showSecurityError(message) {
        this.showToast(message, 'danger');
        this.announceToScreenReader('Security error: ' + message);
    }

    showSuccessMessage(message) {
        this.showToast(message, 'success');
        this.announceToScreenReader(message);
    }

    showToast(message, type = 'info') {
        // Create toast notification
        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-white bg-${type} border-0`;
        toast.setAttribute('role', 'alert');
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;

        // Add to toast container or create one
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container position-fixed top-0 end-0 p-3';
            container.style.zIndex = '9999';
            document.body.appendChild(container);
        }

        container.appendChild(toast);

        // Initialize and show toast
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();

        // Remove after hiding
        toast.addEventListener('hidden.bs.toast', () => {
            toast.remove();
        });
    }

    showNetworkStatus(message, type = 'info') {
        this.showToast(message, type);
    }

    announceToScreenReader(message) {
        const srElement = document.getElementById('sr-notifications');
        if (srElement) {
            srElement.textContent = message;
            setTimeout(() => {
                srElement.textContent = '';
            }, 1000);
        }
    }
}

// Initialize the Security & UI Enhancer
document.addEventListener('DOMContentLoaded', () => {
    window.securityUIEnhancer = new SecurityUIEnhancer();
    console.log('Security & UI Enhancements initialized');
});