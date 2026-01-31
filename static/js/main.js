if (location && location.pathname && location.pathname.startsWith('/settings')) {
  document.addEventListener('DOMContentLoaded', function() {
    loadSettings();
    const premium = document.getElementById('premiumTheme');
    const dark = document.getElementById('darkTheme');
    if (premium) premium.addEventListener('change', function() { applyTheme('premiumTheme'); });
    if (dark) dark.addEventListener('change', function() { applyTheme('darkTheme'); });
  });
} else {
  // Only run global sync on non-settings pages
  document.addEventListener('DOMContentLoaded', function() {
    document.body.classList.add('mobile-ready');
    try {
      window.addEventListener('beforeinstallprompt', function(e) {
        e.preventDefault();
        window._deferredInstallPrompt = e;
        setTimeout(function() {
          if (window._deferredInstallPrompt) {
            window._deferredInstallPrompt.prompt();
            window._deferredInstallPrompt.userChoice.finally(function() {
              window._deferredInstallPrompt = null;
            });
          }
        }, 1000);
      });
    } catch (e) {}

    const savedSchoolName = localStorage.getItem('schoolName');
    if (savedSchoolName) {
      const nameDisplay = document.getElementById('schoolNameDisplay');
      if (nameDisplay) nameDisplay.textContent = savedSchoolName;
      const pageTitle = document.getElementById('pageTitle');
      if (pageTitle) pageTitle.textContent = savedSchoolName;
    }

    // Load saved logo
    const savedLogoPath = localStorage.getItem('schoolLogoPath');
    const logoEl = document.getElementById('schoolLogo');
    if (savedLogoPath && logoEl) {
      logoEl.src = `/static/${savedLogoPath}`;
    }
    // Replace occurrences across the page
    const siteName = savedSchoolName || 'SCHOOL MANAGEMENT SYSTEM';
    const targets = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, div, a, button');
    const patterns = [/School Management System/gi, /SCHOOL MANAGEMENT SYSTEM/gi, /Premium School Management System/gi];
      targets.forEach(el => {
        if (el.id === 'schoolNameDisplay') return;
        const txt = el.textContent;
        if (!txt) return;
        let newTxt = txt;
        patterns.forEach(re => {
          newTxt = newTxt.replace(re, siteName);
        });
        if (newTxt !== txt) {
          el.textContent = newTxt;
        }
      });

      document.querySelectorAll('a').forEach(function(a) {
        const t = (a.textContent || '').trim();
        if (/^Back to /i.test(t)) {
          a.classList.add('btn-back');
          a.classList.remove('btn-outline-secondary');
          a.classList.remove('btn-secondary');
        }
      });

      try {
        var routes = window.schoolRoutes || {};
        var path = location.pathname || "/";
        var hasBack = !!document.querySelector('.btn-back');
        if (!hasBack && Object.keys(routes).length > 0) {
          var label = null, href = null;
          if (path.startsWith('/students')) { label = 'Back to Students'; href = routes.students; }
          else if (path.startsWith('/fees')) { label = 'Back to Fees'; href = routes.fees; }
          else if (path.startsWith('/subjects')) { label = 'Back to Subjects'; href = routes.subjects; }
          else if (path.startsWith('/classes')) { label = 'Back to Classes'; href = routes.classes; }
          else if (path.startsWith('/parents')) { label = 'Back to Parent Portal'; href = routes.parents; }
          else if (path.startsWith('/dashboard')) { label = 'Back to Dashboard'; href = routes.dashboard; }
          if (label && href) {
            var a = document.createElement('a');
            a.href = href;
            a.className = 'btn-back';
            a.innerHTML = '<i class=\"fas fa-arrow-left\"></i> ' + label;
            var container = document.querySelector('.main-container');
            if (container) {
              container.insertBefore(a, container.firstChild);
            }
          }
        }
      } catch (e) {}

    // Load saved theme
    const savedTheme = localStorage.getItem('schoolTheme');
    if (savedTheme === 'darkTheme') {
      document.body.classList.add('dark-theme');
      document.body.classList.remove('blue-white-theme');
    } else {
      document.body.classList.add('blue-white-theme');
      document.body.classList.remove('dark-theme');
    }

    // Always sync settings from server after login/page load so UI updates automatically
    // Prevent duplicate calls on the same page load
    if (window.smsSettingsSynced) return;
    window.smsSettingsSynced = true;
    try {
      fetch('/settings/data', { method: 'GET' })
        .then(function(r){ return r.ok ? r.json() : null })
        .then(function(d){
          if (!d || !d.success) return;
          var s = d.settings || {};
          if (s.schoolName) {
            localStorage.setItem('schoolName', s.schoolName);
            var nameDisplay = document.getElementById('schoolNameDisplay');
            if (nameDisplay) nameDisplay.textContent = s.schoolName;
            var pageTitle = document.getElementById('pageTitle');
            if (pageTitle) pageTitle.textContent = s.schoolName;
          }
          if (s.logo_path) {
            localStorage.setItem('schoolLogoPath', s.logo_path);
            var logoEl = document.getElementById('schoolLogo');
            if (logoEl) logoEl.src = '/static/' + s.logo_path;
          }
          if (s.theme) {
            localStorage.setItem('schoolTheme', s.theme);
            applyTheme(s.theme);
          }
        })
        .catch(function(){ });
    } catch (e) {}
  });
}

// Add fade-in animation to main content
const mainContainer = document.querySelector('.main-container');
if (mainContainer) {
  mainContainer.classList.add('fade-in-up');
}
var ENABLE_SW = true;
if (ENABLE_SW && 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  navigator.serviceWorker.register('/static/sw.js');
}
var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
document.body.classList.add(isIOS ? 'ios' : 'android');
document.querySelectorAll('.bottom-nav a').forEach(function(el) {
  el.addEventListener('click', function(e) {
    if (document.body.classList.contains('android')) {
      var rect = el.getBoundingClientRect();
      var x = e.clientX - rect.left;
      var y = e.clientY - rect.top;
      var ripple = document.createElement('span');
      ripple.className = 'ripple';
      var size = Math.max(rect.width, rect.height);
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = (x - size / 2) + 'px';
      ripple.style.top = (y - size / 2) + 'px';
      el.appendChild(ripple);
      setTimeout(function() { ripple.remove(); }, 600);
    }
  }, { passive: true });
});

try {
  var grid = document.querySelector('.menu-grid');
  var items = grid ? grid.querySelectorAll('.menu-card') : [];
  var hb = document.getElementById('hamburgerBtn');
  if (!items || items.length === 0) {
    if (hb) hb.style.display = 'none';
  } else {
    if (hb) hb.style.display = 'inline-flex';
  }
} catch (e) {}

const sidebar = document.querySelector('.sidebar');
const overlay = document.getElementById('mobileOverlay');
const btn = document.getElementById('hamburgerBtn');
function openMenu() {
  if (sidebar) sidebar.classList.add('sidebar-open');
  if (overlay) overlay.classList.add('visible');
  document.body.classList.add('menu-open');
}
function closeMenu() {
  if (sidebar) sidebar.classList.remove('sidebar-open');
  if (overlay) overlay.classList.remove('visible');
  document.body.classList.remove('menu-open');
}
if (btn) btn.addEventListener('click', openMenu);
if (overlay) overlay.addEventListener('click', closeMenu);
let startX = 0;
let tracking = false;
window.addEventListener('touchstart', function(e) {
  if (e.touches && e.touches.length > 0) {
    startX = e.touches[0].clientX;
    tracking = startX < 24;
  }
}, { passive: true });
window.addEventListener('touchmove', function(e) {
  if (!tracking) return;
  const x = e.touches[0].clientX;
  if (x - startX > 30) openMenu();
}, { passive: true });
window.addEventListener('touchend', function() { tracking = false; });

let swipeStartX = 0;
let swipeStartY = 0;
let swipeActive = false;
const bottomLinks = Array.from(document.querySelectorAll('.bottom-nav a')).filter(a => a.href && !a.onclick);
const main = document.querySelector('.main-container');
if (main) {
  main.addEventListener('touchstart', function(e) {
    if (!e.touches || e.touches.length === 0) return;
    swipeStartX = e.touches[0].clientX;
    swipeStartY = e.touches[0].clientY;
    swipeActive = true;
  }, { passive: true });
  main.addEventListener('touchend', function(e) {
    if (!swipeActive) return;
    swipeActive = false;
    const endX = (e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientX : swipeStartX);
    const endY = (e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientY : swipeStartY);
    const dx = endX - swipeStartX;
    const dy = endY - swipeStartY;
    if (Math.abs(dx) > 50 && Math.abs(dy) < 40) {
      const activeIndex = bottomLinks.findIndex(a => a.classList.contains('active'));
      if (dx < 0) {
        const next = bottomLinks[Math.min(activeIndex + 1, bottomLinks.length - 1)];
        if (next) window.location.assign(next.href);
      } else {
        const prev = bottomLinks[Math.max(activeIndex - 1, 0)];
        if (prev) window.location.assign(prev.href);
      }
    }
  }, { passive: true });
}

try {
  const payload = {
    type: 'page_load',
    path: location.pathname,
    ts: Date.now(),
    perf: performance.now()
  };
  fetch('/api/metrics', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
} catch (e) {}

// Initialize tooltips
var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
  return new bootstrap.Tooltip(tooltipTriggerEl)
})

// Add hover effects to sidebar links
document.querySelectorAll('.sidebar .nav-link').forEach(link => {
  link.addEventListener('mouseenter', function() {
    this.style.transform = 'translateX(8px) scale(1.03)';
  });

  link.addEventListener('mouseleave', function() {
    if (!this.classList.contains('active')) {
      this.style.transform = 'translateX(0) scale(1)';
    }
  });
});

// Back button functionality
function goBack() {
  if (window.history.length > 1) {
    window.history.back();
  } else {
    window.location.href = '/';
  }
}

function loadSettings() {
  fetch('/settings/data', { method: 'GET' })
    .then(r => r.json())
    .then(d => {
      if (!d || !d.success) return;
      const s = d.settings || {};
      const schoolNameEl = document.getElementById('schoolName');
      if (schoolNameEl) schoolNameEl.value = s.schoolName || 'School Management System';
      const premium = document.getElementById('premiumTheme');
      const dark = document.getElementById('darkTheme');
      if (premium && dark) {
        const t = s.theme || 'premiumTheme';
        premium.checked = t === 'premiumTheme';
        dark.checked = t === 'darkTheme';
        applyTheme(t);
      }
      const emailEl = document.getElementById('emailNotifications');
      const smsEl = document.getElementById('smsNotifications');
      const pushEl = document.getElementById('pushNotifications');
      if (emailEl) emailEl.checked = !!s.emailNotifications;
      if (smsEl) smsEl.checked = !!s.smsNotifications;
      if (pushEl) pushEl.checked = !!s.pushNotifications;
      const langEl = document.getElementById('languageSelect');
      const tzEl = document.getElementById('timezoneSelect');
      if (langEl) langEl.value = s.language || 'English';
      if (tzEl) tzEl.value = s.timezone || 'UTC-5 (Eastern Time)';
      if (s.logo_path) {
        localStorage.setItem('schoolLogoPath', s.logo_path);
        const logoEl = document.getElementById('schoolLogo');
        if (logoEl) logoEl.src = `/static/${s.logo_path}`;
      }
      if (s.schoolName) {
        localStorage.setItem('schoolName', s.schoolName);
        const nameDisplay = document.getElementById('schoolNameDisplay');
        if (nameDisplay) nameDisplay.textContent = s.schoolName;
        const pageTitle = document.getElementById('pageTitle');
        if (pageTitle) pageTitle.textContent = s.schoolName;
      }
      if (s.theme) localStorage.setItem('schoolTheme', s.theme);
    })
    .catch(() => {});
}

function applyTheme(theme) {
  if (theme === 'darkTheme') {
    document.body.classList.add('dark-theme');
    document.body.classList.remove('blue-white-theme');
  } else {
    document.body.classList.add('blue-white-theme');
    document.body.classList.remove('dark-theme');
  }
}

function saveSettings() {
  const schoolNameEl = document.getElementById('schoolName');
  const premium = document.getElementById('premiumTheme');
  const dark = document.getElementById('darkTheme');
  const emailEl = document.getElementById('emailNotifications');
  const smsEl = document.getElementById('smsNotifications');
  const pushEl = document.getElementById('pushNotifications');
  const langEl = document.getElementById('languageSelect');
  const tzEl = document.getElementById('timezoneSelect');
  const theme = (dark && dark.checked) ? 'darkTheme' : 'premiumTheme';
  const payload = {
    schoolName: schoolNameEl ? schoolNameEl.value : 'School Management System',
    theme: theme,
    emailNotifications: emailEl ? !!emailEl.checked : true,
    smsNotifications: smsEl ? !!smsEl.checked : false,
    pushNotifications: pushEl ? !!pushEl.checked : true,
    language: langEl ? langEl.value : 'English',
    timezone: tzEl ? tzEl.value : 'UTC-5 (Eastern Time)',
    logo_path: localStorage.getItem('schoolLogoPath') || null
  };
  fetch('/settings/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    .then(r => r.json())
    .then(d => {
      if (d && d.success) {
        localStorage.setItem('schoolName', payload.schoolName);
        localStorage.setItem('schoolTheme', payload.theme);
        applyTheme(payload.theme);
        // Update navbar + any visible labels immediately (no refresh)
        try {
          var nameDisplay = document.getElementById('schoolNameDisplay');
          if (nameDisplay) nameDisplay.textContent = payload.schoolName;
          var pageTitle = document.getElementById('pageTitle');
          if (pageTitle) pageTitle.textContent = payload.schoolName;
          if (document && document.title) document.title = payload.schoolName;
          var logoEl = document.getElementById('schoolLogo');
          var savedLogoPath = localStorage.getItem('schoolLogoPath');
          if (logoEl && savedLogoPath) logoEl.src = '/static/' + savedLogoPath;
        } catch (e) {}
        alert('Settings saved successfully');
      } else {
        alert('Failed to save settings');
      }
    })
    .catch(() => alert('Failed to save settings'));
}

function resetSettings() {
  fetch('/settings/reset', { method: 'POST' })
    .then(r => r.json())
    .then(d => {
      if (!d || !d.success) {
        alert('Failed to reset settings');
        return;
      }
      const s = d.settings || {};
      const schoolNameEl = document.getElementById('schoolName');
      if (schoolNameEl) schoolNameEl.value = s.schoolName || 'School Management System';
      const premium = document.getElementById('premiumTheme');
      const dark = document.getElementById('darkTheme');
      if (premium && dark) {
        const t = s.theme || 'premiumTheme';
        premium.checked = t === 'premiumTheme';
        dark.checked = t === 'darkTheme';
        applyTheme(t);
      }
      const emailEl = document.getElementById('emailNotifications');
      const smsEl = document.getElementById('smsNotifications');
      const pushEl = document.getElementById('pushNotifications');
      if (emailEl) emailEl.checked = !!s.emailNotifications;
      if (smsEl) smsEl.checked = !!s.smsNotifications;
      if (pushEl) pushEl.checked = !!s.pushNotifications;
      const langEl = document.getElementById('languageSelect');
      const tzEl = document.getElementById('timezoneSelect');
      if (langEl) langEl.value = s.language || 'English';
      if (tzEl) tzEl.value = s.timezone || 'UTC-5 (Eastern Time)';
      localStorage.setItem('schoolName', s.schoolName || 'School Management System');
      localStorage.setItem('schoolTheme', s.theme || 'premiumTheme');
      if (s.logo_path) localStorage.setItem('schoolLogoPath', s.logo_path);
      alert('Settings reset to defaults');
    })
    .catch(() => alert('Failed to reset settings'));
}

function uploadLogo() {
  const fileEl = document.getElementById('schoolLogoFile');
  const file = fileEl && fileEl.files && fileEl.files[0] ? fileEl.files[0] : null;
  if (!file) {
    alert('Please choose a logo file');
    return;
  }
  const fd = new FormData();
  fd.append('logo', file);
  fetch('/settings/upload-logo', { method: 'POST', body: fd })
    .then(r => r.json())
    .then(d => {
      if (d && d.success && d.logo_path) {
        localStorage.setItem('schoolLogoPath', d.logo_path);
        const logoEl = document.getElementById('schoolLogo');
        if (logoEl) logoEl.src = `/static/${d.logo_path}`;
        alert('Logo uploaded');
      } else {
        alert('Failed to upload logo');
      }
    })
    .catch(() => alert('Failed to upload logo'));
}

function changePassword() {
  // Show password change modal
  const modal = new bootstrap.Modal(document.getElementById('changePasswordModal'));
  modal.show();
  
  // Reset form fields
  const currentField = document.getElementById('settingsCurrentPassword');
  const newField = document.getElementById('settingsNewPassword');
  const confirmField = document.getElementById('settingsConfirmPassword');
  
  if (currentField) currentField.value = '';
  if (newField) newField.value = '';
  if (confirmField) confirmField.value = '';
  
  // Reset indicators
  const strengthDiv = document.getElementById('settingsPasswordStrength');
  const matchDiv = document.getElementById('settingsPasswordMatch');
  if (strengthDiv) strengthDiv.innerHTML = '';
  if (matchDiv) matchDiv.innerHTML = '';
}

function submitSettingsPasswordChange() {
  const currentPassword = (document.getElementById('settingsCurrentPassword') || {}).value.trim();
  const newPassword = (document.getElementById('settingsNewPassword') || {}).value.trim();
  const confirmPassword = (document.getElementById('settingsConfirmPassword') || {}).value.trim();
  
  // Validate inputs
  if (!currentPassword || !newPassword || !confirmPassword) {
    showSettingsToast('All fields are required', 'danger');
    return;
  }
  
  if (newPassword !== confirmPassword) {
    showSettingsToast('New passwords do not match', 'danger');
    return;
  }
  
  if (newPassword.length < 8) {
    showSettingsToast('New password must be at least 8 characters long', 'danger');
    return;
  }
  
  if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
    showSettingsToast('Password must contain uppercase, lowercase, and numbers', 'danger');
    return;
  }
  
  const payload = { old_password: currentPassword, new_password: newPassword };
  fetch('/settings/change-password', { 
    method: 'POST', 
    headers: { 'Content-Type': 'application/json' }, 
    body: JSON.stringify(payload) 
  })
    .then(r => r.json())
    .then(d => {
      if (d && d.success) {
        showSettingsToast('Password changed successfully! Redirecting to login...', 'success');
        const modal = bootstrap.Modal.getInstance(document.getElementById('changePasswordModal'));
        if (modal) modal.hide();
        setTimeout(() => {
          window.location.href = '/auth/logout';
        }, 2000);
      } else {
        showSettingsToast(d && d.message ? d.message : 'Failed to change password', 'danger');
      }
    })
    .catch((err) => {
      console.error('Error:', err);
      showSettingsToast('Failed to change password. Please try again.', 'danger');
    });
}

function showSettingsToast(message, type = 'info') {
  // Create toast element
  const toast = document.createElement('div');
  toast.className = `alert alert-${type} alert-dismissible fade show position-fixed bottom-5 end-5 z-50 shadow-lg`;
  toast.role = 'alert';
  toast.style.minWidth = '300px';
  toast.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  `;
  
  // Add to body
  document.body.appendChild(toast);
  
  // Auto-remove after 4 seconds
  setTimeout(() => {
    toast.remove();
  }, 4000);
}

function toggleTwoFactor() {
  window.twoFactorEnabled = !window.twoFactorEnabled;
  const payload = { enabled: window.twoFactorEnabled };
  fetch('/settings/two-factor', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    .then(r => r.json())
    .then(d => {
      if (d && d.success) {
        showSettingsToast(d.enabled ? 'Two-Factor enabled successfully' : 'Two-Factor disabled', 'success');
      } else {
        showSettingsToast('Failed to update Two-Factor', 'danger');
      }
    })
    .catch(() => showSettingsToast('Failed to update Two-Factor', 'danger'));
}

function viewLoginHistory() {
  fetch('/settings/login-history', { method: 'GET' })
    .then(r => r.json())
    .then(d => {
      if (d && d.success) {
        const entries = d.entries || [];
        if (entries.length === 0) {
          alert('No login history available');
        } else {
          const historyText = entries.slice(-10).reverse().join('\n');
          alert('Recent Login History (last 10 entries):\n\n' + historyText);
        }
      } else {
        showSettingsToast('Failed to fetch login history', 'danger');
      }
    })
    .catch(() => showSettingsToast('Failed to fetch login history', 'danger'));
}

if (location && location.pathname && location.pathname.startsWith('/settings')) {
  document.addEventListener('DOMContentLoaded', function() {
    loadSettings();
    const premium = document.getElementById('premiumTheme');
    const dark = document.getElementById('darkTheme');
    if (premium) premium.addEventListener('change', function() { applyTheme('premiumTheme'); });
    if (dark) dark.addEventListener('change', function() { applyTheme('darkTheme'); });
    
    // Add password field listeners
    const newPasswordInput = document.getElementById('settingsNewPassword');
    const confirmPasswordInput = document.getElementById('settingsConfirmPassword');
    
    if (newPasswordInput) {
      newPasswordInput.addEventListener('input', function() {
        const password = this.value;
        const strengthDiv = document.getElementById('settingsPasswordStrength');
        
        if (!password) {
          strengthDiv.innerHTML = '';
          return;
        }
        
        let strength = 0;
        let feedback = '';
        
        if (password.length >= 8) strength++;
        else feedback += '❌ At least 8 characters. ';
        
        if (/[A-Z]/.test(password)) strength++;
        else feedback += '❌ At least one uppercase letter. ';
        
        if (/[a-z]/.test(password)) strength++;
        else feedback += '❌ At least one lowercase letter. ';
        
        if (/[0-9]/.test(password)) strength++;
        else feedback += '❌ At least one number. ';
        
        let color = 'danger';
        let text = 'Weak';
        if (strength >= 4) {
          color = 'success';
          text = 'Strong';
          feedback = '✅ Password is strong!';
        } else if (strength >= 3) {
          color = 'warning';
          text = 'Medium';
        }
        
        strengthDiv.innerHTML = `<span class="text-${color}"><strong>${text}:</strong> ${feedback}</span>`;
      });
    }
    
    if (confirmPasswordInput) {
      confirmPasswordInput.addEventListener('input', function() {
        const newPassword = (document.getElementById('settingsNewPassword') || {}).value;
        const confirmPassword = this.value;
        const matchDiv = document.getElementById('settingsPasswordMatch');
        
        if (!confirmPassword) {
          matchDiv.innerHTML = '';
          return;
        }
        
        if (newPassword === confirmPassword) {
          matchDiv.innerHTML = '<span class="text-success"><strong>✅ Passwords match!</strong></span>';
        } else {
          matchDiv.innerHTML = '<span class="text-danger"><strong>❌ Passwords do not match</strong></span>';
        }
      });
    }
  });
}
