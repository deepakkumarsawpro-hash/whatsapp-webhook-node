const express = require('express');
const axios = require('axios');
const fs = require('fs');
const app = express();
app.use(express.json());

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

const USERS_FILE = 'users.json';
const PROVIDERS_FILE = 'providers.json';
const REQUESTS_FILE = 'requests.json';

// Files create karo agar nahi hai
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, '{}');
if (!fs.existsSync(PROVIDERS_FILE)) fs.writeFileSync(PROVIDERS_FILE, '[]');
if (!fs.existsSync(REQUESTS_FILE)) fs.writeFileSync(REQUESTS_FILE, '[]');

const CATEGORIES = {
  "customer": {
    "main_categories": [
      { "id": "cat_construction", "title": "Construction & Home Improvement", "sub_categories": [{ "id": "sub_mason", "title": "Mason - मिस्त्री" }, { "id": "sub_plumber", "title": "Plumber" }, { "id": "sub_electrician", "title": "Electrician" }, { "id": "sub_carpenter", "title": "Carpenter" }, { "id": "sub_paint", "title": "Paint & Hardware" }] },
      { "id": "cat_automotive", "title": "Automotive & Logistics", "sub_categories": [{ "id": "sub_mechanic", "title": "Mechanic" }, { "id": "sub_spare", "title": "Spare Parts" }, { "id": "sub_transport", "title": "Transport" }, { "id": "sub_courier", "title": "Courier" }] },
      { "id": "cat_food", "title": "Food & Hospitality", "sub_categories": [{ "id": "sub_restaurant", "title": "Restaurant/Dhaba" }, { "id": "sub_catering", "title": "Catering/Events" }, { "id": "sub_bakery", "title": "Bakery/Dairy" }] },
      { "id": "cat_retail", "title": "Retail & Daily Needs", "sub_categories": [{ "id": "sub_kirana", "title": "Grocery/Kirana" }, { "id": "sub_electronics", "title": "Electronics" }, { "id": "sub_fashion", "title": "Fashion/Tailor" }, { "id": "sub_stationery", "title": "Stationery/Printing" }] },
      { "id": "cat_healthcare", "title": "Healthcare & Education", "sub_categories": [{ "id": "sub_clinic", "title": "Clinic/Doctor" }, { "id": "sub_pharmacy", "title": "Pharmacy" }, { "id": "sub_coaching", "title": "Coaching/Tutor" }] },
      { "id": "cat_personal", "title": "Personal & Professional Services", "sub_categories": [{ "id": "sub_salon", "title": "Salon/Beauty" }, { "id": "sub_cleaning", "title": "Cleaning" }, { "id": "sub_financial", "title": "Financial/Legal" }, { "id": "sub_realestate", "title": "Real Estate" }] },
      { "id": "cat_agriculture", "title": "Agriculture & Farming", "sub_categories": [{ "id": "sub_agri_inputs", "title": "Agri-Inputs" }, { "id": "sub_agri_equip", "title": "Agri-Equipment" }] }
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

// ===== HELPER FUNCTIONS =====
function getUser(number) {
  const db = JSON.parse(fs.readFileSync(USERS_FILE));
  return db[number] || { step: 'welcome', data: {} };
}

function saveUser(number, data) {
  const db = JSON.parse(fs.readFileSync(USERS_FILE));
  db[number] = {...getUser(number),...data};
  fs.writeFileSync(USERS_FILE, JSON.stringify(db, null, 2));
}

function saveProvider(providerData) {
  const providers = JSON.parse(fs.readFileSync(PROVIDERS_FILE));
  // Agar pehle se hai to update karo
  const idx = providers.findIndex(p => p.whatsapp === providerData.whatsapp);
  if (idx >= 0) providers[idx] = providerData;
  else providers.push(providerData);
  fs.writeFileSync(PROVIDERS_FILE, JSON.stringify(providers, null, 2));
}

function getProviders(mainCat, subCat) {
  const providers = JSON.parse(fs.readFileSync(PROVIDERS_FILE));
  return providers.filter(p => p.main_cat === mainCat && p.sub_cat === subCat);
}

function saveRequest(requestData) {
  const requests = JSON.parse(fs.readFileSync(REQUESTS_FILE));
  requests.push({...requestData, id: Date.now(), status: 'open'});
  fs.writeFileSync(REQUESTS_FILE, JSON.stringify(requests, null, 2));
  return requests[requests.length - 1].id;
}

function getRequest(id) {
  const requests = JSON.parse(fs.readFileSync(REQUESTS_FILE));
  return requests.find(r => r.id === id);
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

// ===== DISTANCE CALCULATION =====
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // KM
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
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
    // PROVIDER REPLY TO CUSTOMER REQUEST
    if (reply_id.startsWith('interested_')) {
      const requestId = reply_id.split('_')[1];
      const request = getRequest(parseInt(requestId));
      if (request) {
        // Customer ko provider ka contact bhejo
        await sendText(request.customer_whatsapp,
          `✅ Ek ${user.data.sub_cat_title} available hai!\n\nName: ${user.data.shop_name}\nContact: ${user.data.contact}\n\nAap direct baat kar sakte hai.`
        );
        await sendText(from, `✅ Customer ko aapka number bhej diya gaya hai.`);
      }
      return res.sendStatus(200);
    }

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
        saveUser(from, { step: 'provider_name', role: 'provider', provider_type: reply_id === 'role_sale'? 'Sale' : 'Service' });
        await sendText(from, `Apni Shop/Service ka naam bhejo`);
      }

    // STEP 3: DISTANCE OR SHOP NAME
    } else if (user.step === 'customer_dist') {
      saveUser(from, { step: 'location_wait', data: {...user.data, distance: parseInt(reply_id.split('_')[1])} });
      await sendText(from, `📍 Ab apna Exact Location bhejo\n\n📎 dabao → Location → Send Current Location`);

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
      await sendText(from, `❌ Location nahi mila!\n\n📍 Sirf GPS Location bhejo\n📎 → Location → Send Current Location`);

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

    // STEP 6: SUB CATEGORY SELECTED - PHOTO/TEXT OPTION
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
      saveUser(from, { step: 'whatsapp_num', data: {...user.data, has_photo: true} });
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

    // STEP 7: WHATSAPP NUMBER - FINAL STEP
    } else if (user.step === 'whatsapp_num' && msg.type === 'text') {
      const contact = msg.text.body.trim();
      if (/^\d{10}$/.test(contact)) {
        const finalData = {...user.data, contact: contact, whatsapp: from};

        if (user.role === 'provider') {
          // PROVIDER REGISTER KARO
          saveProvider(finalData);
          saveUser(from, { step: 'done' });
          await sendText(from, `✅ ${user.data.provider_type} Register Ho Gaya!\n\nAapka: ${user.data.shop_name}\nCategory: ${user.data.main_cat_title}\nSub: ${user.data.sub_cat_title}\n\nJab koi customer is category me requirement dalega to aapko turant message milega.`);

        } else {
          // CUSTOMER REQUEST - PROVIDERS KO ALERT BHEJO
          const requestId = saveRequest({...finalData, customer_whatsapp: from});
          const providers = getProviders(user.data.main_cat, user.data.sub_cat);

          let matchedProviders = 0;
          for (const provider of providers) {
            const dist = getDistance(user.data.lat, user.data.lng, provider.lat, provider.lng);
            if (dist <= user.data.distance) {
              matchedProviders++;
              // Provider ko alert bhejo
              await sendButtons(provider.whatsapp,
                `🔔 New Customer Request!\n\nCategory: ${user.data.main_cat_title}\nSub: ${user.data.sub_cat_title}\nDistance: ${dist.toFixed(1)} KM\nDetails: ${user.data.other_text || 'No details'}\n\nKya aap interested hai?`,
                [{ type: 'reply', reply: { id: `interested_${requestId}`, title: '✅ Interested' } }]
              );
            }
          }

          saveUser(from, { step: 'done' });
          await sendText(from, `✅ Request Submit Ho Gayi!\n\n${matchedProviders} ${user.data.sub_cat_title} providers ko alert bhej diya gaya hai.\n\nJab koi interested hoga to aapko unka contact mil jayega.`);
        }
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
app.listen(PORT, () => console.log(`NearMe Marketplace Bot Running`));
