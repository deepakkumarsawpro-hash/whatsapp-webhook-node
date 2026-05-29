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

function getUser(number) {
  const db = JSON.parse(fs.readFileSync(DB_FILE));
  return db[number] || { step: 'welcome', data: {} };
}

function saveUser(number, data) {
  const db = JSON.parse(fs.readFileSync(DB_FILE));
  db[number] = {...getUser(number),...data};
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

async function sendButtons(to, bodyText, buttons) {
  await axios.post(`https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`, {
    messaging_product: 'whatsapp',
    to: to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: bodyText },
      action: { buttons: buttons }
    }
  }, { headers: { 'Authorization': `Bearer ${WHATSAPP_TOKEN}` } });
}

async function sendText(to, text) {
  await axios.post(`https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`, {
    messaging_product: 'whatsapp',
    to: to,
    text: { body: text }
  }, { headers: { 'Authorization': `Bearer ${WHATSAPP_TOKEN}` } });
}

app.get('/webhook', (req, res) => {
  if (req.query['hub.verify_token'] === VERIFY_TOKEN) res.send(req.query['hub.challenge']);
  else res.sendStatus(403);
});

app.post('/webhook', async (req, res) => {
  const msg = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (!msg) return res.sendStatus(200);

  const from = msg.from;
  const user = getUser(from);
  
  // Button ka ID nikalo
  let btn_id = '';
  if (msg.type === 'interactive' && msg.interactive.type === 'button_reply') {
    btn_id = msg.interactive.button_reply.id;
  } else if (msg.type === 'text') {
    btn_id = msg.text.body.toLowerCase();
  }

  // STEP 1: WELCOME - Kuch bhi bhejo button aa jayega
  if (user.step === 'welcome' || btn_id === 'restart') {
    saveUser(from, { step: 'role', data: {} });
    await sendButtons(from,
      `Welcome to NearMe 🙏\n\nHum aapki kaise help kar sakte hai?`,
      [
        { type: 'reply', reply: { id: 'role_sale', title: '🛒 Sale' } },
        { type: 'reply', reply: { id: 'role_service', title: '🔧 Service' } },
        { type: 'reply', reply: { id: 'role_customer', title: '👤 Customer' } }
      ]
    );
  
  // STEP 2: ROLE KE BAAD
  } else if (user.step === 'role') {
    if (btn_id === 'role_customer') {
      saveUser(from, { step: 'customer_dist', role: 'customer' });
      await sendButtons(from,
        `Kitne KM ke andar dukaan chahiye?`,
        [
          { type: 'reply', reply: { id: 'dist_2', title: '2 KM' } },
          { type: 'reply', reply: { id: 'dist_5', title: '5 KM' } },
          { type: 'reply', reply: { id: 'dist_10', title: '10 KM' } }
        ]
      );
    
    } else if (btn_id === 'role_sale') {
      saveUser(from, { step: 'provider_name', role: 'provider' });
      await sendText(from, `Apni Shop/Business ka naam bhejo`);
    
    } else if (btn_id === 'role_service') {
      saveUser(from, { step: 'provider_name', role: 'provider' });
      await sendText(from, `Service/Business ka naam bhejo`);
    }
  
  // STEP 3: CUSTOMER DISTANCE KE BAAD LOCATION
  } else if (user.step === 'customer_dist') {
    saveUser(from, { step: 'location', data: {...user.data, distance: btn_id} });
    await sendText(from, `📍 Ab apna Current Location bhejo\n\n📎 dabao → Location → "Send current location"`);
  
  // STEP 3: PROVIDER NAME KE BAAD LOCATION 
  } else if (user.step === 'provider_name' && msg.type === 'text') {
    saveUser(from, { step: 'location', data: {...user.data, shop_name: msg.text.body} });
    await sendText(from, `📍 Shop ka Location bhejo\n\n📎 dabao → Location bhejo`);
  
  // STEP 4: LOCATION MILNE KE BAAD CATEGORY
  } else if (user.step === 'location' && msg.type === 'location') {
    saveUser(from, { 
      step: 'category', 
      data: {...user.data, lat: msg.location.latitude, lng: msg.location.longitude }
    });
    
    if (user.role === 'customer') {
      await sendButtons(from,
        `Kya chahiye?`,
        [
          { type: 'reply', reply: { id: 'cat_grocery', title: 'Kirana Store' } },
          { type: 'reply', reply: { id: 'cat_medical', title: 'Medical' } },
          { type: 'reply', reply: { id: 'cat_electronics', title: 'Electronics' } }
        ]
      );
    } else {
      await sendButtons(from,
        `Service type kya hai?`,
        [
          { type: 'reply', reply: { id: 'cat_electrician', title: 'Electrician' } },
          { type: 'reply', reply: { id: 'cat_plumber', title: 'Plumber' } },
          { type: 'reply', reply: { id: 'cat_carpenter', title: 'Carpenter' } }
        ]
      );
    }
  
  // STEP 5: SUB-CATEGORY
  } else if (user.step === 'category') {
    saveUser(from, { step: 'subcategory', data: {...user.data, category: btn_id} });
    await sendButtons(from,
      `Sub-Category choose karo:`,
      [
        { type: 'reply', reply: { id: 'sub_urgent', title: 'Urgent' } },
        { type: 'reply', reply: { id: 'sub_normal', title: 'Normal' } },
        { type: 'reply', reply: { id: 'sub_other', title: 'Other' } }
      ]
    );
  
  // STEP 6: OTHER INFO
  } else if (user.step === 'subcategory') {
    saveUser(from, { step: 'other_info', data: {...user.data, sub_cat: btn_id} });
    await sendButtons(from,
      `Koi extra info dena hai?`,
      [
        { type: 'reply', reply: { id: 'other_yes', title: 'Haan' } },
        { type: 'reply', reply: { id: 'other_skip', title: 'Skip' } }
      ]
    );
  
  // STEP 7: WHATSAPP NUMBER
  } else if (user.step === 'other_info') {
    if (btn_id === 'other_yes') {
      saveUser(from, { step: 'other_text' });
      await sendText(from, `Extra details type karo:`);
    } else {
      saveUser(from, { step: 'whatsapp_num', data: {...user.data, other: 'Skip'} });
      await sendText(from, `Contact WhatsApp Number bhejo\n\n10 digit: 8292716185`);
    }
  
  } else if (user.step === 'other_text' && msg.type === 'text') {
    saveUser(from, { step: 'whatsapp_num', data: {...user.data, other: msg.text.body} });
    await sendText(from, `Contact WhatsApp Number bhejo\n\n10 digit: 8292716185`);
  
  // STEP 8: CONFIRMATION
  } else if (user.step === 'whatsapp_num' && msg.type === 'text') {
    saveUser(from, { step: 'done', data: {...user.data, contact: msg.text.body} });
    await sendButtons(from,
      `✅ Ho gaya! Data save ho gaya\n\nRole: ${user.role}\nCategory: ${user.data.category}\n\nFir se shuru karna hai?`,
      [{ type: 'reply', reply: { id: 'restart', title: '🔄 Restart' } }]
    );
  }
  
  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Button Bot Running`));
