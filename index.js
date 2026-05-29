const express = require('express');
const axios = require('axios');
const fs = require('fs');
const app = express();
app.use(express.json());

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

// Simple DB file
const DB_FILE = 'users.json';
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, '{}');

function saveToDB(user_number, msg) {
  const db = JSON.parse(fs.readFileSync(DB_FILE));
  if (!db[user_number]) db[user_number] = [];
  db[user_number].push({ msg: msg, time: new Date().toISOString() });
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

async function sendMessage(to, text) {
  await axios.post(`https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`, {
    messaging_product: 'whatsapp',
    to: to,
    text: { body: text }
  }, {
    headers: { 'Authorization': `Bearer ${WHATSAPP_TOKEN}` }
  });
}

app.get('/webhook', (req, res) => {
  if (req.query['hub.verify_token'] === VERIFY_TOKEN) {
    res.send(req.query['hub.challenge']);
  } else {
    res.sendStatus(403);
  }
});

app.post('/webhook', async (req, res) => {
  const entry = req.body.entry?.[0]?.changes?.[0]?.value;
  const msg = entry?.messages?.[0];

  if (msg) {
    const from = msg.from;
    const msg_body = msg.text?.body?.toLowerCase() || '';
    console.log('Message aaya:', from, msg_body);
    
    saveToDB(from, msg_body); // Sab DB me save
    
    let reply = '';
    
    if (msg_body === 'hi' || msg_body === 'hello' || msg_body === 'menu') {
      reply = `Namaste 🙏 Main NearMe Bot hu

1️⃣ Najdiki Dukaan
2️⃣ Help
3️⃣ Contact

Number bhejo: 1, 2 ya 3`;
    
    } else if (msg_body === '1') {
      reply = `Dukaan List:
1. Sharma General Store - 500m
2. Gupta Medical - 800m
3. Verma Kirana - 1.2km

Area bhejo exact location ke liye 📍`;
    
    } else if (msg_body === '2') {
      reply = `Help:
Hi = Menu
1 = Dukaan list
3 = Contact karo
Kuch aur puchna ho to 3 dabao`;
    
    } else if (msg_body === '3') {
      reply = `Contact: 8292716185
Email: support@nearme.com
Time: 10AM - 8PM`;
    
    } else {
      reply = `Samjha nahi bhai 😅
Menu ke liye 'Hi' bhejo`;
    }
    
    await sendMessage(from, reply);
  }
  
  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
