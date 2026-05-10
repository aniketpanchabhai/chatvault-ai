// ============================================================
// server.js - Main Express Server (with Clerk Auth)
// ============================================================
// Run with: node server.js  OR  npm run dev
// ============================================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();

// ─────────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────────

// Allow Angular (port 4200) to call this backend
// Authorization header is required for Clerk JWT tokens
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:4200',
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Parse JSON request bodies
app.use(express.json({ limit: '10mb' }));

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// ─────────────────────────────────────────────
// Create uploads folder if missing
// ─────────────────────────────────────────────
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('[Server] Created uploads/ folder');
}

// ─────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────
// Auth middleware is applied inside each route file.
// The health check below remains public (no auth).

app.use('/api/upload', require('./routes/upload'));
app.use('/api/chat', require('./routes/chat'));

// Health check - public endpoint
app.get('/', (req, res) => {
  res.json({
    status: '✅ RAG Chatbot Backend is running!',
    auth: 'Clerk JWT authentication enabled',
    endpoints: {
      'POST /api/upload/file': 'Upload PDF, TXT, CSV, or JSON file [AUTH REQUIRED]',
      'POST /api/upload/link': 'Add website URL or YouTube link [AUTH REQUIRED]',
      'DELETE /api/upload/:id': 'Delete a source [AUTH REQUIRED]',
      'POST /api/chat': 'Ask a question [AUTH REQUIRED]',
    }
  });
});

// ─────────────────────────────────────────────
// Global Error Handler
// ─────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Server] Unhandled error:', err.message);
  res.status(500).json({ error: err.message });
});

// ─────────────────────────────────────────────
// Start Server
// ─────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log('\n========================================');
  console.log(`  RAG Chatbot Backend (with Clerk Auth)`);
  console.log(`  Running at: http://localhost:${PORT}`);
  console.log(`  Frontend:   ${process.env.FRONTEND_URL || 'http://localhost:4200'}`);
  console.log('========================================\n');

  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
    console.warn('⚠️  WARNING: GEMINI_API_KEY not set in .env file!');
  }
  if (!process.env.PINECONE_API_KEY || process.env.PINECONE_API_KEY === 'your_pinecone_api_key_here') {
    console.warn('⚠️  WARNING: PINECONE_API_KEY not set in .env file!');
  }
  if (!process.env.CLERK_SECRET_KEY || process.env.CLERK_SECRET_KEY === 'your_clerk_secret_key_here') {
    console.warn('⚠️  WARNING: CLERK_SECRET_KEY not set! All API calls will return 401 Unauthorized.');
  }
});
