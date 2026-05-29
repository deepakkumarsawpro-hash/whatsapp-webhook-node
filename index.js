const express = require('express');
const axios = require('axios');
const fs = require('fs');
const app = express();
app.use(express.json());

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

const DB_FILE = 'users.json';
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, '{}');

function getUserData(number) {
  const db = JSON.parse(fs.readFileSync(DB_FILE));
  return db[number] || { step: 'start', role: null, data: {} };
}

function saveUserData(number, data) {
  const db = JSON.parse(fs.readFileSync(DB_FILE));
  db[number] = {...getUserData(number),...data, lastUpdate: new Date().toISOString() };
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
    const msg_body = msg.text?.body?.toLowerCase().trim() || '';
    const user = getUserData(from);
    
    let reply = '';
    
    // Step 1: Koi bhi message pe Welcome + Role poocho
    if (user.step === 'start') {
      saveUserData(from, { step: 'role_select' });
      
      reply = `Welcome to NearMe 🙏

Hum aapki kaise help kar sakte hai?

1️⃣ Sale - Apni dukaan/products list karna hai
2️⃣ Service - Technician/Mistri chahiye
3️⃣ Customer - Najdiki dukaan/service dhundhna hai

Reply me 1, 2 ya 3 bhejo`;
    
    // Step 2: Role select karne ke baad
    } else if (user.step === 'role_select') {
      
      if (msg_body === '1') {
        saveUserData(from, { step: 'sale_flow', role: 'seller' });
        reply = `🛒 Sale/Dukaandar Section

Aap kya bechna chahte hai?
1. Kirana/Grocery
2. Electronics 
3. Kapde
4. Medical
5. Other

Number bhejo ya type karo`;
      
      } else if (msg_body === '2') {
        saveUserData(from, { step: 'service_flow', role: 'service_provider' });
        reply = `🔧 Service Provider Section

Kaun si service dete ho?
1. Electrician
2. Plumber 
3. AC Repair
4. Carpenter
5. Other

Number bhejo`;
      
      } else if (msg_body === '3') {
        saveUserData(from, { step: 'customer_flow', role: 'customer' });
        reply = `👤 Customer Section

Kya chahiye aapko?
1. Najdiki Dukaan
2. Service/Technician
3. Product Search

Number bhejo ya 'Menu' type karo restart ke liye`;
      
      } else if (msg_body === 'menu' || msg_body === 'restart') {
        saveUserData(from, { step: 'start' });
        reply = `Dobara start karte hai 🙏

1️⃣ Sale - Dukaan list karni hai
2️⃣ Service - Technician banna hai 
3️⃣ Customer - Kuch dhundhna hai

1, 2 ya 3 bhejo`;
      
      } else {
        reply = `Galat option 😅

1️⃣ Sale
2️⃣ Service 
3️⃣ Customer

Inme se 1, 2 ya 3 bhejo
Ya 'Menu' bhejo restart ke liye`;
      }
    
    // Step 3: Customer Flow
    } else if (user.step === 'customer_flow') {
      if (msg_body === '1') {
        saveUserData(from, { step: 'customer_location' });
        reply = `📍 Apna location bhejo

📎 icon dabao → Location → Current Location

Mai najdiki 3 dukaan bataunga`;
      
      } else if (msg_body === '2') {
        reply = `Kaun sa technician chahiye?
1. Electrician
2. Plumber
3. AC Repair

'Menu' bhejo wapas jaane ke liye`;
      
      } else {
        reply = `Customer Menu:
1. Najdiki Dukaan
2. Service dhundho

'Menu' = Restart`;
      }
    
    // Step 4: Location ka wait
    } else if (user.step === 'customer_location' && msg.type === 'location') {
      const lat = msg.location.latitude;
      const lng = msg.location.longitude;
      saveUserData(from, { step: 'customer_flow', data: {lat, lng} });
      
      reply = `Location mil gayi ✅

Najdik ki dukaan:
1. Sharma Store - 0.3km
2. Gupta Medical - 0.5km 
3. Verma Kirana - 0.8km

'Menu' bhejo naye search ke liye`;
    
    // Sale Flow
    } else if (user.step === 'sale_flow') {
      saveUserData(from, { data: { business_type: msg_body }});
      reply = `Dukaan ka naam kya hai?
Type karke bhejo

'Menu' = Restart`;
    
    // Service Flow 
    } else if (user.step === 'service_flow') {
      saveUserData(from, { data: { service_type: msg_body }});
      reply = `Aapka naam kya hai?
Kaam ka experience kitne saal?

'Menu' = Restart`;
    
    } else {
      saveUserData(from, { step: 'start' });
      reply = `Kuch gadbad ho gayi 😅

Dobara start karte hai:
1️⃣ Sale 2️⃣ Service 3️⃣ Customer`;
    }
    
    await sendMessage(from, reply);
  }
  
  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`NearMe Bot running`));
