const express = require('express');
const axios = require('axios');
const fs = require('fs');
const app = express();
app.use(express.json());

// ENV Variables Render se
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

// 1. DATABASE: Simple JSON file me save
const DB_FILE = 'users.json';
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, '{}');

function saveToDB(number, message, reply) {
  const db = JSON.parse(fs.readFileSync(DB_FILE));
  if (!db[number]) db[number] = [];
  db[number].push({ 
    user_msg: message, 
    bot_reply: reply,
    time: new Date().toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'}) 
  });
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// 2. AI: Groq se reply lana
async function getAIReply(user_msg) {
  try {
    const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: 'llama3-8b-8192',
      messages: [
        { 
          role: 'system', 
          content: 'Tum NearMe naam ka WhatsApp bot ho. User ki madad karo. Hinglish me reply do. Short rakhna, max 3 line. Friendly raho.' 
        },
        { role: 'user', content: user_msg }
      ],
      temperature: 0.7,
      max_tokens: 150
    }, {
      headers: { 'Authorization': `Bearer ${GROQ_API_KEY}` }
    });
    return res.data.choices[0].message.content.trim();
  } catch (err) {
    console.log('Groq Error:', err.response?.data || err.message);
    return 'Sorry bhai, AI thoda busy hai. 1 min baad try karo ya Menu ke liye "Hi" bhejo.';
  }
}

// 3. WHATSAPP: Message bhejna
async function sendMessage(to, text) {
  try {
    await axios.post(`https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`, {
      messaging_product: 'whatsapp',
      to: to,
      text: { body: text }
    }, {
      headers: { 'Authorization': `Bearer ${WHATSAPP_TOKEN}` }
    });
  } catch (err) {
    console.log('Send Error:', err.response?.data || err.message);
  }
}

// Webhook Verify - Meta ke liye
app.get('/webhook', (req, res) => {
  if (req.query['hub.verify_token'] === VERIFY_TOKEN) {
    res.send(req.query['hub.challenge']);
  } else {
    res.sendStatus(403);
  }
});

// Main Logic: Message aane pe
app.post('/webhook', async (req, res) => {
  const entry = req.body.entry?.[0]?.changes?.[0]?.value;
  const msg = entry?.messages?.[0];
  
  if (msg && msg.text) {
    const from = msg.from;
    const msg_body = msg.text.body.toLowerCase().trim();
    console.log(`Msg from ${from}: ${msg_body}`);
    
    let reply = '';

    // MENU SYSTEM
    if (msg_body === 'hi' || msg_body === 'hello' || msg_body === 'menu') {
      reply = `Namaste 🙏 Main NearMe Bot hu

Kya karna chahte ho?
1️⃣ Najdiki Dukaan dekho
2️⃣ Help chahiye 
3️⃣ AI se kuch pucho

Reply me 1, 2 ya 3 bhejo`;

    } else if (msg_body === '1') {
      reply = `📍 Najdiki Dukaan:
1. Sharma Kirana - 200m
2. Gupta Medical - 500m 
3. Verma Mobile - 800m

Apna exact location share karo to aur dukaan bhejunga.`;

    } else if (msg_body === '2') {
      reply = `⚙️ Help Menu:
"Hi" = Main menu
"1" = Dukaan list
"3" = AI mode on
Ya sidhe apna sawaal likh do, AI jawab dega.`;

    } else if (msg_body === '3') {
      reply = `🧠 AI Mode ON
Ab tum kuch bhi puch sakte ho. Jaise:
"Garmi me kya khaye?"
"Shop kaise kholu?"

Pucho kya puchna hai?`;

    } else {
      // AI REPLY for sab kuch else
      reply = await getAIReply(msg.text.body);
    }
    
    // Message bhejo aur DB me save karo
    await sendMessage(from, reply);
    saveToDB(from, msg.text.body, reply);
  }
  
  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
