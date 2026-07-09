// chatAgent.js - The single AI assistant ("Baker Bot") for cookieesandcakes.
// All storefront pages talk to this one agent via POST /api/chat.
// It keeps conversation context and can answer questions about treats, orders,
// accounts, store info, and more. If an external LLM is configured via env
// (CHAT_API_URL + CHAT_API_KEY), it delegates to that model; otherwise it uses
// the built-in knowledge engine so it works with zero external dependencies.

const https = require('https');

const STORE_INFO = {
  name: 'cookieesandcakes',
  address: '123 Baker St, Flour District, New York, NY 10001',
  hours: 'Tuesday – Sunday: 7:00 AM – 4:00 PM. Closed on Mondays.',
  shipping: 'We deliver fresh treats across the city via our Sweet Courier. Orders are typically prepared the same day and delivered within 24–48 hours.',
  payment: 'We accept all major cards at checkout. You can place an order as a guest or save details by creating a free account.',
  contact: 'Reach our team through the Contact Us link in the footer, or ask me anything right here!'
};

function createChatAgent(products) {
  const catalog = Object.values(products || {});

  // --- Optional external LLM ---
  // Supports both OpenAI-compatible Chat Completions endpoints and the native
  // Ollama cloud API (auto-detected from the CHAT_API_URL).
  async function queryLLM(messages) {
    const apiUrl = process.env.CHAT_API_URL;
    const apiKey = process.env.CHAT_API_KEY;
    const model = process.env.CHAT_MODEL || 'gpt-4o-mini';
    if (!apiUrl || !apiKey) return null;

    const isOllama = /ollama/i.test(apiUrl);
    const systemPrompt = buildSystemPrompt();

    let payload;
    if (isOllama) {
      // Native Ollama API: a single prompt built from system + conversation.
      let prompt = systemPrompt + '\n\n';
      messages.forEach((m) => {
        prompt += `${m.role === 'user' ? 'Customer' : 'Baker Bot'}: ${m.content}\n`;
      });
      prompt += 'Baker Bot:';
      payload = { model, prompt, stream: false };
    } else {
      // OpenAI-compatible Chat Completions.
      payload = {
        model,
        temperature: 0.5,
        messages: [{ role: 'system', content: systemPrompt }, ...messages]
      };
    }

    const body = JSON.stringify(payload);
    const parsed = new URL(apiUrl);
    const options = {
      hostname: parsed.hostname,
      port: 443,
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(body)
      }
    };

    return new Promise((resolve) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            let text = null;
            if (isOllama) {
              // Native Ollama response: { response: "..." } or { message: { content } }
              text = json.response || (json.message && json.message.content) || null;
            } else {
              text = json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content;
            }
            resolve(text || null);
          } catch (e) {
            resolve(null);
          }
        });
      });
      req.on('error', () => resolve(null));
      req.write(body);
      req.end();
    });
  }

  function buildSystemPrompt() {
    const menu = catalog
      .map((p) => `- ${p.name} (${p.category}, $${p.price.toFixed(2)}, tags: ${(p.tags || []).join(', ')})`)
      .join('\n');
    return [
      `You are "Baker Bot", the friendly AI assistant for ${STORE_INFO.name}, an artisanal bakery.`,
      `Speak in a warm, concise, bakery-themed tone. Keep replies short and helpful.`,
      `Store hours: ${STORE_INFO.hours}`,
      `Store address: ${STORE_INFO.address}`,
      `Shipping: ${STORE_INFO.shipping}`,
      `Current menu:\n${menu}`
    ].join('\n');
  }

  // --- Built-in knowledge engine (used when no LLM is configured) ---
  function normalize(text) {
    return text.toLowerCase();
  }

  function matchProducts(text) {
    const q = normalize(text);
    const matched = catalog.filter((p) => {
      const hay = `${p.name} ${p.description} ${(p.tags || []).join(' ')} ${p.category}`.toLowerCase();
      return hay.includes(q);
    });
    return matched;
  }

  function pick(predicate) {
    return catalog.filter(predicate);
  }

  function formatProducts(list, limit = 4) {
    const items = list.slice(0, limit);
    if (items.length === 0) return '';
    return items.map((p) => `• ${p.name} — $${p.price.toFixed(2)} (${(p.tags || []).join(', ') || p.category})`).join('\n');
  }

  function localReply(message, history) {
    const q = normalize(message);
    const lastBot = [...(history || [])].reverse().find((m) => m.role === 'assistant');
    const lastUser = [...(history || [])].reverse().find((m) => m.role === 'user');

    // Greetings
    if (/^(hi|hello|hey|yo|hiya|good (morning|afternoon|evening))\b/.test(q) || q === 'hi' || q === 'hello') {
      return `Hello there, lovely! I'm Baker Bot 🍪 How can I help you today? You can ask me for treat recommendations, store hours, or help with your order.`;
    }

    // Store hours
    if (/(hour|open|close|timing|when.*(open|close)|schedule)/.test(q)) {
      return `We're open ${STORE_INFO.hours} Come say hi at ${STORE_INFO.address}!`;
    }

    // Location
    if (/(where|location|address|find you|visit|directions)/.test(q)) {
      return `You can visit us at ${STORE_INFO.address}. We'd love to see you!`;
    }

    // Shipping / delivery
    if (/(ship|deliver|delivery|courier|post|send)/.test(q)) {
      return STORE_INFO.shipping + ` Just add your treats to the bag and head to checkout to pick a delivery date.`;
    }

    // Payment
    if (/(pay|payment|card|checkout|price|cost)/.test(q) && !/(recommend|suggest|cheap|affordable)/.test(q)) {
      return STORE_INFO.payment;
    }

    // Account / sign up / login
    if (/(sign up|signup|register|create account|join)/.test(q)) {
      return `Creating an account is easy! Head to our Sign Up page, add your name, email, and password, and you'll be in. Members get faster checkout and a saved wishlist. 🍰`;
    }
    if (/(log ?in|login|sign ?in|signin|password)/.test(q)) {
      return `To sign in, go to the Sign In page and enter the email and password you registered with. Forgot your password? Use the "Forgot Password?" link on the login page to reset it.`;
    }
    if (/(order|track|my orders|status|where.*order)/.test(q)) {
      return `You can track any order from the order tracking page using your Order ID (e.g. CK-8829). Once you're logged in, your full order history lives in your Account hub. Need me to look something up? Just share the Order ID!`;
    }
    if (/(cancel|refund|return)/.test(q)) {
      return `For cancellations, refunds, or returns, please contact our team with your Order ID and we'll make it right. You can reach us through the Contact Us link in the footer.`;
    }

    // Dietary preferences
    if (/(vegan|plant|dairy.?free|egg.?free)/.test(q)) {
      const vegan = pick((p) => (p.tags || []).some((t) => /vegan/i.test(t)));
      return `We have vegan-friendly bakes! 🌱 Try these:\n${formatProducts(vegan) || 'Our kitchen rotates seasonal vegan treats — ask in store for today’s picks.'}`;
    }
    if (/(gluten|celiac|allerg)/.test(q)) {
      const gf = pick((p) => (p.tags || []).some((t) => /gluten.?free/i.test(t)));
      return gf.length
        ? `Here are our gluten-free options:\n${formatProducts(gf)}`
        : `We offer some gluten-free treats (like our Artisan Macarons). Because we're a shared bakery, please let us know about allergies and we'll guide you safely.`;
    }

    // Cheapest / affordable
    if (/(cheap|affordable|budget|least expensive|under \$|lowest)/.test(q)) {
      const sorted = [...catalog].sort((a, b) => a.price - b.price);
      return `Looking for a sweet deal? Our most affordable treats:\n${formatProducts(sorted, 4)}`;
    }
    // Most expensive / premium
    if (/(expensive|premium|luxury|best|top|signature|special)/.test(q)) {
      const sorted = [...catalog].sort((a, b) => b.price - a.price);
      return `Our most indulgent picks:\n${formatProducts(sorted, 4)}`;
    }

    // Categories
    if (/(cake|cheesecake|layer cake)/.test(q)) {
      return `Our cakes are baked fresh daily! 🎂 Here are some favorites:\n${formatProducts(pick((p) => p.category === 'cakes'))}`;
    }
    if (/(cookie|bicuit|biscuit)/.test(q)) {
      return `Who can resist a cookie? 🍪 Our cookie lineup:\n${formatProducts(pick((p) => p.category === 'cookies'))}`;
    }
    if (/(pastr|croissant|tart|bread|sourdough)/.test(q)) {
      return `Fresh from the oven! Our pastries:\n${formatProducts(pick((p) => p.category === 'pastries'))}`;
    }
    if (/(chocolate|truffle|cocoa|fudge)/.test(q)) {
      const choc = pick((p) => /chocolate|truffle|cocoa/i.test(`${p.name} ${p.description} ${(p.tags || []).join(' ')}`));
      return `For the chocolate lovers 🍫:\n${formatProducts(choc)}`;
    }

    // Recommendations / suggestions
    if (/(recommend|suggest|what.*(good|best|try|should.*get)|help.*choose|surprise|gift|present)/.test(q)) {
      const sorted = [...catalog].sort((a, b) => b.price - a.price);
      const top = (lastBot && /chocolate/i.test(lastBot.content)) ? pick((p) => /chocolate/i.test(`${p.name}`)) : sorted;
      return `Happy to help you choose! 🎁 Our team's current favorites:\n${formatProducts(top)}`;
    }

    // Direct product lookup
    const direct = matchProducts(message);
    if (direct.length) {
      const p = direct[0];
      return `Great choice! ${p.name} is $${p.price.toFixed(2)} (${p.unit}). ${p.description}`;
    }

    // "more" / "another" follow-ups
    if (/(more|another|else|other|show me)/.test(q) && lastBot) {
      return `Here are a few more treats you might love:\n${formatProducts(catalog.slice(0, 5))}`;
    }

    // Gratitude
    if (/(thank|thanks|cheers|appreciate)/.test(q)) {
      return `Anytime! Enjoy your treats and come back soon. 🧁`;
    }

    // Fallback
    return `I'm Baker Bot, your sweet assistant here at ${STORE_INFO.name}! 🍪 I can help you discover treats, check store hours (${STORE_INFO.hours.split('.')[0]}…), track orders, or set up an account. What are you in the mood for today?`;
  }

  // Main handler used by the route
  async function handle(message, history) {
    const trimmed = (message || '').trim();
    if (!trimmed) return { reply: "Hmm, I didn't catch that. What can I help you with? 🍪" };

    const llmReply = await queryLLM(history || []);
    if (llmReply) return { reply: llmReply };

    return { reply: localReply(trimmed, history || []) };
  }

  return { handle };
}

module.exports = { createChatAgent, STORE_INFO };
