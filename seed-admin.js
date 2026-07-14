require('dotenv').config();
const https = require('https');

const FIREBASE_URL = process.env.FIREBASE_URL || 'https://cookieesandcakes-default-rtdb.firebaseio.com';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('Missing ADMIN_EMAIL or ADMIN_PASSWORD in .env');
  process.exit(1);
}

function firebaseRequest(urlPath, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const url = `${FIREBASE_URL}${urlPath}.json`;
    const parsedUrl = new URL(url);
    const postData = data ? JSON.stringify(data) : '';
    const options = {
      hostname: parsedUrl.hostname,
      port: 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    if (data) {
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }
    const req = https.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => { responseBody += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(responseBody ? JSON.parse(responseBody) : null);
          } catch (e) {
            resolve(responseBody);
          }
        } else {
          reject(new Error(`Firebase request failed with status: ${res.statusCode}. Body: ${responseBody}`));
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(postData);
    req.end();
  });
}

(async () => {
  try {
    const data = await firebaseRequest('/admins') || {};
    const existing = Object.entries(data).find(([, admin]) => admin.email && admin.email.toLowerCase() === ADMIN_EMAIL.toLowerCase());
    if (existing) {
      console.log('Admin account already exists:', ADMIN_EMAIL);
      process.exit(0);
    }

    const bcrypt = require('bcryptjs');
    const hashed = await bcrypt.hash(ADMIN_PASSWORD, 10);
    await firebaseRequest('/admins/default', 'PUT', {
      email: ADMIN_EMAIL,
      passwordHash: hashed,
      name: 'Administrator',
      role: 'admin',
      createdAt: Date.now()
    });
    console.log('Admin account created successfully:', ADMIN_EMAIL);
  } catch (err) {
    console.error('Failed to seed admin:', err.message);
    process.exit(1);
  }
})();
