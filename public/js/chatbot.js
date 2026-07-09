// chatbot.js - Self-injecting "Baker Bot" assistant for cookieesandcakes.
// One shared agent (POST /api/chat) powers every page. The conversation is
// persisted in localStorage so the single assistant remembers the user across
// all pages of the site.

(function () {
  const STORAGE_KEY = 'cnc_chat_history';
  const WIDGET_ID = 'cnc-chatbot-widget';

  if (document.getElementById(WIDGET_ID)) return; // avoid double injection

  // Brand palette (matches tailwind config in the pages)
  const COLOR = {
    primary: '#44281e',
    secondary: '#91494d',
    secondaryContainer: '#fea3a6',
    background: '#fff8f6',
    surface: '#fff8f6',
    surfaceContainerLow: '#fff1ec',
    surfaceContainerLowest: '#ffffff',
    outline: '#827470',
    onSurface: '#281811',
    onSurfaceVariant: '#504440'
  };

  const STYLE = `
  #${WIDGET_ID} * { box-sizing: border-box; font-family: 'Be Vietnam Pro', system-ui, sans-serif; }
  #${WIDGET_ID} .cnc-fab {
    position: fixed; right: 20px; bottom: 20px; z-index: 9999;
    width: 60px; height: 60px; border-radius: 9999px; border: none;
    background: ${COLOR.secondary}; color: #fff; cursor: pointer;
    box-shadow: 0 10px 30px rgba(93,62,51,0.35);
    display: flex; align-items: center; justify-content: center;
    transition: transform .2s ease, background .2s ease;
  }
  #${WIDGET_ID} .cnc-fab:hover { transform: scale(1.06); background: #7e3f43; }
  #${WIDGET_ID} .cnc-panel {
    position: fixed; right: 20px; bottom: 92px; z-index: 9999;
    width: 380px; max-width: calc(100vw - 32px); height: 560px; max-height: calc(100vh - 120px);
    background: ${COLOR.background}; border-radius: 18px; overflow: hidden;
    box-shadow: 0 20px 60px rgba(93,62,51,0.25);
    display: flex; flex-direction: column; border: 1px solid ${COLOR.outline}22;
    transform: translateY(12px) scale(.98); opacity: 0; pointer-events: none;
    transition: transform .22s ease, opacity .22s ease;
  }
  #${WIDGET_ID} .cnc-panel.open { transform: translateY(0) scale(1); opacity: 1; pointer-events: auto; }
  #${WIDGET_ID} .cnc-header {
    background: ${COLOR.primary}; color: #fff; padding: 16px 18px;
    display: flex; align-items: center; gap: 12px;
  }
  #${WIDGET_ID} .cnc-avatar {
    width: 40px; height: 40px; border-radius: 9999px; background: ${COLOR.secondaryContainer};
    color: ${COLOR.primary}; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  #${WIDGET_ID} .cnc-title { font-size: 15px; font-weight: 700; line-height: 1.1; }
  #${WIDGET_ID} .cnc-sub { font-size: 11px; opacity: .8; }
  #${WIDGET_ID} .cnc-close {
    margin-left: auto; background: transparent; border: none; color: #fff; cursor: pointer;
    width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center;
  }
  #${WIDGET_ID} .cnc-close:hover { background: rgba(255,255,255,.15); }
  #${WIDGET_ID} .cnc-body {
    flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px;
    background:
      radial-gradient(${COLOR.surfaceContainerLow} 0.5px, transparent 0.5px) 0 0 / 18px 18px,
      ${COLOR.background};
  }
  #${WIDGET_ID} .cnc-msg { max-width: 85%; padding: 10px 14px; border-radius: 14px; font-size: 14px; line-height: 1.45; white-space: pre-wrap; word-wrap: break-word; }
  #${WIDGET_ID} .cnc-bot { background: ${COLOR.surfaceContainerLow}; color: ${COLOR.onSurface}; align-self: flex-start; border-bottom-left-radius: 4px; }
  #${WIDGET_ID} .cnc-user { background: ${COLOR.secondary}; color: #fff; align-self: flex-end; border-bottom-right-radius: 4px; }
  #${WIDGET_ID} .cnc-typing { display: flex; gap: 4px; padding: 12px 14px; }
  #${WIDGET_ID} .cnc-typing span { width: 7px; height: 7px; border-radius: 9999px; background: ${COLOR.outline}; display: inline-block; animation: cnc-bounce 1s infinite ease-in-out; }
  #${WIDGET_ID} .cnc-typing span:nth-child(2) { animation-delay: .15s; }
  #${WIDGET_ID} .cnc-typing span:nth-child(3) { animation-delay: .3s; }
  @keyframes cnc-bounce { 0%, 80%, 100% { transform: translateY(0); opacity:.5 } 40% { transform: translateY(-5px); opacity:1 } }
  #${WIDGET_ID} .cnc-chips { display: flex; flex-wrap: wrap; gap: 8px; padding: 0 16px 8px; }
  #${WIDGET_ID} .cnc-chip {
    font-size: 12px; padding: 6px 12px; border-radius: 9999px; border: 1px solid ${COLOR.secondary}55;
    background: #fff; color: ${COLOR.secondary}; cursor: pointer; transition: background .15s;
  }
  #${WIDGET_ID} .cnc-chip:hover { background: ${COLOR.surfaceContainerLow}; }
  #${WIDGET_ID} .cnc-footer { padding: 12px; border-top: 1px solid ${COLOR.outline}22; display: flex; gap: 8px; background: ${COLOR.surface}; }
  #${WIDGET_ID} .cnc-input {
    flex: 1; resize: none; border: 1px solid ${COLOR.outline}; border-radius: 12px; padding: 10px 12px;
    font-size: 14px; color: ${COLOR.onSurface}; background: #fff; outline: none; max-height: 90px;
  }
  #${WIDGET_ID} .cnc-input:focus { border-color: ${COLOR.primary}; box-shadow: 0 0 0 1px ${COLOR.primary}; }
  #${WIDGET_ID} .cnc-send {
    width: 44px; height: 44px; flex-shrink: 0; border-radius: 12px; border: none; background: ${COLOR.secondary};
    color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background .15s;
  }
  #${WIDGET_ID} .cnc-send:hover { background: #7e3f43; }
  #${WIDGET_ID} .cnc-send:disabled { opacity: .6; cursor: default; }
  `;

  const SVG = {
    chat: '<svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C6.48 3 2 6.94 2 11.5c0 2.3 1.16 4.36 3.04 5.86L4 21l4.2-2.1c.98.27 2.02.42 3.1.42 5.52 0 10-3.94 10-8.82S17.52 3 12 3z"/></svg>',
    close: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18.3 5.71 12 12.01l-6.3-6.3-1.4 1.41 6.29 6.3-6.3 6.29 1.41 1.41 6.3-6.3 6.29 6.3 1.41-1.41-6.3-6.29 6.3-6.3z"/></svg>',
    send: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M3.4 20.4 21 12 3.4 3.6 3 10l12 2-12 2z"/></svg>',
    bot: '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a2 2 0 0 1 2 2v1h3a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3h3V4a2 2 0 0 1 2-2zm-4 8a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm8 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM12 14a3 3 0 0 0-3 3h6a3 3 0 0 0-3-3z"/></svg>'
  };

  function loadHistory() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch (e) { return []; }
  }
  function saveHistory(h) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(h.slice(-40))); } catch (e) {}
  }

  async function callAgent(message, history) {
    if (window.App && typeof window.App.fetchAPI === 'function') {
      return window.App.fetchAPI('/api/chat', { method: 'POST', body: { message, history } });
    }
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  function init() {
    const styleEl = document.createElement('style');
    styleEl.textContent = STYLE;
    document.head.appendChild(styleEl);

    const root = document.createElement('div');
    root.id = WIDGET_ID;
    root.innerHTML = `
      <button class="cnc-fab" aria-label="Open chat assistant">${SVG.chat}</button>
      <div class="cnc-panel" role="dialog" aria-label="Baker Bot assistant">
        <div class="cnc-header">
          <div class="cnc-avatar">${SVG.bot}</div>
          <div>
            <div class="cnc-title">Baker Bot</div>
            <div class="cnc-sub">Your sweet assistant · online</div>
          </div>
          <button class="cnc-close" aria-label="Close chat">${SVG.close}</button>
        </div>
        <div class="cnc-body"></div>
        <div class="cnc-chips">
          <span class="cnc-chip">Recommend a treat</span>
          <span class="cnc-chip">Store hours</span>
          <span class="cnc-chip">Track my order</span>
          <span class="cnc-chip">Vegan options</span>
        </div>
        <form class="cnc-footer">
          <textarea class="cnc-input" rows="1" placeholder="Ask Baker Bot anything…" required></textarea>
          <button class="cnc-send" type="submit" aria-label="Send message">${SVG.send}</button>
        </form>
      </div>
    `;
    document.body.appendChild(root);

    const fab = root.querySelector('.cnc-fab');
    const panel = root.querySelector('.cnc-panel');
    const body = root.querySelector('.cnc-body');
    const form = root.querySelector('.cnc-footer');
    const input = root.querySelector('.cnc-input');
    const closeBtn = root.querySelector('.cnc-close');
    const chips = root.querySelectorAll('.cnc-chip');

    let history = loadHistory();

    function appendMessage(role, text) {
      const el = document.createElement('div');
      el.className = 'cnc-msg ' + (role === 'user' ? 'cnc-user' : 'cnc-bot');
      el.textContent = text;
      body.appendChild(el);
      body.scrollTop = body.scrollHeight;
      return el;
    }

    function renderHistory() {
      body.innerHTML = '';
      if (history.length === 0) {
        appendMessage('bot', "Hi! I'm Baker Bot 🍪 your assistant at cookieesandcakes. Ask me for treat recommendations, store hours, or help with your order!");
      } else {
        history.forEach((m) => appendMessage(m.role, m.content));
      }
    }

    function addToHistory(role, text) {
      history.push({ role, content: text });
      saveHistory(history);
    }

    function showTyping() {
      const el = document.createElement('div');
      el.className = 'cnc-msg cnc-bot cnc-typing';
      el.innerHTML = '<span></span><span></span><span></span>';
      body.appendChild(el);
      body.scrollTop = body.scrollHeight;
      return el;
    }

    async function send(text) {
      const message = (text || '').trim();
      if (!message) return;
      input.value = '';
      input.style.height = 'auto';
      appendMessage('user', message);
      addToHistory('user', message);

      const typing = showTyping();
      try {
        const data = await callAgent(message, history.slice(-10).map((m) => ({ role: m.role, content: m.content })));
        typing.remove();
        const reply = data.reply || "Sorry, I couldn't process that. Please try again.";
        appendMessage('bot', reply);
        addToHistory('assistant', reply);
      } catch (err) {
        typing.remove();
        appendMessage('bot', err.message || 'Something went wrong. Please try again.');
      }
    }

    fab.addEventListener('click', () => {
      panel.classList.add('open');
      fab.style.display = 'none';
      input.focus();
    });
    closeBtn.addEventListener('click', () => {
      panel.classList.remove('open');
      fab.style.display = 'flex';
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      send(input.value);
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        send(input.value);
      }
    });
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 90) + 'px';
    });
    chips.forEach((chip) => {
      chip.addEventListener('click', () => send(chip.textContent));
    });

    renderHistory();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
