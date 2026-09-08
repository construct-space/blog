/* Construct Blog — Theme System (from Construct Design System) */

var THEMES = [
  { id: 'vs-dark', name: 'Dark', mode: 'dark', bg: '#1e1e1e', fg: '#d4d4d4', muted: '#6b7280', accent: '#34C759', accentFg: '#ffffff' },
  { id: 'vs', name: 'Light', mode: 'light', bg: '#ffffff', fg: '#1e293b', muted: '#64748b', accent: '#34C759', accentFg: '#ffffff' },
  { id: 'synthwave-84', name: "Synthwave '84", mode: 'dark', bg: '#262335', fg: '#ffffff', muted: '#848bbd', accent: '#ff7edb', accentFg: '#000000' },
  { id: 'dracula', name: 'Dracula', mode: 'dark', bg: '#282a36', fg: '#f8f8f2', muted: '#6272a4', accent: '#bd93f9', accentFg: '#000000' },
  { id: 'one-dark', name: 'One Dark', mode: 'dark', bg: '#282c34', fg: '#abb2bf', muted: '#5c6370', accent: '#61afef', accentFg: '#000000' },
  { id: 'night-owl', name: 'Night Owl', mode: 'dark', bg: '#011627', fg: '#d6deeb', muted: '#637777', accent: '#82aaff', accentFg: '#000000' },
  { id: 'github-dark', name: 'GitHub Dark', mode: 'dark', bg: '#0d1117', fg: '#c9d1d9', muted: '#8b949e', accent: '#58a6ff', accentFg: '#000000' },
  { id: 'monokai', name: 'Monokai', mode: 'dark', bg: '#272822', fg: '#f8f8f2', muted: '#75715e', accent: '#f92672', accentFg: '#ffffff' },
  { id: 'nord', name: 'Nord', mode: 'dark', bg: '#2e3440', fg: '#d8dee9', muted: '#616e88', accent: '#88c0d0', accentFg: '#000000' },
  { id: 'cobalt2', name: 'Cobalt2', mode: 'dark', bg: '#193549', fg: '#ffffff', muted: '#0088ff', accent: '#ffc600', accentFg: '#000000' },
  { id: 'material', name: 'Material', mode: 'dark', bg: '#263238', fg: '#eeffff', muted: '#546e7a', accent: '#89ddff', accentFg: '#000000' },
  { id: 'tokyo-night', name: 'Tokyo Night', mode: 'dark', bg: '#1a1b26', fg: '#c0caf5', muted: '#565f89', accent: '#7aa2f7', accentFg: '#ffffff' },
  { id: 'hc-black', name: 'High Contrast', mode: 'dark', bg: '#000000', fg: '#ffffff', muted: '#808080', accent: '#ffff00', accentFg: '#000000' },
  { id: 'hc-light', name: 'HC Light', mode: 'light', bg: '#ffffff', fg: '#000000', muted: '#808080', accent: '#0000ff', accentFg: '#ffffff' },
];

function hexToRgb(hex) {
  var h = hex.replace('#', '');
  return [parseInt(h.substr(0,2),16), parseInt(h.substr(2,2),16), parseInt(h.substr(4,2),16)];
}

function rgbToHex(r, g, b) {
  return '#' + [r,g,b].map(function(x){ return Math.round(x).toString(16).padStart(2,'0'); }).join('');
}

function applyTheme(theme) {
  var root = document.documentElement;
  var isDark = theme.mode === 'dark';
  var rgb = hexToRgb(theme.bg);

  root.style.setProperty('--app-background', theme.bg);
  root.style.setProperty('--app-foreground', theme.fg);
  root.style.setProperty('--app-muted', theme.muted);
  root.style.setProperty('--app-accent', theme.accent);
  root.style.setProperty('--app-accent-foreground', theme.accentFg);

  if (isDark) {
    root.style.setProperty('--app-border', rgbToHex(Math.min(255,rgb[0]+30), Math.min(255,rgb[1]+30), Math.min(255,rgb[2]+30)));
    root.style.setProperty('--app-surface', rgbToHex(Math.min(255,rgb[0]+10), Math.min(255,rgb[1]+10), Math.min(255,rgb[2]+10)));
    root.style.setProperty('--app-card', rgbToHex(Math.min(255,rgb[0]+16), Math.min(255,rgb[1]+16), Math.min(255,rgb[2]+16)));
    root.style.setProperty('--app-input-bg', rgbToHex(Math.min(255,rgb[0]+24), Math.min(255,rgb[1]+24), Math.min(255,rgb[2]+24)));
  } else {
    root.style.setProperty('--app-border', rgbToHex(Math.max(0,rgb[0]-20), Math.max(0,rgb[1]-20), Math.max(0,rgb[2]-20)));
    root.style.setProperty('--app-surface', rgbToHex(Math.max(0,rgb[0]-5), Math.max(0,rgb[1]-5), Math.max(0,rgb[2]-5)));
    root.style.setProperty('--app-card', theme.bg);
    root.style.setProperty('--app-input-bg', rgbToHex(Math.max(0,rgb[0]-12), Math.max(0,rgb[1]-12), Math.max(0,rgb[2]-12)));
  }

  localStorage.setItem('construct-blog-theme', theme.id);

  var options = document.querySelectorAll('.theme-option');
  options.forEach(function(el) {
    el.classList.toggle('active', el.dataset.themeId === theme.id);
  });
}

function initTheme() {
  var saved = localStorage.getItem('construct-blog-theme');
  var theme = THEMES[0];
  if (saved) {
    for (var i = 0; i < THEMES.length; i++) {
      if (THEMES[i].id === saved) { theme = THEMES[i]; break; }
    }
  }
  applyTheme(theme);
}

function toggleThemePanel() {
  var panel = document.getElementById('theme-panel');
  if (panel) panel.classList.toggle('open');
}

function toggleUserMenu() {
  var menu = document.getElementById('user-menu');
  if (menu) menu.classList.toggle('open');
}

// Generate initials for avatar elements
function initAvatarInitials() {
  document.querySelectorAll('.sidebar-avatar-initial[data-name]').forEach(function(el) {
    var name = el.dataset.name || '';
    var parts = name.split(' ');
    el.textContent = parts.length > 1
      ? (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
      : name.charAt(0).toUpperCase();
  });
}

document.addEventListener('DOMContentLoaded', function() {
  initTheme();
  initAvatarInitials();

  // Close popovers on click outside
  document.addEventListener('click', function(e) {
    var panel = document.getElementById('theme-panel');
    if (panel && panel.classList.contains('open')) {
      if (!panel.contains(e.target) && !e.target.closest('[onclick*="toggleThemePanel"]')) {
        panel.classList.remove('open');
      }
    }
    var menu = document.getElementById('user-menu');
    if (menu && menu.classList.contains('open')) {
      if (!menu.contains(e.target) && !e.target.closest('[onclick*="toggleUserMenu"]')) {
        menu.classList.remove('open');
      }
    }
  });

  // Build theme options
  var panel = document.getElementById('theme-panel');
  if (panel) {
    var html = '';
    for (var i = 0; i < THEMES.length; i++) {
      var t = THEMES[i];
      html += '<button class="theme-option" data-theme-id="' + t.id + '" onclick="applyTheme(THEMES[' + i + '])">'
        + '<span class="theme-dot" style="background:' + t.bg + ';border-color:' + t.accent + '"></span>'
        + '<span>' + t.name + '</span>'
        + '</button>';
    }
    panel.innerHTML = html;
    var saved = localStorage.getItem('construct-blog-theme') || 'vs-dark';
    panel.querySelectorAll('.theme-option').forEach(function(el) {
      if (el.dataset.themeId === saved) el.classList.add('active');
    });
  }
});
