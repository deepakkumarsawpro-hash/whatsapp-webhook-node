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

const CATEGORIES = {
  "customer": {
    "main_categories": [
      { "id": "cat_construction", "title": "Construction & Home Improvement", "description": "Mason, Plumber, Electrician", "sub_categories": [{ "id": "sub_mason", "title": "Mason - मिस्त्री" }, { "id": "sub_plumber", "title": "Plumber" }, { "id": "sub_electrician", "title": "Electrician" }, { "id": "sub_carpenter", "title": "Carpenter" }, { "id": "sub_paint", "title": "Paint & Hardware" }] },
      { "id": "cat_automotive", "title": "Automotive & Logistics", "description": "Mechanic, Transport, Courier", "sub_categories": [{ "id": "sub_mechanic", "title": "Mechanic" }, { "id": "sub_spare", "title": "Spare Parts" }, { "id": "sub_transport", "title": "Transport" }, { "id": "sub_courier", "title": "Courier" }] },
      { "id": "cat_food", "title": "Food & Hospitality", "description": "Restaurant, Catering, Bakery", "sub_categories": [{ "id": "sub_restaurant", "title": "Restaurant/Dhaba" }, { "id": "sub_catering", "title": "Catering/Events" }, { "id": "sub_bakery", "title": "Bakery/Dairy" }] },
      { "id": "cat_retail", "title": "Retail & Daily Needs", "description": "Kirana, Electronics, Fashion", "sub_categories": [{ "id": "sub_kirana", "title": "Grocery/Kirana" }, { "id": "sub_electronics", "title": "Electronics" }, { "id": "sub_fashion", "title": "Fashion/Tailor" }, { "id": "sub_stationery", "title": "Stationery/Printing" }] },
      { "id": "cat_healthcare", "title": "Healthcare & Education", "description": "Doctor, Pharmacy, Coaching", "sub_categories": [{ "id": "sub_clinic", "title": "Clinic/Doctor" }, { "id": "sub_pharmacy", "title": "Pharmacy" }, { "id": "sub_coaching", "title": "Coaching/Tutor" }] },
      { "id": "cat_personal", "title": "Personal & Professional Services", "description": "Salon, Cleaning, Legal", "sub_categories": [{ "id": "sub_salon", "title": "Salon/Beauty" }, { "id": "sub_cleaning", "title": "Cleaning" }, { "id": "sub_financial", "title": "Financial/Legal" }, { "id": "sub_realestate", "title": "Real Estate" }] },
      { "id": "cat_agriculture", "title": "Agriculture & Farming", "description": "Seeds, Equipment, Tractor", "sub_categories": [{ "id": "sub_agri_inputs", "title": "Agri-Inputs" }, { "id": "sub_agri_equip", "title": "Agri-Equipment" }] }
    ]
  },
  "provider": {
    "main_categories": [
      { "id": "cat_construction", "title": "Construction & Home Improvement", "sub_categories": [{ "id": "sub_mason", "title": "Mason - मिस्त्री" }, { "id": "sub_plumber", "title": "Plumber" }, { "id": "sub_electrician", "title": "Electrician" }, { "id": "sub_carpenter", "title": "Carpenter" }, { "id": "sub_paint", "title": "Paint & Hardware" }] },
      { "id": "cat_automotive", "title": "Automotive & Logistics", "sub_categories": [{ "id": "sub_mechanic", "title": "Mechanic" }, { "id": "sub_spare", "title": "Spare Parts Shop" }, { "id": "sub_transport", "title": "Transport Service" }, { "id": "sub_courier", "title": "Courier Service" }] },
      { "id": "cat_food", "title": "Food & Hospitality", "sub_categories": [{ "id": "sub_restaurant", "title": "Restaurant/Dhaba" }, { "id": "sub_catering", "title": "Catering/Events" }, { "id": "sub_bakery", "title": "Bakery/Dairy" }] },
      { "id": "cat_retail", "title": "Retail & Daily Needs", "sub_categories": [{ "id": "sub_kirana", "title": "Grocery/Kirana" }, { "id": "sub_electronics", "title": "Electronics Shop" }, { "id": "sub_fashion", "title": "Fashion/Tailor" }, { "id": "sub_stationery", "title": "Stationery/Printing" }] },
      { "id": "cat_healthcare", "title": "Healthcare & Education", "sub_categories": [{ "id": "sub_clinic", "title": "Clinic/Doctor" }, { "id": "sub_pharmacy", "title": "Pharmacy" }, { "id": "sub_coaching", "title": "Coaching/Tutor" }] },
      { "id": "cat_personal", "title": "Personal & Professional Services", "sub_categories": [{ "id": "sub_salon", "title": "Salon/Beauty" }, { "id": "sub_cleaning", "title": "Cleaning Service" }, { "id": "sub_financial", "title": "Financial/Legal" }, { "id": "sub_realestate", "title": "Real Estate" }] },
      { "id": "cat_agriculture", "title": "Agriculture & Farming", "sub_categories": [{ "id": "sub_agri_inputs", "title": "Agri-Inputs Shop" }, { "id": "sub_agri_equip", "title": "Agri-Equipment" }] }
    ]
  }
};

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
  try {
    await axios.post(`https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`, {
      messaging_product: 'whatsapp', to: to, type: 'interactive',
      interactive: { type: 'button', body: { text: bodyText }, action: { buttons: buttons } }
    }, { headers: { 'Authorization': `Bearer ${WHATSAPP_TOKEN}` } });
  } catch (e) { console.error('Button Error:', e.response?.data || e.message); }
}

async function sendList(to, bodyText, buttonText, sections) {
  try {
    await axios.post(`https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`, {
      messaging_product: 'whatsapp', to: to, type: 'interactive',
      interactive: { type: 'list', body: { text: bodyText }, action: { button: buttonText, sections: sections } }
    }, { headers: { 'Authorization': `Bearer ${WHATSAPP_TOKEN}` } });
  } catch (e) { console.error('List Error:', e.response?.data || e.message); }
}

async function sendText(to, text) {
  try {
    await axios.post(`https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`, {
      messaging_product: 'whatsapp', to: to, text: { body: text }
    }, { headers: { 'Authorization': `Bearer ${WHATSAPP_TOKEN}` } });
  } catch (e) { console.error('Text Error:', e.response?.data || e.message); }
}

async function downloadMedia(mediaId) {
  try {
    const mediaUrl = await axios.get(`https://graph.facebook.com/v20.0/${mediaId}`, {
      headers: { 'Authorization': `Bearer ${WHATSAPP_TOKEN}` }
    });
    return mediaUrl.data.url;
  } catch (e) { return null; }
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

  let reply_id = '';
  if (msg.type === 'interactive') {
    if (msg.interactive.type === 'button_reply') reply_id = msg.interactive.button_reply.id;
    if (msg.interactive.type === 'list_reply') reply_id = msg.interactive.list_reply.id;
  } else if (msg.type === 'text') {
    reply_id = msg.text.body.toLowerCase().trim();
  }

  try {
    // STEP 1: WELCOME
    if (user.step === 'welcome' || reply_id === 'hi' || reply_id === 'restart' || reply_id === 'start') {
      saveUser(from, { step: 'role', data: {} });
      await sendButtons(from, `Welcome to NearMe 🙏\n\nAap kya karna chahte hai?`, [
        { type: 'reply', reply: { id: 'role_sale', title: '🛒 Sale' } },
        { type: 'reply', reply: { id: 'role_service', title: '🔧 Service' } },
        { type: 'reply', reply: { id: 'role_customer', title: '👤 Customer' } }
      ]);

    // STEP 2: ROLE
    } else if (user.step === 'role') {
      if (reply_id === 'role_customer') {
        saveUser(from, { step: 'customer_dist', role: 'customer' });
        await sendButtons(from, `Kitne KM ke andar dhoondhna hai?`, [
          { type: 'reply', reply: { id: 'dist_2', title: '2 KM' } },
          { type: 'reply', reply: { id: 'dist_5', title: '5 KM' } },
          { type: 'reply', reply: { id: 'dist_10', title: '10 KM' } }
        ]);
      } else {
        saveUser(from, { step: 'provider_name', role: 'provider' });
        await sendText(from, `Apni Shop/Service ka naam bhejo`);
      }

    // STEP 3: DISTANCE OR SHOP NAME
    } else if (user.step === 'customer_dist') {
      saveUser(from, { step: 'location_wait', data: {...user.data, distance: reply_id} });
      await sendText(from, `📍 Ab apna Exact Location bhejo\n\n📎 dabao → Location → Send Current Location\n\nNote: Mobile WhatsApp App se hi kaam karega`);

    } else if (user.step === 'provider_name' && msg.type === 'text') {
      saveUser(from, { step: 'location_wait', data: {...user.data, shop_name: msg.text.body} });
      await sendText(from, `📍 Shop ka Exact Location bhejo\n\n📎 dabao → Location → Send Current Location`);

    // STEP 4: LOCATION RECEIVED - MAIN CATEGORY LIST
    } else if (user.step === 'location_wait' && msg.type === 'location') {
      saveUser(from, {
        step: 'main_category',
        data: {...user.data, lat: msg.location.latitude, lng: msg.location.longitude }
      });

      const roleData = CATEGORIES[user.role];
      const listRows = roleData.main_categories.map(cat => ({
        id: cat.id,
        title: cat.title.substring(0, 24),
        description: (cat.description || '').substring(0, 72)
      }));

      await sendList(from, `✅ Location mil gaya!\n\nAb Category choose karo:`, `Categories`, [
        { title: 'Main Categories', rows: listRows }
      ]);

    } else if (user.step === 'location_wait' && msg.type!== 'location') {
      await sendText(from, `❌ Location nahi mila!\n\n📍 Sirf GPS Location bhejo\n📎 → Location → Send Current Location\n\nText mat bhejo`);

    // STEP 5: SUB CATEGORY
    } else if (user.step === 'main_category') {
      const roleData = CATEGORIES[user.role];
      const selectedCat = roleData.main_categories.find(c => c.id === reply_id);

      if (selectedCat && selectedCat.sub_categories.length > 0) {
        saveUser(from, { step: 'sub_category', data: {...user.data, main_cat: reply_id, main_cat_title: selectedCat.title} });

        const subRows = selectedCat.sub_categories.map(sub => ({
          id: sub.id,
          title: sub.title.substring(0, 24),
          description: ''
        }));

        await sendList(from, `${selectedCat.title} me kya chahiye?`, `Sub-Category`, [
          { title: 'Sub Categories', rows: subRows }
        ]);
      }

    // STEP 6: SUB CATEGORY SELECTED - PHOTO/TEXT OPTION WAPAS LAYA
    } else if (user.step === 'sub_category') {
      const mainCat = CATEGORIES[user.role].main_categories.find(c => c.id === user.data.main_cat);
      const subCat = mainCat.sub_categories.find(s => s.id === reply_id);

      saveUser(from, { step: 'other_info', data: {...user.data, sub_cat: reply_id, sub_cat_title: subCat.title} });
      await sendButtons(from, `Extra details ya photo dena hai?`, [
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
      await sendText(from, `✅ Photo save ho gaya!\n\n📱 Contact ke liye WhatsApp Number bhejo\n\nExample: 9876543210`);

    } else if (user.step === 'other_info' && reply_id === 'other_text') {
      saveUser(from, { step: 'other_text_wait' });
      await sendText(from, `Details type karo:`);

    } else if (user.step === 'other_text_wait' && msg.type === 'text') {
      saveUser(from, { step: 'whatsapp_num', data: {...user.data, other_text: msg.text.body} });
      await sendText(from, `📱 Contact ke liye WhatsApp Number bhejo\n\nExample: 9876543210`);

    } else if (user.step === 'other_info' && reply_id === 'other_skip') {
      saveUser(from, { step: 'whatsapp_num' });
      await sendText(from, `📱 Contact ke liye WhatsApp Number bhejo\n\nExample: 9876543210`);

    // STEP 7: WHATSAPP NUMBER RECEIVED - DONE
    } else if (user.step === 'whatsapp_num' && msg.type === 'text') {
      const contact = msg.text.body.trim();
      if (/^\d{10}$/.test(contact)) {
        saveUser(from, { step: 'done', data: {...user.data, contact: contact} });
        await sendButtons(from,
          `✅ Done!\n\nCategory: ${user.data.main_cat_title}\nSub: ${user.data.sub_cat_title}\nContact: ${contact}\nLocation: GPS Saved\nPhoto: ${user.data.photo_url? 'Yes' : 'No'}\nDetails: ${user.data.other_text || 'No'}\n\nFir se shuru kare?`,
          [{ type: 'reply', reply: { id: 'restart', title: '🔄 Restart' } }]
        );
      } else {
        await sendText(from, `❌ Galat number!\n\n10 digit WhatsApp number bhejo\nExample: 9876543210`);
      }
    }

  } catch (err) {
    console.error('Error:', err.message);
    await sendText(from, `Kuch error aa gaya. 'restart' type karo.`);
  }

  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`NearMe Bot Running`));
