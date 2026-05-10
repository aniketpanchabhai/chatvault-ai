// ============================================================
// gemini.js - Ask Gemini AI with retrieved context
// ============================================================
// This is the "G" in RAG (Retrieval-Augmented Generation)
// We pass the relevant chunks from Pinecone as CONTEXT
// Gemini then answers ONLY based on that context
// ============================================================

require('dotenv').config();
const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');

// Initialize Gemini model
// gemini-1.5-flash is free and fast
const gemini = new ChatGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
  model: 'gemini-2.5-flash',
  temperature: 0.2,  // Low = more factual, less creative (good for Q&A)
  maxOutputTokens: 2048,
});

// ─────────────────────────────────────────────
// ASK GEMINI WITH CONTEXT
// contextChunks = array of {text, sourceName, score}
// ─────────────────────────────────────────────
async function askGemini(question, contextChunks, chatHistory = []) {
  console.log(`\n[Gemini] Answering: "${question}"`);
  console.log(`[Gemini] Context chunks: ${contextChunks.length}`);

  // Build context string from all chunks
  // Include source names so Gemini can reference them
  const contextText = contextChunks
    .map((chunk, idx) => `[Source: ${chunk.sourceName}]\n${chunk.text}`)
    .join('\n\n---\n\n');

  // Build conversation history for multi-turn chat
  // Format: [{role: 'user', content: '...'}, {role: 'assistant', content: '...'}]
  const historyMessages = chatHistory.map(msg => ({
    role: msg.role === 'user' ? 'human' : 'assistant',
    content: msg.text,
  }));

  // The main prompt - tells Gemini exactly how to behave
  const systemPrompt = `You are a helpful AI assistant that answers questions based on uploaded documents and web content.

RULES:
1. Answer ONLY based on the provided context below
2. If the answer is NOT in the context, say: "I don't find information about that in the selected sources."
3. Be concise and clear
4. If you reference information, mention which source it came from
5. Don't make up information

CONTEXT FROM UPLOADED SOURCES:
${contextText}
`;

  // Build the full message to send to Gemini
  const fullPrompt = `${systemPrompt}\n\nUSER QUESTION: ${question}\n\nANSWER:`;

  try {
    const response = await gemini.invoke(fullPrompt);
    const answer = response.content;
    console.log(`[Gemini] ✅ Answer generated (${answer.length} chars)`);
    return answer;
  } catch (error) {
    console.error('[Gemini] Error:', error.message);
    throw new Error('Gemini API error: ' + error.message);
  }
}

module.exports = { askGemini };
