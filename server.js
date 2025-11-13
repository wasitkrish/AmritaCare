/**
 * Mental Health Platform - Express Server
 * Compatible with both local development and Vercel deployment
 */

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import crypto from 'crypto';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
 * GPT Chat API - Store & Retrieve User Messages (Real-time user-to-user)
 * POST /api/messages - Save a message
 * GET /api/messages - Get all messages
 */
app.post("/api/messages", (req, res) => {
  const { from, email, text, timestamp } = req.body;

  if (!from || !email || !text) {
    return res.status(400).json({ error: "Missing required fields: from, email, text" });
  }

  try {
    // Store message (in production, use a real database)
    const messages = JSON.parse(process.env.CHAT_MESSAGES || "[]");
    messages.push({
      from,
      email,
      text,
      timestamp: timestamp || Date.now(),
      ts: new Date().toLocaleTimeString(),
      id: Date.now()
    });
    
    // Keep last 500 messages in memory
    if (messages.length > 500) messages.shift();
    process.env.CHAT_MESSAGES = JSON.stringify(messages);

    res.json({ 
      success: true, 
      message: "Message saved",
      id: Date.now()
    });
  } catch (err) {
    console.error("❌ Error saving message:", err);
    res.status(500).json({ error: "Failed to save message" });
  }
});

/**
 * Retrieve all chat messages
 * GET /api/messages
 */
app.get("/api/messages", (req, res) => {
  try {
    const messages = JSON.parse(process.env.CHAT_MESSAGES || "[]");
    res.json({ success: true, messages, count: messages.length });
  } catch (err) {
    console.error("❌ Error retrieving messages:", err);
    res.json({ success: true, messages: [], count: 0 });
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
  const apiSecret = process.env.CLOUDINARY_API_SECRET || process.env.VITE_CLOUDINARY_API_SECRET;
  const apiKey = process.env.CLOUDINARY_API_KEY || process.env.VITE_CLOUDINARY_API_KEY;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME;
  if (!apiSecret || !apiKey || !cloudName) {
    return res.status(500).json({ error: 'Cloudinary not configured on server' });
  }
  const timestamp = Math.floor(Date.now() / 1000);
  const toSign = `timestamp=${timestamp}`;
  const signature = crypto.createHash('sha1').update(toSign + apiSecret).digest('hex');
  res.json({ signature, timestamp, api_key: apiKey, cloud_name: cloudName });
});

// --- OTP via Email (SendGrid) ---
function base64url(str){ return Buffer.from(str).toString('base64').replace(/=+$/,'').replace(/\+/g,'-').replace(/\//g,'_'); }
function base64urlDecode(b64){ return Buffer.from(b64.replace(/-/g,'+').replace(/_/g,'/'),'base64').toString('utf8'); }
function signPayload(payload, secret){ return crypto.createHmac('sha256', secret).update(payload).digest('hex'); }

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

    // Send via SendGrid
    const sendgridKey = process.env.SENDGRID_API_KEY;
    const fromEmail = process.env.SENDGRID_FROM || process.env.VITE_FORMSUBMIT_EMAIL;
    if(!sendgridKey || !fromEmail) return res.status(500).json({ error: 'email_not_configured' });

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

    if(!sgRes.ok){ const text = await sgRes.text(); console.error('SendGrid error', text); return res.status(500).json({ error: 'email_send_failed', detail: text }); }

    return res.json({ success: true, token });
  }catch(err){ console.error('send-otp', err);
    // Return error details temporarily to help debugging (will revert after fix)
    const message = err && err.message ? err.message : String(err);
    return res.status(500).json({ error: 'server_error', detail: message, stack: err.stack ? err.stack.split('\n').slice(0,5) : undefined }); }
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

// Export for Vercel serverless
export default app;
