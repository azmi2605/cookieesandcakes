require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const https = require('https');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const FIREBASE_URL = process.env.FIREBASE_URL || 'https://cookieesandcakes-default-rtdb.firebaseio.com';
const JWT_SECRET = process.env.JWT_SECRET || 'cookieesandcakes-jwt-secret-key-12345';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';

// Express Middleware
const corsOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true;
app.use(cors({
  origin: corsOrigins === true ? true : corsOrigins,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'cookieesandcakes-secret-key-12345',
  resave: false,
  saveUninitialized: true,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 1 day
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  }
}));

// Serve static frontend files from 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Firebase Realtime Database Utility Functions
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

    req.on('error', (err) => reject(err));
    if (data) req.write(postData);
    req.end();
  });
}

// 14 Signature Treats data to seed
const signatureTreats = {
  "classic-sea-salt-cookie": {
    id: "classic-sea-salt-cookie",
    name: "Classic Sea Salt Cookie",
    price: 4.50,
    description: "Our signature brown butter dough packed with 70% dark Belgian chocolate.",
    category: "cookies",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBuMuAVwanZHZJ1rX529XIvBWJ0wxW1XSIQZydxfWEc4yy8blPy0i8L6O_PetyUpJbXOzj5wOV6axDaSwychQFxlMnaRXtXX-wnCKXh9DiFTt5q8pcHvUF9YOvWiKGX6OET37meQMfY_nIbFl2D2TLDkmMjkHMIp8buIUOoT6_JQb1kwCy1qKcpGqy-tyHDTuSLG2-Z3S8slp9vnq05EEP5mmOpGS6bZ6yOwd9BFrBbBQ7LsgRncTS_LoB_JXCDB8Poy4PvmeWDmTk",
    unit: "1 piece",
    tags: ["Top Rated", "Vegan"]
  },
  "rose-velvet-cake": {
    id: "rose-velvet-cake",
    name: "Rose Velvet Cake",
    price: 38.00,
    description: "Delicate rose-infused sponge with velvety cream cheese frosting and botanical hints.",
    category: "cakes",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCf8DzJNlglJEmwA5HVCmfJLVkxnWrb0FkxBhFdHxxhlvlMXCI18BeWMv6b2hky6LT1kGa8Tx7_7jv4OaN3TiRZbQojzyhdAt8P4m11CW_V3wHpHlC8uReqsEjyCIqFToAooCgg368NGq445RQLC0iKaNDQx_8FNwUZ82C8KSqnieSvKcHZlRy7ddCrQoVO76LZYlgihxmbp0eD1Mybyp2-W2NePTkEWWKcahNzhq71He2skZWj9zT2AOTIs7eb4KJdy8BrwulnY7s",
    unit: "1 cake (8 servings)",
    tags: ["Botanical", "Best Seller"]
  },
  "almond-croissant": {
    id: "almond-croissant",
    name: "Almond Croissant",
    price: 5.75,
    description: "Twice-baked butter croissant filled with homemade almond frangipane.",
    category: "pastries",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCBvAeh04mY8NS5V2_BZ5E1XL1Pp9h5yRLT79JX7ikyJVZGufdWH71xsP-eqO1EBakT7mkxZ4A10OLBlNR9mYDi9IxOUCuDyi1WwbApCJDtej9KiUxYd7ga_Jc9AgNKgSqlxsxgz65U0Q5UTIuzUCqRP7mfPOxpx5g1wh2YaB-BmJ-7-OPH6O-m_twNH6rdagRk7ov2wwkzhhHPBDWE6m_CnSCSqNGju92Sz_AwhlFuShJ4MQET-RDqegNoSpZD_meZUtw3OIde7Lo",
    unit: "1 piece",
    tags: ["Classic", "Flaky"]
  },
  "artisan-macarons": {
    id: "artisan-macarons",
    name: "Artisan Macarons",
    price: 18.00,
    description: "Set of 6 seasonal macarons including Lavender Honey and Pistachio Cream.",
    category: "cookies",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDT2CkSvHsSQiUcKffe9H5NOpYnXnzQvFsHuEzaUp-KfWwaN6SvpSnOy2VqZrkT3GKQB2Q0HbWxvGMNr3qLSZFAXLgPK6uxO8sbYjpDJCHPWatQnwdAmXxR4PFLS2dFCwcX_e-dHVcY8zRQcJDqhXpSfRVwMpJR_Q9Hx_zqhZgAwHqVqV7jkCJnQcso1JJig4ZaVZ2zFwEWgTWJwlZYmibqDJiFxByR77KhW1vY78fiomTEZ05ZSSqxchNgTHz915r3Rp9f_GkDfPw",
    unit: "6 pieces",
    tags: ["Gluten-Free", "Colorful"]
  },
  "lemon-cloud-tart": {
    id: "lemon-cloud-tart",
    name: "Lemon Cloud Tart",
    price: 6.50,
    description: "Zesty lemon curd topped with perfectly toasted Italian meringue peaks.",
    category: "pastries",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuC7TknBoPzzRRpjg9zqAuNSqErwJecKb8PwLA_beQ4WhI6lAGFOqOyHzH5DMS_oqmLThJ3GYc5qOLOgIoJCXEefj865V2sYhJ6JH_sDHWaAnpEhxVvp9QA4MH983N4qMSJr2Odol2WL2mysrdqk1bYT4GRhEMH-C8vKizY52Bg9O7roUMvD3gKbu0PaJBOFWA46D_OpTqwO1Mp78GV73-8Jt-jXRV5fwnUvjkq5jPvp6ZJarCgK9y8PZbVQE3qTtz5OP5uhQrCFRWA",
    unit: "1 piece",
    tags: ["Tangy", "Toasted"]
  },
  "artisan-sourdough": {
    id: "artisan-sourdough",
    name: "Artisan Sourdough",
    price: 8.00,
    description: "Long-fermented traditional sourdough with a dark, crunchy crust and soft crumb.",
    category: "pastries",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBzJ0v6yfbVdLsvZKxxCQonY2DG9JMAw2gXkDqDrIw9ff7t3phxPcpbGyBKvCLO_sTRNihLdfhboQTYp_t72ed1ZbWlDskuwMVK2pR_Hg2cq__b0QyLvndNGyHRypxik27Bi1554anlqQ24BBrIXQjskGC83HTBr3YkWEFaha9QAHSEmP4THjvfOB2xlcef5NZNzp-hmh0G2NPkn8dS4DJd2K5LDmcDi8cdd4Qc2HDDwLrfcb32qFQC75vUUtxyt5xxH0FEGI-707U",
    unit: "1 loaf",
    tags: ["Organic", "Fermented"]
  },
  "salted-dark-chocolate": {
    id: "salted-dark-chocolate",
    name: "Salted Dark Chocolate Cookie",
    price: 4.50,
    description: "Thick, chewy, cracked surface showing molten dark chocolate chunks and flaky sea salt.",
    category: "cookies",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBUDnL_n4I27DQFrMK0svYIc_jS6-3fQYLIbXN0G3v_MMfo99z5-y40eI89w-cT43fErPmi0cU3vE9QWXPzvp2XlmDxEmmg6UCPEcv8hTeolVbOlyt8zjxGUDmzdsyEGFMQbe9sfvlHVuxoEI6t-bgXbIPjiO1k1zIlLwXa29Sd02Mq8ckhwf77AyZ-c_kI4UvTj_h1lgM2WUsDhNsSp1PMWDYcBdiod53sD-_zPK2nOXYkUFhIN8vzTdChe3TUM7lnJIo2o7ghhLs",
    unit: "1 piece",
    tags: ["House Special", "Popular", "Vegan"]
  },
  "double-truffle-signature-cake": {
    id: "double-truffle-signature-cake",
    name: "Double Truffle Signature Cake",
    price: 8.50,
    description: "Rich, dark chocolate layer cake with smooth ganache frosting, elegant truffles, and gold leaf.",
    category: "cakes",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCkX_LezzUXlakSRRO1Zw_V2q3HJXO7L3snqN4Qo7S-kAqXxRm-b0FkUjimdGMlSOfsNHfnC18n_g-EXi8DkIa2s_8FQX3ZMvgHapnBJB1RffVF-5jDcNj4Aa_K-hU7vn33JaklQCTlfkWti2yZzJgVQPxJo1TuTLTVixehO2n1Wy8RtP1bp5Cxv_OrkMUlPq_NIz-SaNJ36H8tlrwtGWXQfhbpIqRea5j6hJtkLJb2WfKpKBPIsjYTlO7GfTL83ZS7-TsxVySZEdw",
    unit: "1 slice",
    tags: ["House Special", "Decadent"]
  },
  "lemon-lavender-tart": {
    id: "lemon-lavender-tart",
    name: "Lemon Lavender Tart",
    price: 6.00,
    description: "Vibrant lemon lavender filling inside a perfectly crimped buttery crust.",
    category: "pastries",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDMDOnElAfjVet3hHzX26EDcm-Kuy8sfTOb2icY-p0Aw8c2-OcCXCXjzhYCjtk5OlpBA0P2PDsoyeXhNYpjsdfKupB7xwHLOwGCJhdCT42sT3YF-KpxPDmx1W5ggGDy5ZpFoYYNP7PQVDlAfIP-5yWLG5c8OVx2w6IjHA8ib3gylFz2WPofeHv68r-uV7tidJUxtlNOxprkvOJUPN3HsZLBOWVKdxlBxG5JTVhtUCvZaEnnhzuqQWAeKNK12a3izewhA-Zss-fm1DU",
    unit: "1 piece",
    tags: ["Seasonal", "Tangy"]
  },
  "honey-layer-cake": {
    id: "honey-layer-cake",
    name: "Honey Layer Cake",
    price: 8.50,
    description: "Tall, multi-layered honey cake coated in fine crumbs and raw honey drizzle.",
    category: "cakes",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBxEcRkFsSHYCMae1GYYqOF721YO3ZP4f_lgxKRcavpGUGMRdwN2eiSQlMRNwzwycRyYcbrRNNKQ6lhklu1fxV-7BJptlXXvU7bSPhWtVd_cFjeLAZs7hBQYFmjgZxAsd_zJYZ6haPAjNRNQdQYM3v4hOBxygbECvsQjzw-lDVTSLeGnzDl7uZTfb03gH47UNp6LgGDTCxBetktakgDYYM5P302p1GLVCQzRbDIjzd1OvBVNiCMFP1Bnj8O_o--bfOwHZVlkGZg75w",
    unit: "1 slice",
    tags: ["House Special"]
  },
  "pistachio-croissant": {
    id: "pistachio-croissant",
    name: "Pistachio Croissant",
    price: 5.25,
    description: "Golden-brown croissant with flaky layers and crushed green pistachio topping.",
    category: "pastries",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAiJ5DP9UefIRfB13g7Sp6JJooiItBhVKNuz53X6EbBsAarFPPMiXIA1QrT7owSdagydIjM2j3cJHqDhJWDnbhMgU_SDnduwBRZdFcLPj_fr0iIPmtgt0cxGF3FKaBQuNg8lwc7j-HMJUFb5eNSFORWpH3cTb26EV4eE2-w6EhS6lGVNnYqNwd0UsFXkS2Xa-UKkyoI5q38sXk1hgbZpU90geUOMUc_LDAF422uxyuF90BE7xsO_C5xbiXGBjMv0_MCANBRr0VdM-U",
    unit: "1 piece",
    tags: ["Flaky"]
  },
  "cinnamon-swirls": {
    id: "cinnamon-swirls",
    name: "Cinnamon Swirls",
    price: 5.25,
    description: "Freshly baked warm cinnamon rolls with generous dripping cream cheese glaze.",
    category: "pastries",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDwa4wMHw6WZqv54eegy8nyqBADnEfhz3MCy-fVOwYgH-QgFmeFPB1gnFRwFm6nhzILEo68ZAIoeRdSkqZbasXtfCEiMgqLLtS_XZ6Nsi1cRBD-IQZlccD-LsY4c11e-zUuOvVZGZ3Fv1s3Fdl3hIO03xbuuxe6S6aOppkt6jlwrmgt-0-bC64WqYJ_HGVrE2Zm6TngRs_-JQJZB4CxHN297aLoYblwwaD99b5pfGxF-Zkjwvuyw9l8jFno4y5rBXvfzbgaVVWATvQ",
    unit: "1 piece",
    tags: ["Limited", "Warm"]
  },
  "midnight-truffles": {
    id: "midnight-truffles",
    name: "Midnight Truffles",
    price: 12.00,
    description: "Rich dark chocolate truffles with a dusting of Tanzanian cocoa powder.",
    category: "cookies",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDMqBDVYWOEeXffcStsDTI003nr1hZoTC6fO9fUHLWOBlg6V3AlArMw3fJAvIgMrK6CKO_8EZtgyy1_84c_sina_BoRjnYeTCilv6KZb3cotvAzqJlJXoEut6Skarsj51HRvqwS25zVAX5zFiu29bROKfWhZLE-9rl0o1heGJtnqZuwz2AyiNwR2t6ziY0VdptT_ywMB0eprLjJG2d9B6FzUHwQP0e--OSR_GOVg3-0alqo7tJC-e_FH1FvbYEhsXVaqNF3gEMZBVc",
    unit: "Box of 4",
    tags: ["Chocolate", "Gourmet"]
  },
  "pistachio-dream": {
    id: "pistachio-dream",
    name: "Pistachio Dream",
    price: 6.95,
    description: "Delicate pistachio cake with light green sponge and roasted nut crumble.",
    category: "cakes",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAwd03U1w9LQ3wJlsRdXF3ZxZVXFLQ7TETVLKMIuOMNskncKKEhALORreXnIMEz8l4NuPQlZr9sgp1dIq0VfFXrpuz0IoCFFrv5YB1cwD3N3jkMMWhT3UUGIvJF029WwBlvAghSRVlZxPzNf8jwHaFOjs5wl6-NeEsxmk23VPOGJTpxIACfp-Gmi7RBEcSNLPa_RGOMmqctbeHlVdjHnnLTqzXiNegBFdiEeULmAEAMjAKveGfV3OrPz1buxGNOMuUQcFhoIyaExxI",
    unit: "1 slice",
    tags: ["House Special"]
  }
};

// Seed database on startup
async function seedDatabase() {
  try {
    console.log('Checking database products...');
    const currentProducts = await firebaseRequest('/products');

    // Seed signature products if none or incomplete
    if (!currentProducts || Object.keys(currentProducts).length < 5) {
      console.log('Seeding signature products into Firebase Realtime Database...');
      await firebaseRequest('/products', 'PUT', signatureTreats);
      console.log('Products successfully seeded!');
    } else {
      console.log('Products already populated in database. Skipping seed.');
    }
  } catch (err) {
    console.error('Error seeding database:', err.message);
  }
}
seedDatabase();

// --- REST API API ENDPOINTS ---

// 1. Authentication

// SIGN UP
app.post('/api/auth/signup', async (req, res) => {
  const { email, password, name, phone } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }

  try {
    // Check if user exists (sanitize email for Firebase keys by replacing '.' with ',')
    const sanitizedEmail = email.toLowerCase().replace(/\./g, ',');
    const existingUser = await firebaseRequest(`/users/${sanitizedEmail}`);
    if (existingUser) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = {
      email: email.toLowerCase(),
      name,
      phone: phone || '',
      passwordHash,
      createdAt: Date.now()
    };

    // Save user
    await firebaseRequest(`/users/${sanitizedEmail}`, 'PUT', newUser);

    // Save in session
    req.session.user = {
      email: newUser.email,
      name: newUser.name,
      userId: sanitizedEmail
    };

    res.status(201).json({ message: 'Registration successful', user: req.session.user });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed: ' + err.message });
  }
});

// LOGIN
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const sanitizedEmail = email.toLowerCase().replace(/\./g, ',');
    const user = await firebaseRequest(`/users/${sanitizedEmail}`);
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    // Set session
    req.session.user = {
      email: user.email,
      name: user.name,
      phone: user.phone || '',
      userId: sanitizedEmail
    };

    res.json({ message: 'Login successful', user: req.session.user });
  } catch (err) {
    res.status(500).json({ error: 'Login failed: ' + err.message });
  }
});

// SOCIAL AUTH CONFIG (public client ids for the frontend SDKs)
app.get('/api/auth/social-config', (req, res) => {
  res.json({
    googleClientId: process.env.GOOGLE_CLIENT_ID || '',
    appleClientId: process.env.APPLE_CLIENT_ID || '',
    appleRedirectUri: process.env.APPLE_REDIRECT_URI ||
      `${req.protocol}://${req.get('host')}/social-callback.html`
  });
});

// SOCIAL SIGN IN / SIGN UP (Google & Apple)
app.post('/api/auth/social', async (req, res) => {
  const { provider, idToken, user } = req.body;
  if (!provider || !user || !user.email) {
    return res.status(400).json({ error: 'Provider and user email are required.' });
  }

  try {
    if (provider === 'google') {
      const payload = await verifyGoogleIdToken(idToken);
      if (!payload || payload.email.toLowerCase() !== user.email.toLowerCase()) {
        return res.status(401).json({ error: 'Google sign-in could not be verified.' });
      }
    } else if (provider === 'apple') {
      const payload = decodeAppleIdToken(idToken);
      if (!payload || payload.email.toLowerCase() !== user.email.toLowerCase()) {
        return res.status(401).json({ error: 'Apple sign-in could not be verified.' });
      }
    } else {
      return res.status(400).json({ error: 'Unsupported sign-in provider.' });
    }

    const email = user.email.toLowerCase();
    const sanitizedEmail = email.replace(/\./g, ',');
    let existing = await firebaseRequest(`/users/${sanitizedEmail}`);

    if (!existing) {
      existing = {
        email,
        name: user.name || email.split('@')[0],
        phone: '',
        authProvider: provider,
        createdAt: Date.now()
      };
      await firebaseRequest(`/users/${sanitizedEmail}`, 'PUT', existing);
    } else {
      existing.authProvider = provider;
      await firebaseRequest(`/users/${sanitizedEmail}`, 'PUT', existing);
    }

    req.session.user = {
      email: existing.email,
      name: existing.name,
      phone: existing.phone || '',
      userId: sanitizedEmail,
      authProvider: provider
    };

    res.json({ message: 'Signed in successfully', user: req.session.user });
  } catch (err) {
    res.status(500).json({ error: 'Social sign-in failed: ' + err.message });
  }
});

// Verify a Google ID token via Google's tokeninfo endpoint (no SDK needed)
function verifyGoogleIdToken(idToken) {
  return new Promise((resolve) => {
    if (!idToken) return resolve(null);
    const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`;
    https.get(url, (resp) => {
      let body = '';
      resp.on('data', (chunk) => { body += chunk; });
      resp.on('end', () => {
        try {
          if (resp.statusCode !== 200) return resolve(null);
          resolve(JSON.parse(body));
        } catch (e) {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

// Decode an Apple identity token (payload validation; add signature check for production)
function decodeAppleIdToken(idToken) {
  try {
    const part = idToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(Buffer.from(part, 'base64').toString('utf8'));
    if (payload.iss !== 'https://appleid.apple.com') return null;
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

// GET CURRENT SESSION
app.get('/api/auth/session', (req, res) => {
  if (req.session.user) {
    res.json({ loggedIn: true, user: req.session.user });
  } else {
    res.json({ loggedIn: false });
  }
});

// Customer auth middleware: require login for order actions
function requireUser(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  return res.status(401).json({ error: 'Please log in to place your order.' });
}

// UPDATE PROFILE
app.post('/api/auth/profile', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Unauthorized. Please login.' });
  }

  const { name, phone } = req.body;
  const userId = req.session.user.userId;

  try {
    const user = await firebaseRequest(`/users/${userId}`);
    if (!user) {
      return res.status(404).json({ error: 'User profile not found.' });
    }

    user.name = name || user.name;
    user.phone = phone || user.phone;

    await firebaseRequest(`/users/${userId}`, 'PUT', user);

    // Update session
    req.session.user.name = user.name;
    req.session.user.phone = user.phone;

    res.json({ message: 'Profile updated successfully', user: req.session.user });
  } catch (err) {
    res.status(500).json({ error: 'Profile update failed: ' + err.message });
  }
});

// LOGOUT
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Could not log out.' });
    }
    res.json({ message: 'Logged out successfully' });
  });
});

// 2. Products API

// GET ALL PRODUCTS OR FILTER
app.get('/api/products', async (req, res) => {
  try {
    const productsData = await firebaseRequest('/products');
    if (!productsData) {
      return res.json([]);
    }

    let products = Object.keys(productsData).map(key => ({
      id: key,
      ...productsData[key]
    }));

    // Filter by Category
    const { category, search, sort } = req.query;
    if (category && category !== 'all') {
      products = products.filter(p => p.category.toLowerCase() === category.toLowerCase());
    }

    // Filter by Search Query
    if (search) {
      const q = search.toLowerCase();
      products = products.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      );
    }

    // Sort Products
    if (sort === 'low-high') {
      products.sort((a, b) => a.price - b.price);
    } else if (sort === 'high-low') {
      products.sort((a, b) => b.price - a.price);
    }

    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch products: ' + err.message });
  }
});

// GET PRODUCT DETAILS
app.get('/api/products/:id', async (req, res) => {
  const productId = req.params.id;
  try {
    const product = await firebaseRequest(`/products/${productId}`);
    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }
    res.json({ id: productId, ...product });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch product details: ' + err.message });
  }
});

// 3. Cart Management

// GET CART ITEMS
app.get('/api/cart', requireUser, async (req, res) => {
  const userId = req.session.user.userId;
  try {
    const cart = await firebaseRequest(`/carts/${userId}`) || {};
    res.json(cart);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load cart: ' + err.message });
  }
});

// ADD TO CART
app.post('/api/cart', requireUser, async (req, res) => {
  const { productId, quantity, personalization } = req.body;
  if (!productId) {
    return res.status(400).json({ error: 'Product ID is required.' });
  }

  const qty = parseInt(quantity) || 1;
  const note = personalization || '';
  const userId = req.session.user.userId;

  try {
    const product = await firebaseRequest(`/products/${productId}`);
    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    const cart = await firebaseRequest(`/carts/${userId}`) || {};

    if (cart[productId]) {
      cart[productId].quantity += qty;
      if (note) cart[productId].personalization = note;
    } else {
      cart[productId] = {
        productId,
        name: product.name,
        price: product.price,
        image: product.image,
        unit: product.unit,
        quantity: qty,
        personalization: note
      };
    }

    await firebaseRequest(`/carts/${userId}`, 'PUT', cart);
    res.json(cart);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add item to cart: ' + err.message });
  }
});

// UPDATE CART ITEM QUANTITY/NOTE
app.post('/api/cart/update', requireUser, async (req, res) => {
  const { productId, quantity, personalization } = req.body;
  if (!productId) {
    return res.status(400).json({ error: 'Product ID is required.' });
  }

  const qty = parseInt(quantity);
  const userId = req.session.user.userId;

  try {
    const cart = await firebaseRequest(`/carts/${userId}`) || {};

    if (cart[productId]) {
      if (qty <= 0) {
        delete cart[productId];
      } else {
        cart[productId].quantity = qty;
        if (personalization !== undefined) {
          cart[productId].personalization = personalization;
        }
      }
      await firebaseRequest(`/carts/${userId}`, 'PUT', cart);
    }
    res.json(cart);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update cart: ' + err.message });
  }
});

// DELETE FROM CART
app.post('/api/cart/delete', requireUser, async (req, res) => {
  const { productId } = req.body;
  const userId = req.session.user.userId;

  try {
    const cart = await firebaseRequest(`/carts/${userId}`) || {};
    delete cart[productId];
    await firebaseRequest(`/carts/${userId}`, 'PUT', cart);
    res.json(cart);
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete cart item: ' + err.message });
  }
});

// 4. Wishlist Management

// GET WISHLIST
app.get('/api/wishlist', requireUser, async (req, res) => {
  const userId = req.session.user.userId;
  try {
    const wishlist = await firebaseRequest(`/wishlists/${userId}`) || {};
    res.json(wishlist);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load wishlist: ' + err.message });
  }
});

// TOGGLE WISHLIST ITEM
app.post('/api/wishlist/toggle', requireUser, async (req, res) => {
  const { productId } = req.body;
  if (!productId) {
    return res.status(400).json({ error: 'Product ID is required.' });
  }
  const userId = req.session.user.userId;

  try {
    const wishlist = await firebaseRequest(`/wishlists/${userId}`) || {};

    if (wishlist[productId]) {
      delete wishlist[productId];
    } else {
      const product = await firebaseRequest(`/products/${productId}`);
      if (!product) {
        return res.status(404).json({ error: 'Product not found.' });
      }
      wishlist[productId] = {
        productId: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        description: product.description
      };
    }

    await firebaseRequest(`/wishlists/${userId}`, 'PUT', wishlist);
    res.json({ wishlist, status: Object.keys(wishlist).includes(productId) ? 'added' : 'removed' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle wishlist item: ' + err.message });
  }
});

// TOGGLE WISHLIST ITEM
app.post('/api/wishlist/toggle', async (req, res) => {
  const { productId } = req.body;
  if (!productId) {
    return res.status(400).json({ error: 'Product ID is required.' });
  }

  try {
    const product = await firebaseRequest(`/products/${productId}`);
    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    if (req.session.user) {
      const userId = req.session.user.userId;
      const wishlist = await firebaseRequest(`/wishlists/${userId}`) || {};

      if (wishlist[productId]) {
        delete wishlist[productId];
      } else {
        wishlist[productId] = {
          productId,
          name: product.name,
          price: product.price,
          image: product.image,
          description: product.description
        };
      }

      await firebaseRequest(`/wishlists/${userId}`, 'PUT', wishlist);
      res.json({ wishlist, status: wishlist[productId] ? 'added' : 'removed' });
    } else {
      if (!req.session.wishlist) req.session.wishlist = {};
      const wishlist = req.session.wishlist;

      if (wishlist[productId]) {
        delete wishlist[productId];
      } else {
        wishlist[productId] = {
          productId,
          name: product.name,
          price: product.price,
          image: product.image,
          description: product.description
        };
      }

      res.json({ wishlist, status: wishlist[productId] ? 'added' : 'removed' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle wishlist item: ' + err.message });
  }
});

// 5. Checkout & Orders API

// PLACE AN ORDER
app.post('/api/orders', requireUser, async (req, res) => {
  const { customerName, customerEmail, customerPhone, deliveryDate, address, specialInstructions, items, total } = req.body;

  if (!customerName || !customerEmail || !items || Object.keys(items).length === 0) {
    return res.status(400).json({ error: 'Customer Name, Email, and Cart Items are required.' });
  }

  const userId = req.session.user.userId;

  try {
    const newOrder = {
      userId,
      customerName,
      customerEmail: customerEmail.toLowerCase(),
      customerPhone: customerPhone || '',
      deliveryDate: deliveryDate || '',
      address: address || '',
      specialInstructions: specialInstructions || '',
      items,
      total: parseFloat(total) || 0.0,
      status: 'Pending', // Pending, Approved, Preparing, Out for Delivery, Completed, Declined
      createdAt: Date.now()
    };

    // Save order in Firebase (Firebase generates unique ID with POST to a list)
    const result = await firebaseRequest('/orders', 'POST', newOrder);
    const orderId = result.name; // Firebase returns key in 'name'

    // Clear cart
    await firebaseRequest(`/carts/${userId}`, 'PUT', {});

    res.status(201).json({ message: 'Order placed successfully', orderId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to place order: ' + err.message });
  }
});

// GET USER ORDER HISTORY
app.get('/api/orders', requireUser, async (req, res) => {
  const userId = req.session.user.userId;

  try {
    const allOrders = await firebaseRequest('/orders') || {};
    const userOrders = Object.keys(allOrders)
      .map(key => ({ id: key, ...allOrders[key] }))
      .filter(order => order.userId === userId)
      .sort((a, b) => b.createdAt - a.createdAt);

    res.json(userOrders);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load order history: ' + err.message });
  }
});

// TRACK AN ORDER
app.get('/api/orders/:id', async (req, res) => {
  const orderId = req.params.id;

  if (!req.session || (!req.session.user && !req.session.isAdmin)) {
    return res.status(401).json({ error: 'Please log in to view this order.' });
  }

  const userId = req.session.user ? req.session.user.userId : null;

  try {
    const order = await firebaseRequest(`/orders/${orderId}`);
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    if (order.userId !== userId && !req.session.isAdmin) {
      return res.status(403).json({ error: 'You are not authorized to view this order.' });
    }

    res.json({ id: orderId, ...order });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch order tracking status: ' + err.message });
  }
});

// 6. Reviews & Ratings API

// SUBMIT REVIEW
app.post('/api/reviews', async (req, res) => {
  const { productId, rating, comment, userName } = req.body;
  if (!productId || !rating || !comment) {
    return res.status(400).json({ error: 'Product ID, rating (1-5), and review text are required.' });
  }

  const authorName = userName || (req.session.user ? req.session.user.name : 'Anonymous Cake Lover');

  try {
    const newReview = {
      userName: authorName,
      rating: parseInt(rating),
      comment,
      createdAt: Date.now()
    };

    await firebaseRequest(`/reviews/${productId}`, 'POST', newReview);
    res.status(201).json({ message: 'Review submitted successfully', review: newReview });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit review: ' + err.message });
  }
});

// GET REVIEWS FOR PRODUCT
app.get('/api/reviews/:productId', async (req, res) => {
  const productId = req.params.productId;
  try {
    const reviewsData = await firebaseRequest(`/reviews/${productId}`) || {};
    const reviews = Object.keys(reviewsData).map(key => ({
      id: key,
      ...reviewsData[key]
    })).sort((a, b) => b.createdAt - a.createdAt);

    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load reviews: ' + err.message });
  }
});

// 7. AI Chat Assistant (Single shared agent across all storefront pages)
const { createChatAgent } = require('./chatAgent');
const chatAgent = createChatAgent(signatureTreats);

app.post('/api/chat', async (req, res) => {
  const { message, history } = req.body || {};
  if (!message || !String(message).trim()) {
    return res.status(400).json({ error: 'Message is required.' });
  }

  try {
    // Maintain conversation context in the session so the agent is continuous.
    if (!req.session.chatHistory) req.session.chatHistory = [];
    const safeHistory = Array.isArray(req.session.chatHistory) ? req.session.chatHistory.slice(-10) : [];

    const { reply } = await chatAgent.handle(message, safeHistory);

    req.session.chatHistory.push({ role: 'user', content: String(message) });
    req.session.chatHistory.push({ role: 'assistant', content: reply });
    if (req.session.chatHistory.length > 30) {
      req.session.chatHistory = req.session.chatHistory.slice(-30);
    }

    res.json({ reply });
  } catch (err) {
    res.status(500).json({ error: 'The assistant is busy right now. Please try again.' });
  }
});

app.get('/api/health', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Admin Authentication & Authorization
async function ensureDefaultAdmin() {
  try {
    const data = await firebaseRequest('/admins') || {};
    const desiredEmail = (process.env.ADMIN_EMAIL || '').toLowerCase();
    const desiredPassword = process.env.ADMIN_PASSWORD;
    const existing = Object.entries(data).find(([, admin]) => admin.email && admin.email.toLowerCase() === desiredEmail);

    if (desiredEmail && desiredPassword) {
      if (!existing) {
        const hashed = await bcrypt.hash(desiredPassword, 10);
        await firebaseRequest('/admins/default', 'PUT', {
          email: desiredEmail,
          passwordHash: hashed,
          name: 'Administrator',
          role: 'admin',
          createdAt: Date.now()
        });
        console.log('Default admin account seeded from environment variables.');
      } else {
        console.log('Default admin account already exists in Firebase.');
      }
    }
  } catch (err) {
    console.error('Admin initialization error:', err);
  }
}
ensureDefaultAdmin();

function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded && decoded.isAdmin) {
        req.session = req.session || {};
        req.session.isAdmin = true;
        req.session.admin = decoded.admin;
        return next();
      }
    } catch (err) {
      // Token invalid or expired, fall through to session check
    }
  }

  if (req.session && req.session.isAdmin) {
    return next();
  }
  res.setHeader('Content-Type', 'application/json');
  return res.status(401).json({ error: 'Unauthorized. Please log in as admin.' });
}

app.post('/api/admin/login', async (req, res) => {
  const { email, password, rememberMe } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required' });
  }
  try {
    const adminsData = await firebaseRequest('/admins') || {};
    const adminEntry = Object.entries(adminsData).find(([key, admin]) =>
      admin.email && admin.email.toLowerCase() === email.toLowerCase()
    );
    if (!adminEntry) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    const [adminId, admin] = adminEntry;
    const isValid = await bcrypt.compare(password, admin.passwordHash || '');
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    if (rememberMe) {
      req.session.cookie.maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    } else {
      req.session.cookie.maxAge = 24 * 60 * 60 * 1000; // 1 day
    }
    req.session.isAdmin = true;
    req.session.admin = { id: adminId, email: admin.email, name: admin.name, role: 'admin' };

    const token = jwt.sign(
      { isAdmin: true, admin: { id: adminId, email: admin.email, name: admin.name, role: 'admin' } },
      JWT_SECRET,
      { expiresIn: rememberMe ? '7d' : '1d' }
    );

    res.setHeader('Content-Type', 'application/json');
    res.json({
      success: true,
      token,
      user: {
        email: admin.email,
        role: 'admin'
      }
    });
  } catch (err) {
    console.error('Admin login error:', err);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ success: false, message: 'Login service unavailable. Please try again.' });
  }
});

app.post('/api/admin/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.clearCookie('connect.sid', { path: '/' });
    res.json({ message: 'Logged out successfully' });
  });
});

app.get('/api/admin/session', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded && decoded.isAdmin) {
        return res.json({ loggedIn: true, admin: decoded.admin });
      }
    } catch (err) {
      // Token invalid or expired, fall through to session check
    }
  }

  if (req.session && req.session.isAdmin) {
    res.json({ loggedIn: true, admin: req.session.admin });
  } else {
    res.json({ loggedIn: false });
  }
});

// 8. Admin APIs
app.get('/api/admin/stats', requireAdmin, async (req, res) => {
  try {
    const ordersData = await firebaseRequest('/orders') || {};
    const usersData = await firebaseRequest('/users') || {};
    
    let totalOrders = 0;
    let pendingOrders = 0;
    let totalRevenue = 0;
    
    Object.values(ordersData).forEach(order => {
      totalOrders++;
      if (order.status === 'Pending') pendingOrders++;
      totalRevenue += (order.total || 0);
    });
    
    const totalUsers = Object.keys(usersData).length;
    
    res.json({
      totalOrders,
      pendingOrders,
      totalUsers,
      totalRevenue
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch admin stats' });
  }
});

app.get('/api/admin/orders', requireAdmin, async (req, res) => {
  try {
    const ordersData = await firebaseRequest('/orders') || {};
    const orders = Object.keys(ordersData).map(key => ({
      id: key,
      ...ordersData[key]
    })).sort((a, b) => b.createdAt - a.createdAt);
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

app.post('/api/admin/orders/:id/status', requireAdmin, async (req, res) => {
  const { status } = req.body;
  const orderId = req.params.id;
  try {
    const order = await firebaseRequest(`/orders/${orderId}`);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    
    order.status = status;
    await firebaseRequest(`/orders/${orderId}`, 'PUT', order);
    res.json({ message: 'Order status updated', order });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

app.get('/api/admin/users', requireAdmin, async (req, res) => {
  try {
    const usersData = await firebaseRequest('/users') || {};
    const users = Object.keys(usersData).map(key => ({
      id: key,
      ...usersData[key]
    })).sort((a, b) => b.createdAt - a.createdAt);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.put('/api/admin/products/:id', requireAdmin, async (req, res) => {
  const productId = req.params.id;
  const { name, category, price, unit, description, image, tags, badge, stock, sku, availability, ingredients, flavorProfile, pairsWith, status, featured, topRated, recommended, active } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  try {
    const existing = await firebaseRequest(`/products/${productId}`);
    if (!existing) return res.status(404).json({ error: 'Product not found' });
    const updated = {
      ...existing,
      name, category, price: parseFloat(price), unit, description,
      image: image || existing.image,
      tags: tags || existing.tags || [],
      badge: badge || existing.badge || '',
      stock: stock !== undefined ? parseInt(stock) : (existing.stock || 0),
      sku: sku || existing.sku || '',
      availability: availability || existing.availability || 'In Stock',
      ingredients: ingredients || existing.ingredients || [],
      flavorProfile: flavorProfile || existing.flavorProfile || [],
      pairsWith: pairsWith || existing.pairsWith || [],
      status: status || existing.status || 'active',
      featured: featured || existing.featured || false,
      topRated: topRated || existing.topRated || false,
      recommended: recommended || existing.recommended || false,
      active: active !== undefined ? active : (existing.active !== undefined ? existing.active : true),
    };
    await firebaseRequest(`/products/${productId}`, 'PUT', updated);
    res.json({ message: 'Product updated', product: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update product' });
  }
});

app.delete('/api/admin/products/:id', requireAdmin, async (req, res) => {
  const productId = req.params.id;
  try {
    await firebaseRequest(`/products/${productId}`, 'DELETE');
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

app.get('/api/admin/reviews', requireAdmin, async (req, res) => {
  try {
    const reviewsData = await firebaseRequest('/reviews') || {};
    const allReviews = [];
    Object.keys(reviewsData).forEach(productId => {
      const productReviews = reviewsData[productId];
      Object.keys(productReviews).forEach(reviewId => {
        allReviews.push({ id: reviewId, productId, ...productReviews[reviewId] });
      });
    });
    allReviews.sort((a, b) => b.createdAt - a.createdAt);
    res.json(allReviews);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

app.post('/api/admin/products', requireAdmin, async (req, res) => {
  const { id, name, category, price, unit, description, image, tags, badge, stock, sku, availability, ingredients, flavorProfile, pairsWith, status, featured, topRated, recommended, active } = req.body;
  if (!id || !name) return res.status(400).json({ error: 'ID and Name are required' });
  try {
    const product = {
      id, name, category, price: parseFloat(price), unit, description,
      image: image || '',
      tags: tags || [],
      badge: badge || '',
      stock: stock !== undefined ? parseInt(stock) : 0,
      sku: sku || '',
      availability: availability || 'In Stock',
      ingredients: ingredients || [],
      flavorProfile: flavorProfile || [],
      pairsWith: pairsWith || [],
      status: status || 'active',
      featured: featured || false,
      topRated: topRated || false,
      recommended: recommended || false,
      active: active !== undefined ? active : true,
    };
    await firebaseRequest(`/products/${id}`, 'PUT', product);
    res.status(201).json({ message: 'Product added', product });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add product' });
  }
});

// Admin page aliases for cleaner URLs
app.get('/admin/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-login.html'));
});
app.get('/admin/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-dashboard.html'));
});
app.get('/admin/orders', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-orders.html'));
});
app.get('/admin/order-details', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-order-details.html'));
});
app.get('/admin-order-details.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-order-details.html'));
});

// JSON 404 handler for API routes
app.use('/api', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.status(404).json({ error: 'API endpoint not found', path: req.originalUrl });
});

// Catch-all route to serve the Home page for invalid paths
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Global error handler to ensure JSON responses
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.setHeader('Content-Type', 'application/json');
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`cookieesandcakes Server running at http://localhost:${PORT}`);
});
