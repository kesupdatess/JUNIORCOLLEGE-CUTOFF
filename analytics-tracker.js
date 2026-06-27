// KES Analytics Tracker - FIXED VERSION
const SUPABASE_URL = "https://jbyctjddlbyddzavmczg.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpieWN0amRkbGJ5ZGR6YXZtY3pnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzNzE2NzYsImV4cCI6MjA5Nzk0NzY3Nn0.klEa0-zSGbHZYA-fYiHYg4ceoL1PQ87gowGEbvVmhqU";

console.log('📊 KES Analytics Tracker loading...');
console.log(' Supabase URL:', SUPABASE_URL);

const session = {
  page: window.location.pathname.split('/').pop() || 'index.html',
  referrer: (function(){
    try { return document.referrer ? new URL(document.referrer).hostname : 'Direct'; }
    catch(e) { return 'Direct'; }
  })(),
  device: getDevice(),
  browser: getBrowser(),
  os: getOS(),
  screen_size: window.screen.width + 'x' + window.screen.height,
  network_speed: getNetwork(),
  language: navigator.language || 'unknown',
  scroll_depth: 0,
  active_time_seconds: 0,
  total_time_seconds: 0,
  clicks: [],
  sections_seen: [],
  search_queries: [],
  is_returning: isReturning(),
  theme_used: localStorage.getItem('theme') || 'light'
};

function getDevice() {
  const ua = navigator.userAgent;
  if (/tablet|ipad|playbook|silk/i.test(ua)) return 'Tablet';
  if (/Mobile|Android|iP(hone|od)|IEMobile|Opera Mini/i.test(ua)) return 'Mobile';
  return 'Desktop';
}

function getBrowser() {
  const ua = navigator.userAgent;
  if (ua.indexOf("Edg") > -1) return 'Edge';
  if (ua.indexOf("Chrome") > -1) return 'Chrome';
  if (ua.indexOf("Safari") > -1) return 'Safari';
  if (ua.indexOf("Firefox") > -1) return 'Firefox';
  if (ua.indexOf("MSIE") > -1 || ua.indexOf("Trident") > -1) return 'Internet Explorer';
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

// Time tracking
let activeSeconds = 0;
let totalSeconds = 0;
let isActive = !document.hidden;
let idleTimer;

setInterval(() => {
  totalSeconds++;
  if (isActive) activeSeconds++;
}, 1000);

document.addEventListener('visibilitychange', () => {
  isActive = !document.hidden;
});

function resetIdle() {
  isActive = true;
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => { isActive = false; }, 30000);
}

['mousemove', 'keydown', 'touchstart', 'click', 'scroll'].forEach(evt => {
  document.addEventListener(evt, resetIdle, { passive: true });
});
resetIdle();

// Scroll tracking
window.addEventListener('scroll', () => {
  const scrollTop = window.scrollY;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  if (docHeight > 0) {
    const scrollPercent = Math.round((scrollTop / docHeight) * 100);
    if (scrollPercent > session.scroll_depth) session.scroll_depth = scrollPercent;
  }
}, { passive: true });

// Click tracking
document.addEventListener('click', (e) => {
  const target = e.target.closest('a, button, [onclick]');
  if (target) {
    let label = target.textContent.trim().substring(0, 50);
    if (!label && target.id) label = '#' + target.id;
    if (!label && target.className) label = '.' + target.className.split(' ')[0];
    if (label) {
      session.clicks.push({ label: label, time: new Date().toISOString() });
    }
  }
});

// Save to Supabase - FIXED
async function saveToSupabase() {
  session.active_time_seconds = activeSeconds;
  session.total_time_seconds = totalSeconds;
  session.timestamp = new Date().toISOString();

  const url = SUPABASE_URL + '/rest/v1/analytics';
  console.log('📤 Sending to:', url);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(session)
    });
    
    if (res.ok) {
      console.log('✅ Analytics saved:', res.status);
    } else {
      console.error('❌ Save failed:', res.status, await res.text());
    }
  } catch (e) {
    console.error('❌ Save error:', e);
  }
}

// Save on page leave
window.addEventListener('beforeunload', saveToSupabase);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) saveToSupabase();
});

// Save every 60 seconds
setInterval(saveToSupabase, 60000);

// Initial save after 5 seconds
setTimeout(saveToSupabase, 5000);

console.log(' KES Analytics Tracker loaded successfully!');
