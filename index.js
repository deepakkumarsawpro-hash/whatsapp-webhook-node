const express = require('express');
const axios = require('axios');
const fs = require('fs');
const app = express();
app.use(express.json());

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

const DB_FILE = 'users.json';
const CONFIG_FILE = 'categories.json';
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, '{}');

function loadConfig() {
  return JSON.parse(fs.readFileSync(CONFIG_FILE));
}

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
    messaging_product: 'whatsapp', to: to, type: 'interactive',
    interactive: { type: 'button', body: { text: bodyText }, action: { buttons: buttons } }
  }, { headers: { 'Authorization': `Bearer ${WHATSAPP_TOKEN}` } });
}

async function sendList(to, bodyText, buttonText, sections) {
  await axios.post(`https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`, {
    messaging_product: 'whatsapp', to: to, type: 'interactive',
    interactive: { type: 'list', body: { text: bodyText }, action: { button: buttonText, sections: sections } }
  }, { headers: { 'Authorization': `Bearer ${WHATSAPP_TOKEN}` } });
}

async function sendText(to, text) {
  await axios.post(`https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`, {
    messaging_product: 'whatsapp', to: to, text: { body: text }
  }, { headers: { 'Authorization': `Bearer ${WHATSAPP_TOKEN}` } });
}

async function downloadMedia(mediaId) {
  const mediaUrl = await axios.get(`https://graph.facebook.com/v20.0/${mediaId}`, {
    headers: { 'Authorization': `Bearer ${WHATSAPP_TOKEN}` }
  });
  return mediaUrl.data.url;
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
  const CONFIG = loadConfig();
  
  let reply_id = '';
  if (msg.type === 'interactive') {
    if (msg.interactive.type === 'button_reply') reply_id = msg.interactive.button_reply.id;
    if (msg.interactive.type === 'list_reply') reply_id = msg.interactive.list_reply.id;
  } else if (msg.type === 'text') {
    reply_id = msg.text.body.toLowerCase();
  }

  // STEP 1: WELCOME
  if (user.step === 'welcome' || reply_id === 'restart') {
    saveUser(from, { step: 'role', data: {} });
    await sendButtons(from, `Welcome to NearMe 🙏\n\nAap kaun hai?`, [
      { type: 'reply', reply: { id: 'role_sale', title: '🛒 Sale' } },
      { type: 'reply', reply: { id: 'role_service', title: '🔧 Service' } },
      { type: 'reply', reply: { id: 'role_customer', title: '👤 Customer' } }
    ]);
  
  // STEP 2: ROLE
  } else if (user.step === 'role') {
    if (reply_id === 'role_customer') {
      saveUser(from, { step: 'customer_dist', role: 'customer' });
      await sendButtons(from, `Kitne KM ke andar chahiye?`, [
        { type: 'reply', reply: { id: 'dist_2', title: '2 KM' } },
        { type: 'reply', reply: { id: 'dist_5', title: '5 KM' } },
        { type: 'reply', reply: { id: 'dist_10', title: '10 KM' } }
      ]);
    } else {
      saveUser(from, { step: 'provider_name', role: 'provider' });
      await sendText(from, `Apni Shop/Service ka naam bhejo`);
    }
  
  // STEP 3: LOCATION
  } else if (user.step === 'customer_dist') {
    saveUser(from, { step: 'location', data: {...user.data, distance: reply_id} });
    await sendText(from, `📍 Current Location bhejo\n\n📎 dabao → Location`);
  
  } else if (user.step === 'provider_name' && msg.type === 'text') {
    saveUser(from, { step: 'location', data: {...user.data, shop_name: msg.text.body} });
    await sendText(from, `📍 Shop ka Location bhejo`);
  
  // STEP 4: MAIN CATEGORY - LIST
  } else if (user.step === 'location' && msg.type === 'location') {
    saveUser(from, { 
      step: 'main_category', 
      data: {...user.data, lat: msg.location.latitude, lng: msg.location.longitude }
    });
    
    const roleData = CONFIG[user.role];
    const listRows = roleData.main_categories.map(cat => ({
      id: cat.id,
      title: cat.title,
      description: cat.description
    }));
    
    await sendList(from, `7 Categories me se choose karo:`, `Select Category`, [
      { title: 'Main Categories', rows: listRows }
    ]);
  
  // STEP 5: SUB CATEGORY - LIST
  } else if (user.step === 'main_category') {
    const roleData = CONFIG[user.role];
    const selectedCat = roleData.main_categories.find(c => c.id === reply_id);
    
    if (selectedCat) {
      saveUser(from, { step: 'sub_category', data: {...user.data, main_cat: reply_id, main_cat_title: selectedCat.title} });
      
      const subRows = selectedCat.sub_categories.map(sub => ({
        id: sub.id,
        title: sub.title,
        description: sub.keywords? sub.keywords.slice(0,2).join(', ') : ''
      }));
      
      await sendList(from, `${selectedCat.title} me kya chahiye?`, `Select Sub-Category`, [
        { title: 'Sub Categories', rows: subRows }
      ]);
    }
  
  // STEP 6: PHOTO/TEXT
  } else if (user.step === 'sub_category') {
    const selectedSub = user.data.main_cat;
    const roleData = CONFIG[user.role];
    const mainCat = roleData.main_categories.find(c => c.id === selectedSub);
    const subCat = mainCat.sub_categories.find(s => s.id === reply_id);
    
    saveUser(from, { step: 'other_info', data: {...user.data, sub_cat: reply_id, sub_cat_title: subCat.title} });
    await sendButtons(from, `Extra details/photo dena hai?`, [
      { type: 'reply', reply: { id: 'other_photo', title: '📷 Photo' } },
      { type: 'reply', reply: { id: 'other_text', title: '✍️ Text' } },
      { type: 'reply', reply: { id: 'other_skip', title: 'Skip' } }
    ]);
  
  } else if (user.step === 'other_info' && reply_id === 'other_photo') {
    saveUser(from, { step: 'photo_upload' });
    await sendText(from, `📷 Photo bhejo`);
  
  } else if (user.step === 'photo_upload' && msg.type === 'image') {
    const imageUrl = await downloadMedia(msg.image.id);
    saveUser(from, { step: 'whatsapp_num', data: {...user.data, photo_url: imageUrl} });
    await sendText(from, `✅ Photo mil gaya!\n\nContact WhatsApp Number bhejo`);
  
  } else if (user.step === 'other_info' && reply_id === 'other_text') {
    saveUser(from, { step: 'other_text_wait' });
    await sendText(from, `Details type karo:`);
  
  } else if (user.step === 'other_text_wait' && msg.type === 'text') {
    saveUser(from, { step: 'whatsapp_num', data: {...user.data, other_text: msg.text.body} });
    await sendText(from, `Contact WhatsApp Number bhejo`);
  
  } else if (user.step === 'other_info' && reply_id === 'other_skip') {
    saveUser(from, { step: 'whatsapp_num' });
    await sendText(from, `Contact WhatsApp Number bhejo`);
  
  // STEP 8: CONFIRM
  } else if (user.step === 'whatsapp_num' && msg.type === 'text') {
    saveUser(from, { step: 'done', data: {...user.data, contact: msg.text.body} });
    await sendButtons(from,
      `✅ Success!\n\nCategory: ${user.data.main_cat_title}\nSub-Cat: ${user.data.sub_cat_title}\nPhoto: ${user.data.photo_url? 'Yes' : 'No'}`,
      [{ type: 'reply', reply: { id: 'restart', title: '🔄 Restart' } }]
    );
  }
  
  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`NearMe Bot Running`));
