/**
 * Mental Health Platform - Express Server
 * Compatible with both local development and Vercel deployment
 */

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

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
