// ============================================================
// chunker.js - Split large text into smaller overlapping chunks
// ============================================================
// WHY CHUNKS?
//   - Pinecone has limits on vector size
//   - Smaller chunks = more precise search results
//   - Overlap prevents losing context at chunk boundaries
//
// EXAMPLE:
//   Text: "The cat sat on the mat. The dog ran away. Birds flew high."
//   Chunk 1: "The cat sat on the mat. The dog ran"  (words 1-7)
//   Chunk 2: "The dog ran away. Birds flew high."   (words 5-11) <- overlap!
// ============================================================

/**
 * Split text into chunks with overlap
 * @param {string} text - The full text to split
 * @param {number} chunkSize - Words per chunk (default 400)
 * @param {number} overlapSize - Words to repeat between chunks (default 50)
 * @returns {Array} Array of chunk objects with text and metadata
 */
function chunkText(text, chunkSize = 400, overlapSize = 50) {
  if (!text || text.trim().length === 0) {
    return [];
  }

  // Clean up the text first
  const cleanText = text
    .replace(/\r\n/g, '\n')   // normalize line endings
    .replace(/\n{3,}/g, '\n\n') // max 2 consecutive newlines
    .trim();

  // Split into words (keeping punctuation attached)
  const words = cleanText.split(/\s+/).filter(w => w.length > 0);

  if (words.length === 0) {
    return [];
  }

  console.log(`[Chunker] Total words: ${words.length}, Chunk size: ${chunkSize}, Overlap: ${overlapSize}`);

  const chunks = [];
  let startIndex = 0;
  let chunkNumber = 0;

  while (startIndex < words.length) {
    // End of this chunk
    const endIndex = Math.min(startIndex + chunkSize, words.length);

    // Get words for this chunk
    const chunkWords = words.slice(startIndex, endIndex);
    const chunkText = chunkWords.join(' ');

    // Only add if chunk has meaningful content (more than 10 words)
    if (chunkWords.length > 10) {
      chunks.push({
        text: chunkText,
        chunkIndex: chunkNumber,
        startWord: startIndex,
        endWord: endIndex,
        wordCount: chunkWords.length,
      });
      chunkNumber++;
    }

    // Move to next chunk with overlap
    // Instead of jumping by chunkSize, jump by (chunkSize - overlapSize)
    // This creates the overlap between consecutive chunks
    startIndex += (chunkSize - overlapSize);

    // Safety: if we're near the end but not at the end, just grab the rest
    if (startIndex < words.length && words.length - startIndex < overlapSize) {
      break;
    }
  }

  console.log(`[Chunker] Created ${chunks.length} chunks`);
  return chunks;
}

/**
 * Smart chunker that respects paragraph boundaries
 * Better than simple word splitting for structured documents
 * @param {string} text - The full text
 * @param {number} maxChunkSize - Max words per chunk
 */
function chunkByParagraph(text, maxChunkSize = 400) {
  if (!text || text.trim().length === 0) {
    return [];
  }

  // Split by paragraphs (double newline)
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 20);

  if (paragraphs.length === 0) {
    // Fallback to word chunking if no paragraphs
    return chunkText(text, maxChunkSize);
  }

  const chunks = [];
  let currentChunk = '';
  let currentWordCount = 0;
  let chunkIndex = 0;

  for (const paragraph of paragraphs) {
    const paragraphWords = paragraph.trim().split(/\s+/).length;

    // If adding this paragraph exceeds limit, save current chunk and start new
    if (currentWordCount + paragraphWords > maxChunkSize && currentChunk.length > 0) {
      chunks.push({
        text: currentChunk.trim(),
        chunkIndex: chunkIndex,
        wordCount: currentWordCount,
      });
      chunkIndex++;

      // Start new chunk (with last paragraph as overlap for context)
      currentChunk = paragraph + '\n\n';
      currentWordCount = paragraphWords;
    } else {
      currentChunk += paragraph + '\n\n';
      currentWordCount += paragraphWords;
    }
  }

  // Don't forget the last chunk
  if (currentChunk.trim().length > 0) {
    chunks.push({
      text: currentChunk.trim(),
      chunkIndex: chunkIndex,
      wordCount: currentWordCount,
    });
  }

  console.log(`[Chunker] Paragraph-based: ${chunks.length} chunks from ${paragraphs.length} paragraphs`);
  return chunks;
}

/**
 * Choose best chunking strategy based on content type
 * @param {string} text - Full text
 * @param {string} sourceType - Type of source (pdf, url, csv, etc.)
 */
function smartChunk(text, sourceType = 'txt') {
  // CSV and JSON are already structured, use word chunking
  if (sourceType === 'csv' || sourceType === 'json') {
    return chunkText(text, 300, 30);
  }

  // PDFs and articles have paragraphs, use paragraph chunking
  if (sourceType === 'pdf' || sourceType === 'url') {
    return chunkByParagraph(text, 400);
  }

  // YouTube transcripts: use word chunking with larger overlap (spoken text flows)
  if (sourceType === 'youtube') {
    return chunkText(text, 350, 80);
  }

  // Default: paragraph-based
  return chunkByParagraph(text, 400);
}

module.exports = { chunkText, chunkByParagraph, smartChunk };
