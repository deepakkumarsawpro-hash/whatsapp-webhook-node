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
      {
        "id": "cat_construction",
        "title": "Construction & Home Improvement",
        "description": "Mason, Plumber, Electrician, Carpenter",
        "sub_categories": [
          { "id": "sub_mason", "title": "Mason - मिस्त्री", "keywords": ["mason", "raj mistri", "construction", "दीवार"] },
          { "id": "sub_plumber", "title": "Plumber", "keywords": ["pipe fitting", "water tank", "tap repair", "प्लंबर"] },
          { "id": "sub_electrician", "title": "Electrician", "keywords": ["wiring", "inverter repair", "switchboard", "इलेक्ट्रीशियन"] },
          { "id": "sub_carpenter", "title": "Carpenter", "keywords": ["furniture", "door fitting", "wood work", "बढ़ई"] },
          { "id": "sub_paint", "title": "Paint & Hardware", "keywords": ["wall paint", "putty", "cement", "paint shop", "पेंट"] }
        ]
      },
      {
        "id": "cat_automotive",
        "title": "Automotive & Logistics",
        "description": "Mechanic, Transport, Courier",
        "sub_categories": [
          { "id": "sub_mechanic", "title": "Mechanic", "keywords": ["bike repair", "car service", "engine work", "मैकेनिक"] },
          { "id": "sub_spare", "title": "Spare Parts", "keywords": ["tires", "lubricants", "engine oil", "स्पेयर पार्ट्स"] },
          { "id": "sub_transport", "title": "Transport", "keywords": ["pickup", "truck rental", "tractor", "टैक्सी", "tempo"] },
          { "id": "sub_courier", "title": "Courier", "keywords": ["parcel service", "delivery", "लॉजिस्टिक्स", "courier"] }
        ]
      },
      {
        "id": "cat_food",
        "title": "Food & Hospitality",
        "description": "Restaurant, Catering, Bakery",
        "sub_categories": [
          { "id": "sub_restaurant", "title": "Restaurant/Dhaba", "keywords": ["food", "breakfast", "lunch", "dinner", "होटल", "ढाबा"] },
          { "id": "sub_catering", "title": "Catering/Events", "keywords": ["tent house", "decoration", "party order", "कैटरिंग"] },
          { "id": "sub_bakery", "title": "Bakery/Dairy", "keywords": ["cake", "milk", "sweets", "मिठाई", "बेकरी", "dairy"] }
        ]
      },
      {
        "id": "cat_retail",
        "title": "Retail & Daily Needs",
        "description": "Kirana, Electronics, Fashion",
        "sub_categories": [
          { "id": "sub_kirana", "title": "Grocery/Kirana", "keywords": ["rice", "oil", "general store", "किराना", "राशन"] },
          { "id": "sub_electronics", "title": "Electronics", "keywords": ["mobile shop", "fridge", "ac repair", "इलेक्ट्रॉनिक्स"] },
          { "id": "sub_fashion", "title": "Fashion/Tailor", "keywords": ["clothes", "stitching", "tailoring", "कपड़े", "दर्जी"] },
          { "id": "sub_stationery", "title": "Stationery/Printing", "keywords": ["photostat", "book store", "printout", "फोटोकॉपी"] }
        ]
      },
      {
        "id": "cat_healthcare",
        "title": "Healthcare & Education",
        "description": "Doctor, Pharmacy, Coaching",
        "sub_categories": [
          { "id": "sub_clinic", "title": "Clinic/Doctor", "keywords": ["medical", "health", "consultant", "डॉक्टर", "क्लिनिक"] },
          { "id": "sub_pharmacy", "title": "Pharmacy", "keywords": ["medicines", "medical store", "दवा दुकान", "chemist"] },
          { "id": "sub_coaching", "title": "Coaching/Tutor", "keywords": ["tuition", "coaching center", "home tutor", "ट्यूशन"] }
        ]
      },
      {
        "id": "cat_personal",
        "title": "Personal & Professional Services",
        "description": "Salon, Cleaning, Legal",
        "sub_categories": [
          { "id": "sub_salon", "title": "Salon/Beauty", "keywords": ["haircut", "beauty parlor", "grooming", "सैलून"] },
          { "id": "sub_cleaning", "title": "Cleaning", "keywords": ["sofa cleaning", "housekeeping", "सेप्टिक टैंक सफाई"] },
          { "id": "sub_financial", "title": "Financial/Legal", "keywords": ["ca", "lawyer", "insurance", "वकील", "फाइनेंस"] },
          { "id": "sub_realestate", "title": "Real Estate", "keywords": ["property dealer", "land", "rent", "रियल एस्टेट"] }
        ]
      },
      {
        "id": "cat_agriculture",
        "title": "Agriculture & Farming",
        "description": "Seeds, Equipment, Tractor",
        "sub_categories": [
          { "id": "sub_agri_inputs", "title": "Agri-Inputs", "keywords": ["seeds", "fertilizer", "pesticides", "बीज", "खाद"] },
          { "id": "sub_agri_equip", "title": "Agri-Equipment", "keywords": ["tractor repair", "harvester", "कृषि उपकरण"] }
        ]
      }
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

app.get('/webhook', (req, res) => {
  if (req.query['hub.verify_token'] === VERIFY_TOKEN) res.send(req.query['hub.challenge']);
  else res.sendStatus(403);
});

app.post('/webhook', async (req, res) => {
  const msg = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (!msg) return res.sendStatus(200);

  const from = msg.from;
  const user = getUser(from);

  console.log('User:', from, 'Step:', user.step, 'MsgType:', msg.type); // DEBUG LOG

  let reply_id = '';
  if (msg.type === 'interactive') {
    if (msg.interactive.type === 'button_reply') reply_id = msg.interactive.button_reply.id;
    if (msg.interactive.type === 'list_reply') reply_id = msg.interactive.list_reply.id;
  } else if (msg.type === 'text') {
    reply_id = msg.text.body.toLowerCase();
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
      saveUser(from, { step: 'location', data: {...user.data, distance: reply_id} });
      await sendText(from, `📍 Ab apna Current Location bhejo\n\n📎 button dabao → Location → Send Current Location`);

    } else if (user.step === 'provider_name' && msg.type === 'text') {
      saveUser(from, { step: 'location', data: {...user.data, shop_name: msg.text.body} });
      await sendText(from, `📍 Shop ka Location bhejo\n\n📎 button dabao → Location`);

    // STEP 4: LOCATION RECEIVED - MAIN CATEGORY LIST
    } else if (user.step === 'location' && msg.type === 'location') {
      console.log('Location received:', msg.location.latitude, msg.location.longitude); // DEBUG

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

      await sendList(from, `✅ Location mil gaya!\n\nCategory choose karo:`, `Categories`, [
        { title: 'Main Categories', rows: listRows }
      ]);

    // STEP 5: SUB CATEGORY
    } else if (user.step === 'main_category') {
      const roleData = CATEGORIES[user.role];
      const selectedCat = roleData.main_categories.find(c => c.id === reply_id);

      if (selectedCat && selectedCat.sub_categories.length > 0) {
        saveUser(from, { step: 'sub_category', data: {...user.data, main_cat: reply_id, main_cat_title: selectedCat.title} });

        const subRows = selectedCat.sub_categories.map(sub => ({
          id: sub.id,
          title: sub.title.substring(0, 24),
          description: sub.keywords? sub.keywords.slice(0,2).join(', ').substring(0, 72) : ''
        }));

        await sendList(from, `${selectedCat.title} me kya chahiye?`, `Sub-Category`, [
          { title: 'Sub Categories', rows: subRows }
        ]);
      } else {
        await sendText(from, `Category nahi mili. Restart karo.`);
      }

    // STEP 6: SUB CATEGORY SELECTED
    } else if (user.step === 'sub_category') {
      const mainCat = CATEGORIES[user.role].main_categories.find(c => c.id === user.data.main_cat);
      const subCat = mainCat.sub_categories.find(s => s.id === reply_id);

      saveUser(from, { step: 'whatsapp_num', data: {...user.data, sub_cat: reply_id, sub_cat_title: subCat.title} });
      await sendText(from, `Contact WhatsApp Number bhejo`);

    // STEP 7: DONE
    } else if (user.step === 'whatsapp_num' && msg.type === 'text') {
      saveUser(from, { step: 'done', data: {...user.data, contact: msg.text.body} });
      await sendButtons(from,
        `✅ Done!\n\nCategory: ${user.data.main_cat_title}\nSub: ${user.data.sub_cat_title}\nContact: ${msg.text.body}\n\nFir se shuru kare?`,
        [{ type: 'reply', reply: { id: 'restart', title: '🔄 Restart' } }]
      );

    // LOCATION MANGA BUT KUCH AUR BHEJA
    } else if (user.step === 'location' && msg.type!== 'location') {
      await sendText(from, `📍 Location bhejo bhai!\n\n📎 dabao → Location → Send Current Location\n\nText mat bhejo, location bhejo.`);
    }

  } catch (err) {
    console.error('Error:', err.message);
    await sendText(from, `Kuch error aa gaya. 'restart' type karo.`);
  }

  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`NearMe Bot Running`));
