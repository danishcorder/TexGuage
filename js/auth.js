/**
 * TexGauge IQ - Authentication System
 * 
 * Provides login, logout, session management, and route protection
 * using browser localStorage only.
 * 
 * User Roles:
 *   - admin:     Full access to all pages
 *   - supervisor: Dashboard & Reports access
 *   - operator:   Only operator-related pages
 */

const AUTH_KEY = 'texgauge_auth';

// Pre-defined user credentials (stored only in this JS file)
const USERS = [
  { username: 'admin',     password: 'admin123',   role: 'admin',     displayName: 'Admin' },
  { username: 'supervisor', password: 'sup123',     role: 'supervisor', displayName: 'Supervisor' },
  { username: 'operator',   password: 'op123',      role: 'operator',   displayName: 'Operator' }
];

// Route permissions: which roles can access each page (by path fragment)
const ROUTE_PERMISSIONS = [
  { path: 'index.html',       roles: ['admin', 'supervisor'] },
  { path: 'pages/carding.html',  roles: ['admin', 'operator'] },
  { path: 'pages/breaker.html',  roles: ['admin', 'operator'] },
  { path: 'pages/finisher.html', roles: ['admin', 'operator'] },
  { path: 'pages/simplex.html',  roles: ['admin', 'operator'] }
];

/**
 * Get the current auth session from localStorage.
 * Returns null if not logged in.
 */
function getAuth() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data && data.isLoggedIn && data.username && data.role) {
      return data;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Attempt to log in with provided credentials.
 * Returns { success: boolean, role?: string, message?: string }
 */
function login(username, password) {
  const user = USERS.find(
    u => u.username === username.trim().toLowerCase() && u.password === password
  );
  if (!user) {
    return { success: false, message: 'Invalid username or password.' };
  }

  const session = {
    username: user.username,
    role: user.role,
    displayName: user.displayName,
    isLoggedIn: true,
    loginTime: new Date().toISOString()
  };

  localStorage.setItem(AUTH_KEY, JSON.stringify(session));
  return { success: true, role: user.role };
}

/**
 * Log out: clear session and redirect to login page.
 */
function logout() {
  localStorage.removeItem(AUTH_KEY);
  window.location.href = getLoginPagePath();
}

/**
 * Get the relative path to login.html from the current page.
 */
function getLoginPagePath() {
  const path = window.location.pathname;
  if (path.includes('/pages/')) {
    return '../login.html';
  }
  return 'login.html';
}

/**
 * Get the relative path prefix for resource references from the current page.
 */
function getRelativePrefix() {
  const path = window.location.pathname;
  if (path.includes('/pages/')) {
    return '../';
  }
  return '';
}

/**
 * Check if the current user can access the current page.
 * If not logged in, redirect to login page.
 * If logged in but no permission, redirect to appropriate landing.
 */
function checkAccess() {
  const auth = getAuth();
  
  // Not logged in — redirect to login
  if (!auth) {
    window.location.href = getLoginPagePath();
    return;
  }

  // Get current page filename
  const currentPath = window.location.pathname;
  const filename = currentPath.split('/').pop() || 'index.html';
  
  // For index.html or root, use 'index.html'
  const pageKey = currentPath.includes('/pages/') 
    ? 'pages/' + filename 
    : filename;

  // Admin can access everything
  if (auth.role === 'admin') {
    return;
  }

  // Check route permissions
  const route = ROUTE_PERMISSIONS.find(r => r.path === pageKey || r.path.endsWith(filename));
  if (route && route.roles.includes(auth.role)) {
    return;
  }

  // No permission — redirect to appropriate landing page
  redirectToLanding(auth.role);
}

/**
 * Redirect user to their role-appropriate landing page.
 */
function redirectToLanding(role) {
  const prefix = getRelativePrefix();
  switch (role) {
    case 'admin':
      window.location.href = prefix + 'index.html';
      break;
    case 'supervisor':
      window.location.href = prefix + 'index.html';
      break;
    case 'operator':
      window.location.href = prefix + 'pages/carding.html';
      break;
    default:
      window.location.href = prefix + 'login.html';
  }
}

/**
 * Get the landing page URL for a given role (after login).
 */
function getLandingPage(role) {
  switch (role) {
    case 'admin':
      return 'index.html';
    case 'supervisor':
      return 'index.html';
    case 'operator':
      return 'pages/carding.html';
    default:
      return 'login.html';
  }
}

/**
 * Auto-fill the operator name field from the logged-in user's display name.
 */
function fillOperatorFromLogin() {
  const opField = document.getElementById('operator');
  if (!opField) return;
  const auth = getAuth();
  if (auth && auth.displayName) {
    opField.value = auth.displayName;
  }
}

/**
 * Create and append a logout button to the sidebar.
 * Must be called after the sidebar DOM is ready.
 */
function addLogoutButtonToSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  // Don't add duplicate
  if (document.getElementById('logoutBtn')) return;

  const auth = getAuth();
  if (!auth) return;

  const logoutBtn = document.createElement('button');
  logoutBtn.id = 'logoutBtn';
  logoutBtn.textContent = '🚪 Logout (' + auth.displayName + ')';
  logoutBtn.style.cssText = `
    margin: 4px 14px 16px;
    padding: 10px 16px;
    background: rgba(210, 63, 63, 0.2);
    color: #d23f3f;
    border: 1px solid rgba(210, 63, 63, 0.3);
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.85rem;
    font-weight: 600;
    transition: all 0.25s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  `;
  logoutBtn.onmouseenter = function() {
    this.style.background = 'rgba(210, 63, 63, 0.35)';
  };
  logoutBtn.onmouseleave = function() {
    this.style.background = 'rgba(210, 63, 63, 0.2)';
  };
  logoutBtn.onclick = function() {
    if (confirm('Are you sure you want to log out?')) {
      logout();
    }
  };

  // Insert before theme toggle
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    sidebar.insertBefore(logoutBtn, themeToggle);
  } else {
    sidebar.appendChild(logoutBtn);
  }
}

/**
 * Initialize auth on any protected page:
 * 1. Check access / redirect if needed
 * 2. Add logout button after DOM ready
 */
function initAuth() {
  checkAccess();
  
  // Wait for DOM to be ready before adding logout button and filling operator
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      addLogoutButtonToSidebar();
      fillOperatorFromLogin();
    });
  } else {
    addLogoutButtonToSidebar();
    fillOperatorFromLogin();
  }
}

// Export for use in HTML
window.Auth = {
  login,
  logout,
  getAuth,
  checkAccess,
  initAuth,
  getLandingPage,
  redirectToLanding,
  addLogoutButtonToSidebar,
  USERS,
  ROUTE_PERMISSIONS
};