(function () {
  'use strict';

  const domain = window.STREAM_DOMAIN || location.hostname;
  const protocol = location.protocol === 'https:' ? 'https' : 'http';
  const wsProtocol = location.protocol === 'https:' ? 'wss' : 'ws';

  const HLS_URL = `${protocol}://${domain}/hls/stream.m3u8`;
  const CHAT_URL = `${wsProtocol}://${domain}/chat`;
  const STATUS_URL = `${protocol}://${domain}/api/status`;

  // ── Player ─────────────────────────────────────────────────────────────────

  const offlineMsg = document.getElementById('offline-msg');
  let player = null;
  let isLive = false;

  function initPlayer() {
    if (player) return;

    player = videojs('player', {
      techOrder: ['html5'],
      html5: { hls: { overrideNative: true } },
      fluid: true,
      controls: true,
      autoplay: true,
      muted: true, // required for autoplay in most browsers
    });

    if (Hls.isSupported()) {
      const hls = new Hls({ lowLatencyMode: true });
      hls.loadSource(HLS_URL);
      hls.attachMedia(player.tech(true).el());
    } else if (player.canPlayType('application/vnd.apple.mpegurl')) {
      player.src({ src: HLS_URL, type: 'application/vnd.apple.mpegurl' });
    }
  }

  function destroyPlayer() {
    if (!player) return;
    player.dispose();
    player = null;

    // Re-create the video element that videojs removed
    const section = document.querySelector('.player-section');
    const video = document.createElement('video');
    video.id = 'player';
    video.className = 'video-js vjs-default-skin vjs-big-play-centered';
    video.setAttribute('controls', '');
    video.setAttribute('preload', 'auto');
    video.setAttribute('playsinline', '');
    section.insertBefore(video, offlineMsg);
  }

  // ── Status polling ─────────────────────────────────────────────────────────

  const badge = document.getElementById('status-badge');

  function setLive(live) {
    if (live === isLive) return;
    isLive = live;

    if (live) {
      badge.textContent = '● Live';
      badge.className = 'badge live';
      offlineMsg.classList.remove('visible');
      initPlayer();
    } else {
      badge.textContent = 'Offline';
      badge.className = 'badge offline';
      offlineMsg.classList.add('visible');
      destroyPlayer();
    }
  }

  async function pollStatus() {
    try {
      const res = await fetch(STATUS_URL);
      if (res.ok) {
        const { live } = await res.json();
        setLive(live);
      }
    } catch (_) {
      // network error — leave current state
    }
  }

  pollStatus();
  setInterval(pollStatus, 5000);

  // ── Chat ───────────────────────────────────────────────────────────────────

  const messagesEl = document.getElementById('chat-messages');
  const form = document.getElementById('chat-form');
  const usernameInput = document.getElementById('chat-username');
  const messageInput = document.getElementById('chat-message');

  let ws = null;
  let wsReconnectTimer = null;

  function appendMessage({ user, message, timestamp }, isSystem = false) {
    const el = document.createElement('div');
    el.className = isSystem ? 'chat-message system' : 'chat-message';

    if (!isSystem) {
      const time = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      el.innerHTML =
        `<span class="username">${escapeHtml(user)}</span>` +
        escapeHtml(message) +
        `<span class="ts">${time}</span>`;
    } else {
      el.textContent = message;
    }

    messagesEl.appendChild(el);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function connectChat() {
    if (ws) return;

    ws = new WebSocket(CHAT_URL);

    ws.addEventListener('open', () => {
      appendMessage({ message: 'Connected to chat.' }, true);
    });

    ws.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        appendMessage(data);
      } catch (_) {}
    });

    ws.addEventListener('close', () => {
      ws = null;
      appendMessage({ message: 'Disconnected. Reconnecting in 5s...' }, true);
      wsReconnectTimer = setTimeout(connectChat, 5000);
    });

    ws.addEventListener('error', () => {
      ws.close();
    });
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const message = messageInput.value.trim();
    if (!message || !ws || ws.readyState !== WebSocket.OPEN) return;

    const user = usernameInput.value.trim() || 'anonymous';
    ws.send(JSON.stringify({ user, message }));
    messageInput.value = '';
  });

  connectChat();
})();
