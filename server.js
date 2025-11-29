import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Import API handlers
import lookupHandler from './api/lookup.js';
import chatHandler from './api/chat.js';
import storyHandler from './api/story.js';
import scenarioHandler from './api/scenario.js';
import imageHandler from './api/image.js';
import ttsHandler from './api/tts.js';

// Route wrappers to adapt standard Request/Response to Vercel-style handlers
const wrap = (handler) => async (req, res) => {
  try {
    await handler(req, res);
  } catch (error) {
    console.error("Server Error:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
  }
};

// API Routes
app.post('/api/lookup', wrap(lookupHandler));
app.post('/api/chat', wrap(chatHandler));
app.post('/api/story', wrap(storyHandler));
app.post('/api/scenario', wrap(scenarioHandler));
app.post('/api/image', wrap(imageHandler));
app.post('/api/tts', wrap(ttsHandler));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`);
  console.log(`🔑 API Key configured: ${process.env.GEMINI_API_KEY ? 'Yes' : 'No'}`);
});