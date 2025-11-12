/**
 * Mental Health Platform - Express Server
 * Compatible with both local development and Vercel deployment
 */

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
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
 * GPT Chat API - OpenAI Integration
 * POST /api/chat
 * Body: { message: string }
 */
app.post("/api/chat", async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: "No message provided." });
  }

  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return res.status(500).json({ 
      error: "Server configuration error: OPENAI_API_KEY not set." 
    });
  }

  try {
    const client = new OpenAI({ apiKey: key });
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a supportive assistant helping students with mental health topics. 
                    Give empathetic, concise, and safe guidance. 
                    Important: If the user mentions self-harm or suicide, immediately suggest professional help:
                    - National Suicide Prevention Lifeline: 988 (US)
                    - Crisis Text Line: Text HOME to 741741
                    - International Association for Suicide Prevention: https://www.iasp.info/resources/Crisis_Centres/`,
        },
        {
          role: "user",
          content: message,
        },
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const reply = completion.choices?.[0]?.message?.content || "I'm sorry, I couldn't generate a response. Please try again.";
    res.json({ success: true, reply });
  } catch (err) {
    console.error("❌ OpenAI error:", err);
    res.status(500).json({ 
      success: false,
      error: "Chat service error. Please try again later.",
      detail: process.env.NODE_ENV === "development" ? err.message : undefined
    });
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
