// ============================================================
// pinecone.js - Vector Database Operations (User-Scoped)
// ============================================================
// KEY CHANGE FROM ORIGINAL:
//   Every vector now stores a `userId` in its metadata.
//   Queries and deletes filter by BOTH sourceId AND userId.
//   This means:
//     - User A can never read User B's documents
//     - User A can never delete User B's documents
//     - Even if User A knows User B's sourceId, they get nothing
// ============================================================

require('dotenv').config();
const { Pinecone } = require('@pinecone-database/pinecone');
const { GoogleGenerativeAIEmbeddings } = require('@langchain/google-genai');
const { smartChunk } = require('./chunker');

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

const embeddings = new GoogleGenerativeAIEmbeddings({
  apiKey: process.env.GEMINI_API_KEY,
  model: 'gemini-embedding-001',
});

// ─────────────────────────────────────────────
// SAVE TEXT TO PINECONE (user-scoped)
// ─────────────────────────────────────────────
async function saveToVectorDB(text, sourceId, sourceName, sourceType = 'txt', userId) {
  if (!userId) throw new Error('userId is required to save to vector DB');

  console.log(`\n[Pinecone] User: ${userId}`);
  console.log(`[Pinecone] Starting save for: ${sourceName}`);

  const index = pinecone.index(process.env.PINECONE_INDEX);
  const chunks = smartChunk(text, sourceType);

  if (chunks.length === 0) {
    throw new Error('No content could be extracted from this source');
  }

  console.log(`[Pinecone] Processing ${chunks.length} chunks...`);

  const batchSize = 10;

  for (let batchStart = 0; batchStart < chunks.length; batchStart += batchSize) {
    const batch = chunks.slice(batchStart, batchStart + batchSize);

    const vectorPromises = batch.map(chunk => embeddings.embedQuery(chunk.text));
    const vectors = await Promise.all(vectorPromises);

    const records = batch.map((chunk, idx) => ({
      id: `${userId}_${sourceId}_chunk_${batchStart + idx}`,  // ← userId prefix ensures unique IDs per user
      values: vectors[idx],
      metadata: {
        text: chunk.text,
        sourceId: sourceId,
        sourceName: sourceName,
        sourceType: sourceType,
        chunkIndex: chunk.chunkIndex,
        wordCount: chunk.wordCount || 0,
        userId: userId,              // ← stored for filtering
      }
    }));

    await index.upsert(records);
    console.log(`[Pinecone] Saved batch ${Math.floor(batchStart / batchSize) + 1}/${Math.ceil(chunks.length / batchSize)}`);

    if (batchStart + batchSize < chunks.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  console.log(`[Pinecone] ✅ All ${chunks.length} chunks saved for: ${sourceName}`);
  return chunks.length;
}

// ─────────────────────────────────────────────
// SEARCH PINECONE (user-scoped)
// Only returns results belonging to the authenticated user
// ─────────────────────────────────────────────
async function searchVectorDB(question, selectedSourceIds = [], userId) {
  if (!userId) throw new Error('userId is required to search vector DB');

  console.log(`\n[Pinecone] User: ${userId}`);
  console.log(`[Pinecone] Searching for: "${question}"`);
  console.log(`[Pinecone] In sources: ${selectedSourceIds.join(', ') || 'ALL'}`);

  const index = pinecone.index(process.env.PINECONE_INDEX);
  const questionVector = await embeddings.embedQuery(question);

  // Build filter: ALWAYS scope to userId, optionally also filter by sourceId
  let filter;

  if (selectedSourceIds && selectedSourceIds.length > 0) {
    // Filter by user AND specific sources
    filter = {
      $and: [
        { userId: { $eq: userId } },
        { sourceId: { $in: selectedSourceIds } }
      ]
    };
  } else {
    // Filter by user only (all their sources)
    filter = {
      userId: { $eq: userId }
    };
  }

  const results = await index.query({
    vector: questionVector,
    topK: 5,
    includeMetadata: true,
    filter,
  });

  if (!results.matches || results.matches.length === 0) {
    console.log('[Pinecone] No results found');
    return [];
  }

  console.log(`[Pinecone] Found ${results.matches.length} relevant chunks`);

  const chunks = results.matches.map((match, idx) => {
    console.log(`  Chunk ${idx + 1}: score=${match.score?.toFixed(3)}, source=${match.metadata?.sourceName}`);
    return {
      text: match.metadata.text,
      sourceName: match.metadata.sourceName,
      score: match.score,
    };
  });

  return chunks;
}

// ─────────────────────────────────────────────
// DELETE FROM PINECONE (user-scoped)
// Only deletes vectors that match BOTH sourceId AND userId
// ─────────────────────────────────────────────
async function deleteFromVectorDB(sourceId, userId) {
  if (!userId) throw new Error('userId is required to delete from vector DB');

  console.log(`[Pinecone] User ${userId} deleting source: ${sourceId}`);

  const index = pinecone.index(process.env.PINECONE_INDEX);

  // Delete only vectors that belong to this user AND this source
  await index.deleteMany({
    $and: [
      { userId: { $eq: userId } },
      { sourceId: { $eq: sourceId } }
    ]
  });

  console.log(`[Pinecone] ✅ Deleted source: ${sourceId} for user: ${userId}`);
}

module.exports = { saveToVectorDB, searchVectorDB, deleteFromVectorDB };
