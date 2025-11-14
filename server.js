/**
 * Mental Health Platform - Express Server
 * Compatible with both local development and Vercel deployment
 */

const express = require('express');
const cors = require('cors');
require('dotenv').config();
const path = require('path');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const admin = require('firebase-admin');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Health check endpoint (for Vercel monitoring)
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

/**
 * GPT Chat API - in-memory store (robust)
 * POST /api/messages - Save a message
 * GET /api/messages - Get all messages
 */
let _chatMessages = [];
// Try to hydrate from env (best-effort)
try{ const envMsgs = JSON.parse(process.env.CHAT_MESSAGES || '[]'); if(Array.isArray(envMsgs) && envMsgs.length) _chatMessages = envMsgs.slice(-500); }catch(e){ /* ignore */ }

// Optional: initialize Firebase Admin SDK if service account provided (base64 JSON or raw JSON string)
let _adminDb = null;
let _adminIsRealtime = false;
try{
  const saEnv = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 || process.env.FIREBASE_SERVICE_ACCOUNT || '';
  if(saEnv && String(saEnv).trim()){
    let saObj = null;
    try{
      if(String(saEnv).trim().startsWith('{')) saObj = JSON.parse(saEnv);
      else saObj = JSON.parse(Buffer.from(saEnv, 'base64').toString('utf8'));
    }catch(e){ console.warn('Failed to parse FIREBASE service account JSON from env', e); }
    if(saObj){
      // If a realtime DB URL is provided in env, prefer initializing Admin with databaseURL
      const dbUrl = process.env.FIREBASE_DATABASE_URL || process.env.VITE_FIREBASE_DATABASE_URL || '';
      const adminInit = { credential: admin.credential.cert(saObj) };
      if(dbUrl) adminInit.databaseURL = dbUrl;
      admin.initializeApp(adminInit);
      if(dbUrl){
        try{
          _adminDb = admin.database();
          _adminIsRealtime = true;
          console.log('✅ Firebase Admin initialized for server-side Realtime Database (RTDB) persistence');
        }catch(e){
          console.warn('Failed to initialize Admin RTDB, falling back to Firestore', e);
          _adminDb = admin.firestore();
          _adminIsRealtime = false;
          console.log('✅ Firebase Admin initialized for server-side Firestore persistence');
        }
      } else {
        _adminDb = admin.firestore();
        _adminIsRealtime = false;
        console.log('✅ Firebase Admin initialized for server-side Firestore persistence');
      }
    }
  }
}catch(e){ console.warn('Firebase Admin initialization error', e); }

// Debug endpoint to check Admin initialization status (does not expose secrets)
app.get('/api/debug-admin', (req, res) => {
  try{
    const saPresent = !!(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 || process.env.FIREBASE_SERVICE_ACCOUNT);
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || null;
    const dbType = _adminDb ? (_adminIsRealtime ? 'realtime' : 'firestore') : 'none';
    return res.json({ success: true, adminInitialized: !!_adminDb, databaseType: dbType, serviceAccountPresent: saPresent, projectId: projectId || 'not-set' });
  }catch(err){
    console.error('debug-admin error', err);
    return res.status(500).json({ success: false, error: 'debug_failed' });
  }
});

app.post('/api/messages', async (req, res) => {
  try{
    const { from, email, text, timestamp } = req.body || {};
    if(!from || !email || !text) return res.status(400).json({ error: 'Missing required fields: from, email, text' });

    let msg = { from, email, text, timestamp: timestamp || Date.now(), ts: new Date().toLocaleTimeString(), id: Date.now() };
    _chatMessages.push(msg);
    if(_chatMessages.length > 500) _chatMessages = _chatMessages.slice(-500);
    // best-effort persist to env
    try{ process.env.CHAT_MESSAGES = JSON.stringify(_chatMessages); }catch(e){ /* ignore */ }

    // If Admin SDK configured, persist into Firestore 'chats' collection for production persistence
    if(_adminDb){
      try{
        if(_adminIsRealtime){
          // push to RTDB under 'chats'
          const ref = _adminDb.ref('chats');
          const newRef = ref.push();
          const payload = { from: msg.from, email: msg.email, text: msg.text, timestamp: msg.timestamp };
          await newRef.set(payload);
          if(newRef.key){ msg.id = newRef.key; _chatMessages[_chatMessages.length-1] = msg; }
        } else {
          const docRef = await _adminDb.collection('chats').add({ from: msg.from, email: msg.email, text: msg.text, timestamp: admin.firestore.FieldValue.serverTimestamp() });
          if(docRef && docRef.id){ msg.id = docRef.id; _chatMessages[_chatMessages.length-1] = msg; }
        }
      }catch(e){ console.warn('Failed to persist message via Admin SDK', e); }
    }

    return res.json({ success: true, message: 'Message saved', id: msg.id });
  }catch(err){ console.error('❌ /api/messages POST error', err); return res.status(500).json({ error: 'server_error', detail: err.message }); }
});

app.get('/api/messages', async (req, res) => {
  try{
    // If Admin SDK is configured, read the latest 30 messages from Firestore for canonical data
    if(_adminDb){
        if(_adminIsRealtime){
          // Read last 30 messages from RTDB (ordered by timestamp ascending)
          try{
            const dbRef = _adminDb.ref('chats');
            // Use once to get snapshot; limitToLast to get newest
            const snap = await dbRef.orderByChild('timestamp').limitToLast(30).once('value');
            const data = snap.val() || {};
            const msgs = Object.keys(data).map(k => ({ id: k, from: data[k].from || null, email: data[k].email || null, text: data[k].text || null, ts: (data[k].timestamp ? new Date(data[k].timestamp).toLocaleTimeString() : ''), timestamp: data[k].timestamp || Date.now() }));
            // sort oldest-first
            msgs.sort((a,b)=> (a.timestamp||0)-(b.timestamp||0));
            return res.json({ success: true, messages: msgs, count: msgs.length });
          }catch(err){ console.error('❌ /api/messages GET rtdb error', err); return res.status(500).json({ success: false, messages: [], count: 0 }); }
        } else {
          return _adminDb.collection('chats').orderBy('timestamp','desc').limit(30).get().then(snapshot => {
            const msgs = [];
            snapshot.forEach(d => {
              const data = d.data();
              msgs.push({ id: d.id, from: data.from || null, email: data.email || null, text: data.text || null, ts: (data.timestamp && data.timestamp.toDate) ? data.timestamp.toDate().toLocaleTimeString() : '', timestamp: data.timestamp ? (data.timestamp.seconds ? data.timestamp.seconds * 1000 : Date.now()) : Date.now() });
            });
            // reverse to oldest-first
            msgs.reverse();
            return res.json({ success: true, messages: msgs, count: msgs.length });
          }).catch(err => { console.error('❌ /api/messages GET firestore error', err); return res.status(500).json({ success: false, messages: [], count: 0 }); });
        }
    }
    return res.json({ success: true, messages: _chatMessages.slice(-30), count: _chatMessages.length });
  }
  catch(err){ console.error('❌ /api/messages GET error', err); return res.status(500).json({ success: false, messages: [], count: 0 }); }
});

/**
 * Report endpoint - server-side (uses Admin SDK if available)
 * POST /api/report - Save a report for a chat message
 * Body: { chatId, userId, reason, reporterId } (reporterId is the authenticated user)
 */
app.post('/api/report', async (req, res) => {
  try {
    const { chatId, userId, reason, reporterId } = req.body || {};
    
    // Validate required fields
    if (!chatId || !userId || !reason || !reporterId) {
      return res.status(400).json({ error: 'missing_fields', detail: 'chatId, userId, reason, and reporterId are required' });
    }
    
    // Validate reason length
    if (String(reason).trim().length === 0) {
      return res.status(400).json({ error: 'invalid_reason', detail: 'reason cannot be empty' });
    }

    // If Admin SDK is configured, write via Admin (server-side persistence)
    if (_adminDb) {
      try {
        if (_adminIsRealtime) {
          // Write report to RTDB
          const reportRef = _adminDb.ref('reports').push();
          const reportData = {
            chatId,
            userId,
            reporterId,
            reason: String(reason).trim(),
            timestamp: admin.database.ServerValue.TIMESTAMP
          };
          await reportRef.set(reportData);
          const reportId = reportRef.key;
          
          // Mark the chat as reported
          await _adminDb.ref(`chats/${chatId}/reported`).set(true);
          
          console.log('✅ Report created via Admin SDK (RTDB):', reportId);
          return res.json({ success: true, reportId, via: 'admin-rtdb' });
        } else {
          // Write report to Firestore
          const docRef = await _adminDb.collection('reports').add({
            chatId,
            userId,
            reporterId,
            reason: String(reason).trim(),
            timestamp: admin.firestore.FieldValue.serverTimestamp()
          });
          
          // Mark the chat as reported
          await _adminDb.collection('chats').doc(chatId).update({ reported: true });
          
          console.log('✅ Report created via Admin SDK (Firestore):', docRef.id);
          return res.json({ success: true, reportId: docRef.id, via: 'admin-firestore' });
        }
      } catch (adminErr) {
        console.error('❌ Admin SDK report write error:', adminErr);
        // Fall back to client-side write attempt
      }
    }

    // Fallback: return error if no Admin SDK
    return res.status(500).json({ error: 'server_error', detail: 'Admin SDK not initialized; reports must be written client-side or server must be configured with service account' });
  } catch (err) {
    console.error('❌ /api/report POST error:', err);
    return res.status(500).json({ error: 'server_error', detail: err.message });
  }
});

/**
 * Fallback - Serve index.html for all other routes (SPA)
 */

// Provide Firebase config to client (read from environment)
app.get('/api/firebase-config', (req, res) => {
  const cfg = {
    apiKey: process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || '',
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN || '',
    projectId: process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || '',
    // Realtime Database URL (used by client RTDB initialization)
    databaseURL: process.env.VITE_FIREBASE_DATABASE_URL || process.env.FIREBASE_DATABASE_URL || '',
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || process.env.FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.VITE_FIREBASE_APP_ID || process.env.FIREBASE_APP_ID || ''
  };
  res.json(cfg);
});

// Cloudinary config endpoint (client can GET to read cloud name / preset)
app.get('/api/cloudinary-config', (req, res) => {
  const cloudName = process.env.VITE_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME || '';
  const uploadPreset = process.env.VITE_CLOUDINARY_UPLOAD_PRESET || process.env.CLOUDINARY_UPLOAD_PRESET || '';
  if(!cloudName) return res.status(404).json({ error: 'not-configured' });
  res.json({ cloud_name: cloudName, upload_preset: uploadPreset });
});

// Cloudinary sign endpoint for signed uploads (client can POST and receive signature)
app.post('/api/cloudinary-sign', (req, res) => {
  // Prefer non-VITE env vars for secrets so they are not accidentally embedded in client builds.
  const apiSecret = (process.env.CLOUDINARY_API_SECRET || process.env.VITE_CLOUDINARY_API_SECRET || '').trim();
  const apiKey = (process.env.CLOUDINARY_API_KEY || process.env.VITE_CLOUDINARY_API_KEY || '').trim();
  const cloudName = (process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME || '').trim();
  if (!apiSecret || !apiKey || !cloudName) {
    return res.status(500).json({ error: 'Cloudinary not configured on server' });
  }
  const timestamp = Math.floor(Date.now() / 1000);
  const toSign = `timestamp=${timestamp}`;
  const signature = crypto.createHash('sha1').update(toSign + apiSecret).digest('hex');
  res.json({ signature, timestamp, api_key: apiKey, cloud_name: cloudName });
});

// Server-side upload endpoint: accepts JSON { filename, data } where data is base64-encoded file content
app.post('/api/upload-json', async (req, res) => {
  try {
    const { filename, data, transformation } = req.body || {};
    if (!data || !filename) return res.status(400).json({ error: 'missing_params' });

    const apiSecret = (process.env.CLOUDINARY_API_SECRET || process.env.VITE_CLOUDINARY_API_SECRET || '').trim();
    const apiKey = (process.env.CLOUDINARY_API_KEY || process.env.VITE_CLOUDINARY_API_KEY || '').trim();
    const cloudName = (process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME || '').trim();
    if (!apiSecret || !apiKey || !cloudName) return res.status(500).json({ error: 'Cloudinary not configured on server' });

    // Decode base64
    let fileBuffer;
    try{ fileBuffer = Buffer.from(data, 'base64'); }catch(e){ return res.status(400).json({ error: 'invalid_base64' }); }

    // Build multipart/form-data body
    const boundary = '----ServerCloudinary' + Date.now();
    const parts = [];
    function addField(name, val){ parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${val}\r\n`)); }

    const ts = Math.floor(Date.now() / 1000);
    // If caller provided a transformation string, include it; otherwise default
    const tf = transformation && String(transformation).trim() ? String(transformation).trim() : 'w_1600,c_limit';

    // Compute signature including timestamp and transformation to be safe
    const paramsToSign = [];
    paramsToSign.push(`timestamp=${ts}`);
    if(tf) paramsToSign.push(`transformation=${tf}`);
    paramsToSign.sort();
    const toSign = paramsToSign.join('&');
    const signature = crypto.createHash('sha1').update(toSign + apiSecret).digest('hex');

    addField('api_key', apiKey);
    addField('timestamp', String(ts));
    addField('signature', signature);
    if(tf) addField('transformation', tf);

    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: application/octet-stream\r\n\r\n`));
    parts.push(fileBuffer);
    parts.push(Buffer.from('\r\n'));
    parts.push(Buffer.from(`--${boundary}--\r\n`));

    const body = Buffer.concat(parts);

    const options = {
      hostname: 'api.cloudinary.com',
      port: 443,
      path: `/v1_1/${cloudName}/auto/upload`,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length
      }
    };

    const httpsReq = require('https').request(options, (httpsRes) => {
      let data = '';
      httpsRes.setEncoding('utf8');
      httpsRes.on('data', chunk => data += chunk);
      httpsRes.on('end', ()=>{
        try{ const json = JSON.parse(data); return res.json(json); }catch(e){ return res.status(500).json({ error: 'invalid_cloudinary_response', body: data }); }
      });
    });
    httpsReq.on('error', (e)=>{ console.error('Cloudinary upload error', e); return res.status(500).json({ error: 'upload_failed', detail: e.message }); });
    httpsReq.write(body);
    httpsReq.end();

  } catch (err) {
    console.error('/api/upload-json error', err);
    return res.status(500).json({ error: 'server_error', detail: err.message });
  }
});

// --- OTP via Email (SendGrid with Gmail SMTP fallback) ---
function base64url(str){ return Buffer.from(str).toString('base64').replace(/=+$/,'').replace(/\+/g,'-').replace(/\//g,'_'); }
function base64urlDecode(b64){ return Buffer.from(b64.replace(/-/g,'+').replace(/_/g,'/'),'base64').toString('utf8'); }
function signPayload(payload, secret){ return crypto.createHmac('sha256', secret).update(payload).digest('hex'); }

// Gmail SMTP transporter for fallback (when SendGrid fails)
async function sendViaGmail(toEmail, name, otp) {
  const gmailUser = process.env.GMAIL_USER || process.env.GMAIL_EMAIL;
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;
  if (!gmailUser || !gmailAppPassword) {
    console.warn('Gmail credentials not configured for fallback');
    return null;
  }
  
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: gmailUser, pass: gmailAppPassword }
    });

    const mailOptions = {
      from: gmailUser,
      to: toEmail,
      subject: 'Your AmritaCare OTP',
      text: `Hello ${name || 'User'},\n\nYour AmritaCare OTP is: ${otp}\nIt expires in 10 minutes.\n\nIf you didn't request this, please ignore this email.`
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent via Gmail:', info.messageId);
    return true;
  } catch (err) {
    console.error('❌ Gmail send failed:', err.message);
    return false;
  }
}


app.post('/api/send-otp', async (req, res) => {
  try{
    const { email, name } = req.body || {};
    if(!email) return res.status(400).json({ error: 'missing_email' });

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expiry = Date.now() + (10 * 60 * 1000); // 10 minutes

    const payload = JSON.stringify({ email, otp, expiry });
    const secret = process.env.OTP_SECRET || process.env.ADMIN_MANAGE_TOKEN;
    if(!secret) return res.status(500).json({ error: 'otp_secret_not_configured' });
    const signature = signPayload(payload, secret);
    const token = `${base64url(payload)}.${signature}`;

    // Try SendGrid first
    const sendgridKey = (process.env.SENDGRID_API_KEY || '').trim();
    const fromEmail = (process.env.SENDGRID_FROM || process.env.VITE_FORMSUBMIT_EMAIL || '').trim();
    
    if(sendgridKey && fromEmail) {
      const msg = {
        personalizations: [{ to: [{ email }] }],
        from: { email: fromEmail },
        subject: 'Your AmritaCare OTP',
        content: [{ type: 'text/plain', value: `Hello ${name || ''},\n\nYour AmritaCare OTP is: ${otp}\nIt expires in 10 minutes.` }]
      };

      const sgRes = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: { 'authorization': `Bearer ${sendgridKey}`, 'content-type':'application/json' },
        body: JSON.stringify(msg)
      });

      if(sgRes.ok) {
        console.log('✅ OTP sent via SendGrid');
        return res.json({ success: true, token, via: 'sendgrid' });
      } else {
        const text = await sgRes.text();
        console.warn('SendGrid failed, attempting Gmail fallback:', text);
        // Fall through to Gmail attempt
      }
    }

    // Fallback: Try Gmail
    const gmailSuccess = await sendViaGmail(email, name, otp);
    if(gmailSuccess) {
      return res.json({ success: true, token, via: 'gmail' });
    }

    // Both failed
    return res.status(500).json({ error: 'email_send_failed', detail: 'Both SendGrid and Gmail failed. Check server configuration.' });
  }catch(err){ 
    console.error('send-otp', err);
    return res.status(500).json({ error: 'server_error', detail: err.message });
  }
});

app.post('/api/verify-otp', (req, res) => {
  try{
    const { token, otp } = req.body || {};
    if(!token || !otp) return res.status(400).json({ error: 'missing_params' });
    const secret = process.env.OTP_SECRET || process.env.ADMIN_MANAGE_TOKEN;
    if(!secret) return res.status(500).json({ error: 'otp_secret_not_configured' });

    const parts = token.split('.'); if(parts.length !== 2) return res.status(400).json({ error: 'invalid_token' });
    const payloadB64 = parts[0]; const sig = parts[1];
    const payloadJson = base64urlDecode(payloadB64);
    const expectedSig = signPayload(payloadJson, secret);
    if(!crypto.timingSafeEqual(Buffer.from(expectedSig), Buffer.from(sig))) return res.status(400).json({ error: 'invalid_signature' });

    const payload = JSON.parse(payloadJson);
    if(Date.now() > payload.expiry) return res.status(400).json({ error: 'expired' });
    if(String(payload.otp) !== String(otp)) return res.status(400).json({ error: 'invalid_otp' });

    return res.json({ success: true, email: payload.email });
  }catch(err){ console.error('verify-otp', err); return res.status(500).json({ error: 'server_error' }); }
});

// Contact endpoint: send contact messages via SendGrid or Gmail fallback
app.post('/api/contact', async (req, res) => {
  try{
    const { name, email, message } = req.body || {};
    if(!email || !message) return res.status(400).json({ error: 'missing_fields' });

    const sendgridKey = (process.env.SENDGRID_API_KEY || '').trim();
    const fromEmail = (process.env.SENDGRID_FROM || process.env.VITE_FORMSUBMIT_EMAIL || '').trim();

    if(sendgridKey && fromEmail){
      // Send via SendGrid
      const msg = {
        personalizations: [{ to: [{ email: fromEmail }] }],
        from: { email },
        subject: `Contact form: ${name || email}`,
        content: [{ type: 'text/plain', value: `From: ${name || 'Anonymous'} <${email}>\n\n${message}` }]
      };
      try{
        const sgRes = await fetch('https://api.sendgrid.com/v3/mail/send', { method: 'POST', headers: { 'authorization': `Bearer ${sendgridKey}`, 'content-type':'application/json' }, body: JSON.stringify(msg) });
        if(sgRes.ok){ return res.json({ success: true, via: 'sendgrid' }); }
        const txt = await sgRes.text(); console.warn('SendGrid contact failed:', txt);
      }catch(e){ console.error('SendGrid contact error', e); }
    }

    // Gmail fallback
    const gmailOk = await sendViaGmail((process.env.CONTACT_NOTIFY_EMAIL || process.env.SENDGRID_FROM || process.env.VITE_FORMSUBMIT_EMAIL), name || 'Contact', `Message from ${email}:\n\n${message}`);
    if(gmailOk) return res.json({ success: true, via: 'gmail' });

    return res.status(500).json({ error: 'email_send_failed', detail: 'SendGrid and Gmail both failed or not configured' });
  }catch(err){ console.error('/api/contact', err); return res.status(500).json({ error: 'server_error' }); }
});

// Debug endpoint to check configured SENDGRID_FROM (auth required)
app.get('/api/debug-sendgrid-from', (req, res) => {
  const token = req.headers['x-debug-token'] || req.query.token;
  const secret = process.env.ADMIN_MANAGE_TOKEN || process.env.OTP_SECRET;
  const from = process.env.SENDGRID_FROM || process.env.VITE_FORMSUBMIT_EMAIL || null;
  if (!token || !secret || token !== secret) {
    console.warn('debug-sendgrid-from: unauthenticated access - returning limited info');
    return res.json({ sendgrid_from: from, note: 'unauthenticated' });
  }
  return res.json({ sendgrid_from: from });
});

// Serve SPA fallback
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});
// Error handling middleware
app.use((err, req, res, next) => {
  console.error("❌ Server error:", err);
  res.status(500).json({ 
    error: "Internal server error",
    detail: process.env.NODE_ENV === "development" ? err.message : undefined
  });
});

// Server startup (for local development)
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`✅ Development server running on http://localhost:${PORT}`);
    console.log(`📝 Environment: ${process.env.NODE_ENV || "development"}`);
  });
}

// Export for Vercel serverless (CommonJS)
module.exports = app;
