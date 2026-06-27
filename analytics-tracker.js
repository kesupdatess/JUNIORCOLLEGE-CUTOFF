// ═══════════════════════════════════════════════════════
// KES Updates Analytics Tracker
// ═══════════════════════════════════════════════════════

const SUPABASE_URL = "https://jbyctjddlbyddzavmczg.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpieWN0amRkbGJ5ZGR6YXZtY3pnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzNzE2NzYsImV4cCI6MjA5Nzk0NzY3Nn0.klEa0-zSGbHZYA-fYiHYg4ceoL1PQ87gowGEbvVmhqU";

// ── Session Data Store ──
const session = {
  page: window.location.pathname.split('/').pop() || 'index.html',
  referrer: document.referrer ? new URL(document.referrer).hostname : 'Direct',
  device: getDevice(),
  browser: getBrowser(),
  os: getOS(),
  screen_size: `${window.screen.width}x${window.screen.height}`,
  network_speed: getNetwork(),
  language: navigator.language || 'unknown',
  scroll_depth: 0,
  active_time_seconds: 0,
  total_time_seconds: 0,
  clicks: [],
  sections_seen: [],
  search_queries: [],
  is_returning: isReturning(),
  theme_used: localStorage.getItem('theme') || 'light',
  timestamp: new Date().toISOString()
};

// ═══════════════════════════════════════════════════════
// 1. DEVICE DETECTION
// ═══════════════════════════════════════════════════════

function getDevice() {
  const ua = navigator.userAgent;
  if (/tablet|ipad|playbook|silk/i.test(ua)) return 'Tablet';
  if (/Mobile|Android|iP(hone|od)|IEMobile|Opera Mini/i.test(ua)) return 'Mobile';
  return 'Desktop';
}

function getBrowser() {
  const ua = navigator.userAgent;
  if (ua.indexOf("Chrome") > -1) return 'Chrome';
  if (ua.indexOf("Safari") > -1) return 'Safari';
  if (ua.indexOf("Firefox") > -1) return 'Firefox';
  if (ua.indexOf("MSIE") > -1 || ua.indexOf("Trident") > -1) return 'Internet Explorer';
  if (ua.indexOf("Edge") > -1) return 'Edge';
  if (ua.indexOf("Opera") > -1 || ua.indexOf("OPR") > -1) return 'Opera';
  return 'Other';
}

function getOS() {
  const ua = navigator.userAgent;
  if (ua.indexOf("Win") > -1) return 'Windows';
  if (ua.indexOf("Mac") > -1) return 'macOS';
  if (ua.indexOf("Linux") > -1) return 'Linux';
  if (ua.indexOf("Android") > -1) return 'Android';
  if (ua.indexOf("like Mac") > -1) return 'iOS';
  return 'Other';
}

function getNetwork() {
  if (navigator.connection && navigator.connection.effectiveType) {
    return navigator.connection.effectiveType.toUpperCase();
  }
  return 'Unknown';
}

function isReturning() {
  const visited = localStorage.getItem('kes_visited');
  if (visited) return true;
  localStorage.setItem('kes_visited', 'true');
  return false;
}

// ═══════════════════════════════════════════════════════
// 2. ACTIVE TIME TRACKING
// ═══════════════════════════════════════════════════════

let activeSeconds = 0;
let totalSeconds = 0;
let isActive = !document.hidden;
let idleTimer;

function tickActive() {
  totalSeconds++;
  if (isActive) activeSeconds++;
}

setInterval(tickActive, 1000);

document.addEventListener('visibilitychange', () => {
  isActive = !document.hidden;
  if (document.hidden) {
    session.active_time_seconds = activeSeconds;
    session.total_time_seconds = totalSeconds;
    saveToSupabase();
  }
});

function resetIdle() {
  isActive = true;
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => { isActive = false; }, 30000); // 30 sec idle
}

['mousemove', 'keydown', 'touchstart', 'click', 'scroll'].forEach(evt => {
  document.addEventListener(evt, resetIdle, { passive: true });
});

resetIdle();

// ═══════════════════════════════════════════════════════
// 3. SCROLL DEPTH TRACKING
// ═══════════════════════════════════════════════════════

window.addEventListener('scroll', () => {
  const scrollTop = window.scrollY;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  const scrollPercent = Math.round((scrollTop / docHeight) * 100);
  if (scrollPercent > session.scroll_depth) {
    session.scroll_depth = scrollPercent;
  }
}, { passive: true });

// ═══════════════════════════════════════════════════════
// 4. CLICK TRACKING
// ═══════════════════════════════════════════════════════

document.addEventListener('click', (e) => {
  const target = e.target.closest('a, button, [onclick]');
  if (target) {
    let label = target.textContent.trim().substring(0, 50);
    if (!label && target.id) label = '#' + target.id;
    if (!label && target.className) label = '.' + target.className.split(' ')[0];
    if (label) {
      session.clicks.push({
        label: label,
        time: new Date().toISOString()
      });
    }
  }
});

// ═══════════════════════════════════════════════════════
// 5. SECTION VISIBILITY TRACKING
// ═══════════════════════════════════════════════════════

const sectionIds = ['notices', 'erp', 'library', 'tools', 'cutoff', 'academic', 'events', 'fees', 'contact'];

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        if (!session.sections_seen.find(s => s.id === id)) {
          session.sections_seen.push({
            id: id,
            time_seconds: 0,
            start_time: Date.now()
          });
        }
      } else {
        const section = session.sections_seen.find(s => s.id === entry.target.id);
        if (section && section.start_time) {
          section.time_seconds += Math.round((Date.now() - section.start_time) / 1000);
          delete section.start_time;
        }
      }
    });
  }, { threshold: 0.3 });

  sectionIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) observer.observe(el);
  });
}

// ═══════════════════════════════════════════════════════
// 6. SEARCH QUERY TRACKING
// ═══════════════════════════════════════════════════════

const searchInput = document.getElementById('searchInput');
if (searchInput) {
  let searchTimer;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      const query = searchInput.value.trim();
      if (query.length > 2) {
        session.search_queries.push(query);
      }
    }, 1000);
  });
}

// ═══════════════════════════════════════════════════════
// 7. SAVE TO SUPABASE
// ═══════════════════════════════════════════════════════

async function saveToSupabase() {
  session.active_time_seconds = activeSeconds;
  session.total_time_seconds = totalSeconds;
  session.timestamp = new Date().toISOString();

  // Clean up sections_seen - remove start_time
  session.sections_seen = session.sections_seen.map(s => {
    const { start_time, ...rest } = s;
    return rest;
  });

  try {
    await fetch(`${SUPABASE_URL}/rest/v1/analytics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(session)
    });
    console.log('✅ Analytics saved to Supabase');
  } catch (e) {
    console.error('❌ Analytics save failed:', e);
  }
}

// Save when user leaves
window.addEventListener('beforeunload', saveToSupabase);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) saveToSupabase();
});

// Save every 3 minutes if page is open
setTimeout(saveToSupabase, 180000);

console.log('📊 KES Analytics Tracker loaded');
