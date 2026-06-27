// ═══════════════════════════════════════════════════════
// KES UPDATES - ANALYTICS TRACKER
// Supabase se connect hoga - sab silently track karega
// ═══════════════════════════════════════════════════════

(function () {

  // ── Supabase Config (same as index.html) ──
  const SUPABASE_URL = 'https://jbyctjddlbyddzavmczg.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpieWN0amRkbGJ5ZGR6YXZtY3pnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzNzE2NzYsImV4cCI6MjA5Nzk0NzY3Nn0.klEa0-zSGbHZYA-fYiHYg4ceoL1PQ87gowGEbvVmhqU';

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

  // ── Timers ──
  const startTime = Date.now();
  let activeTime = 0;
  let lastActiveTime = Date.now();
  let isActive = true;
  let saved = false;

  // ═══════════════════════════════════════════════════════
  // 1. DEVICE DETECTION
  // ═══════════════════════════════════════════════════════

  function getDevice() {
    const ua = navigator.userAgent;
    if (/tablet|ipad|playbook|silk/i.test(ua)) return 'Tablet';
    if (/mobile|android|iphone|ipod|blackberry|opera mini|iemobile/i.test(ua)) return 'Mobile';
    return 'Desktop';
  }

  function getBrowser() {
    const ua = navigator.userAgent;
    if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
    if (ua.includes('Edg')) return 'Edge';
    if (ua.includes('OPR') || ua.includes('Opera')) return 'Opera';
    return 'Other';
  }

  function getOS() {
    const ua = navigator.userAgent;
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Mac')) return 'MacOS';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
    if (ua.includes('Linux')) return 'Linux';
    return 'Other';
  }

  function getNetwork() {
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (conn) return conn.effectiveType || conn.type || 'unknown';
    return 'unknown';
  }

  function isReturning() {
    const key = 'kes_visitor';
    const visited = localStorage.getItem(key);
    localStorage.setItem(key, '1');
    return !!visited;
  }

  // ═══════════════════════════════════════════════════════
  // 2. ACTIVE TIME TRACKING
  // ═══════════════════════════════════════════════════════

  function tickActive() {
    if (isActive) {
      activeTime += (Date.now() - lastActiveTime) / 1000;
    }
    lastActiveTime = Date.now();
  }

  // Tab visible/hidden
  document.addEventListener('visibilitychange', () => {
    tickActive();
    isActive = !document.hidden;
  });

  // Mouse/touch activity = active
  ['mousemove', 'keydown', 'touchstart', 'click', 'scroll'].forEach(evt => {
    document.addEventListener(evt, () => {
      if (!isActive) {
        isActive = true;
        lastActiveTime = Date.now();
      }
    }, { passive: true });
  });

  // Idle after 30 seconds of no activity
  let idleTimer;
  function resetIdle() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      tickActive();
      isActive = false;
    }, 30000);
  }

  ['mousemove', 'keydown', 'touchstart', 'click', 'scroll'].forEach(evt => {
    document.addEventListener(evt, resetIdle, { passive: true });
  });

  // ═══════════════════════════════════════════════════════
  // 3. SCROLL DEPTH TRACKING
  // ═══════════════════════════════════════════════════════

  window.addEventListener('scroll', () => {
    const scrolled = window.scrollY + window.innerHeight;
    const total = document.documentElement.scrollHeight;
    const depth = Math.round((scrolled / total) * 100);
    if (depth > session.scroll_depth) {
      session.scroll_depth = Math.min(depth, 100);
    }
  }, { passive: true });

  // ═══════════════════════════════════════════════════════
  // 4. CLICK TRACKING
  // ═══════════════════════════════════════════════════════

  document.addEventListener('click', (e) => {
    const el = e.target.closest('a, button, [onclick]');
    if (!el) return;

    let label = '';

    if (el.tagName === 'A') {
      label = el.innerText.trim().substring(0, 60) || el.getAttribute('href') || 'link';
    } else if (el.tagName === 'BUTTON') {
      label = el.innerText.trim().substring(0, 60) || 'button';
    } else {
      label = el.innerText.trim().substring(0, 60) || 'element';
    }

    // Duplicates avoid karo — same label 3 se zyada baar nahi
    const existing = session.clicks.filter(c => c.label === label).length;
    if (existing < 3) {
      session.clicks.push({
        label: label,
        time: Math.round((Date.now() - startTime) / 1000)
      });
    }
  });

  // ═══════════════════════════════════════════════════════
  // 5. SECTION VISIBILITY TRACKING
  // ═══════════════════════════════════════════════════════

  const sectionIds = [
    'notices', 'student', 'academic', 'exam-countdown',
    'upcoming-events', 'papers', 'tools-link', 'erp',
    'library', 'college-details', 'collab', 'about',
    'our-policy', 'feedback'
  ];

  const sectionTimes = {};

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const id = entry.target.id;
        if (entry.isIntersecting) {
          sectionTimes[id] = { start: Date.now() };
          if (!session.sections_seen.find(s => s.id === id)) {
            session.sections_seen.push({ id: id, time_seconds: 0 });
          }
        } else {
          if (sectionTimes[id] && sectionTimes[id].start) {
            const spent = Math.round((Date.now() - sectionTimes[id].start) / 1000);
            const sec = session.sections_seen.find(s => s.id === id);
            if (sec) sec.time_seconds += spent;
            sectionTimes[id].start = null;
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
        const q = searchInput.value.trim();
        if (q.length > 1 && !session.search_queries.includes(q)) {
          session.search_queries.push(q);
        }
      }, 800);
    });
  }

  // ═══════════════════════════════════════════════════════
  // 7. SAVE TO SUPABASE
  // ═══════════════════════════════════════════════════════

  async function saveToSupabase() {
    if (saved) return;
    saved = true;

    tickActive();

    session.active_time_seconds = Math.round(activeTime);
    session.total_time_seconds = Math.round((Date.now() - startTime) / 1000);
    session.theme_used = localStorage.getItem('theme') || 'light';

    // Section times finalize karo
    sectionIds.forEach(id => {
      if (sectionTimes[id] && sectionTimes[id].start) {
        const spent = Math.round((Date.now() - sectionTimes[id].start) / 1000);
        const sec = session.sections_seen.find(s => s.id === id);
        if (sec) sec.time_seconds += spent;
      }
    });

    try {
      await fetch(`${SUPABASE_URL}/rest/v1/analytics`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': 'Bearer ' + SUPABASE_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(session)
      });
    } catch (e) {
      // Silently fail — user ko kuch nahi dikhega
    }
  }

  // Page band hone pe save karo
  window.addEventListener('beforeunload', saveToSupabase);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) saveToSupabase();
  });

  // 3 minute baad bhi save karo (agar tab open hi rakha)
  setTimeout(saveToSupabase, 180000);

})();
