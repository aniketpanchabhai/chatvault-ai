// ============================================================
// routes/chat.js - Chat Endpoint (with Clerk Auth)
// ============================================================
// POST /api/chat → User sends question, get AI answer
// Auth required: only queries the authenticated user's vectors
// ============================================================

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { searchVectorDB } = require('../services/pinecone');
const { askGemini } = require('../services/gemini');

// ─────────────────────────────────────────────
// POST /api/chat
// Body: { question: string, selectedSourceIds: string[], chatHistory: [] }
// ─────────────────────────────────────────────
router.post('/', requireAuth, async (req, res) => {
  try {
    const { question, selectedSourceIds = [], chatHistory = [] } = req.body;
    const userId = req.userId;  // ← from Clerk auth middleware

    if (!question || question.trim().length === 0) {
      return res.status(400).json({ error: 'Question is required' });
    }

    if (selectedSourceIds.length === 0) {
      return res.status(400).json({
        error: 'Please select at least one source from the left panel before asking a question.'
      });
    }

    console.log(`\n[Chat] User: ${userId}`);
    console.log(`[Chat] Question: "${question}"`);
    console.log(`[Chat] Sources selected: ${selectedSourceIds.length}`);

    // STEP 1: Search Pinecone - scoped to this user's data
    console.log('[Chat] Step 1: Searching vector database...');
    const relevantChunks = await searchVectorDB(question, selectedSourceIds, userId);

    if (relevantChunks.length === 0) {
      return res.json({
        answer: "I couldn't find relevant information in the selected sources for your question. Try selecting different sources or rephrasing your question.",
        sourcesUsed: []
      });
    }

    // STEP 2: Ask Gemini with retrieved context
    console.log('[Chat] Step 2: Asking Gemini...');
    const answer = await askGemini(question, relevantChunks, chatHistory);

    const sourcesUsed = [...new Set(relevantChunks.map(c => c.sourceName))];

    console.log(`[Chat] ✅ Answer ready. Sources used: ${sourcesUsed.join(', ')}\n`);

    res.json({ answer, sourcesUsed });

  } catch (error) {
    console.error('[Chat] ❌ Error:', error.message);
    res.status(500).json({ error: 'Chat error: ' + error.message });
  }
});

module.exports = router;
