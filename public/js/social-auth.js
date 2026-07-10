// social-auth.js - wires Google & Apple sign-in buttons to the backend session
window.SocialAuth = {
  config: null,

  async init() {
    try {
      this.config = await window.App.fetchAPI('/api/auth/social-config');
    } catch (e) {
      this.config = { googleClientId: '', appleClientId: '' };
    }
    this.setup();
  },

  setup() {
    const googleBtn = document.getElementById('google-signin-btn');
    const appleBtn = document.getElementById('apple-signin-btn');

    if (this.config.googleClientId && googleBtn) {
      this.setupGoogle(googleBtn);
    } else if (googleBtn) {
      googleBtn.addEventListener('click', () => this.notConfigured('Google'));
    }

    if (this.config.appleClientId && appleBtn) {
      this.setupApple(appleBtn);
    } else if (appleBtn) {
      appleBtn.addEventListener('click', () => this.notConfigured('Apple'));
    }
  },

  setupGoogle(btn) {
    if (!window.google || !window.google.accounts) {
      setTimeout(() => this.setupGoogle(btn), 200);
      return;
    }
    window.google.accounts.id.initialize({
      client_id: this.config.googleClientId,
      callback: (resp) => this.handleGoogle(resp)
    });
    btn.addEventListener('click', () => window.google.accounts.id.prompt());
  },

  async handleGoogle(resp) {
    if (!resp.credential) return;
    const payload = this.parseJwt(resp.credential);
    this.sendToBackend('google', resp.credential, {
      email: payload.email,
      name: payload.name
    });
  },

  setupApple(btn) {
    if (!window.AppleID || !window.AppleID.auth) {
      setTimeout(() => this.setupApple(btn), 200);
      return;
    }
    window.AppleID.auth.init({
      clientId: this.config.appleClientId,
      scope: 'name email',
      redirectURI: this.config.appleRedirectUri,
      usePopup: true
    });
    btn.addEventListener('click', () => this.handleApple());
  },

  async handleApple() {
    try {
      const data = await window.AppleID.auth.signIn();
      const auth = data.authorization || {};
      const idToken = auth.id_token;
      if (!idToken) throw new Error('No Apple identity token returned.');
      const payload = this.parseJwt(idToken);
      let name = payload.email ? payload.email.split('@')[0] : '';
      if (data.user && data.user.name) {
        const n = data.user.name;
        name = `${n.firstName || ''} ${n.lastName || ''}`.trim() || name;
      }
      this.sendToBackend('apple', idToken, {
        email: payload.email,
        name
      });
    } catch (e) {
      alert('Apple sign-in was cancelled or failed.');
    }
  },

  async sendToBackend(provider, idToken, user) {
    const btn = document.getElementById(`${provider}-signin-btn`);
    if (btn) { btn.disabled = true; btn.style.opacity = '0.6'; }
    try {
      await window.App.fetchAPI('/api/auth/social', {
        method: 'POST',
        body: { provider, idToken, user }
      });
      window.location.href = '/account.html';
    } catch (err) {
      alert(err.message || `${provider} sign-in failed.`);
      if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
    }
  },

  parseJwt(token) {
    try {
      const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const json = decodeURIComponent(
        atob(base64).split('').map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
      );
      return JSON.parse(json);
    } catch (e) {
      return {};
    }
  },

  notConfigured(provider) {
    alert(`${provider} sign-in is not configured yet. Add the OAuth client ID in the server .env file.`);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (window.App && typeof window.App.fetchAPI === 'function') {
    window.SocialAuth.init();
  }
});
