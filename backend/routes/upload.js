// ============================================================
// routes/upload.js - File Upload & Link Processing Endpoints
// ============================================================
// POST /api/upload/file   → Upload PDF, TXT, CSV, JSON
// POST /api/upload/link   → Add URL or YouTube link
// DELETE /api/upload/:id  → Remove a source
//
// ALL ROUTES REQUIRE CLERK AUTH.
// req.userId is set by the requireAuth middleware and used
// to scope every Pinecone operation to the authenticated user.
// ============================================================

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const { requireAuth } = require('../middleware/auth');
const { extractText } = require('../services/extractor');
const { saveToVectorDB, deleteFromVectorDB } = require('../services/pinecone');

// ─────────────────────────────────────────────
// Multer Config - How to save uploaded files
// ─────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}_${safeName}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['.pdf', '.txt', '.csv', '.json'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${ext} not supported. Allowed: ${allowedTypes.join(', ')}`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },  // 10MB max
});

// ─────────────────────────────────────────────
// POST /api/upload/file
// ─────────────────────────────────────────────
router.post('/file', requireAuth, upload.single('file'), async (req, res) => {
  const filePath = req.file?.path;

  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file received' });
    }

    const file = req.file;
    const extension = path.extname(file.originalname).replace('.', '').toLowerCase();
    const sourceId = uuidv4();
    const userId = req.userId;  // ← from Clerk auth middleware

    console.log(`\n[Upload] User: ${userId}`);
    console.log(`[Upload] File received: ${file.originalname} (${extension.toUpperCase()})`);

    // STEP 1: Extract text
    console.log('[Upload] Step 1: Extracting text...');
    const text = await extractText(extension, file.path);

    if (!text || text.trim().length < 10) {
      throw new Error('Could not extract any meaningful text from this file');
    }

    console.log(`[Upload] Extracted ${text.length} characters`);

    // STEP 2: Save to Pinecone with userId in metadata
    console.log('[Upload] Step 2: Saving to vector database...');
    const chunkCount = await saveToVectorDB(text, sourceId, file.originalname, extension, userId);

    const sourceInfo = {
      id: sourceId,
      name: file.originalname,
      type: extension,
      chunkCount: chunkCount,
      uploadedAt: new Date().toISOString(),
    };

    console.log(`[Upload] ✅ Success! ${chunkCount} chunks stored for user ${userId}\n`);
    res.json({ success: true, source: sourceInfo });

  } catch (error) {
    console.error('[Upload] ❌ Error:', error.message);
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────
// POST /api/upload/link
// ─────────────────────────────────────────────
router.post('/link', requireAuth, async (req, res) => {
  try {
    const { url } = req.body;
    const userId = req.userId;

    if (!url || !url.trim()) {
      return res.status(400).json({ success: false, error: 'URL is required' });
    }

    const trimmedUrl = url.trim();

    try {
      new URL(trimmedUrl);
    } catch {
      return res.status(400).json({ success: false, error: 'Invalid URL format. Example: https://example.com' });
    }

    const isYouTube =
      trimmedUrl.includes('youtube.com/watch') ||
      trimmedUrl.includes('youtu.be/') ||
      trimmedUrl.includes('youtube.com/embed/');

    const sourceType = isYouTube ? 'youtube' : 'url';
    const sourceId = uuidv4();

    console.log(`\n[Upload] User: ${userId}`);
    console.log(`[Upload] Link received: ${trimmedUrl}`);
    console.log(`[Upload] Type detected: ${sourceType}`);

    console.log('[Upload] Step 1: Extracting content...');
    const text = await extractText(sourceType, trimmedUrl);

    if (!text || text.trim().length < 50) {
      throw new Error('Could not extract meaningful content from this URL. The site may be blocking scraping or the video has no transcript.');
    }

    console.log(`[Upload] Extracted ${text.length} characters`);

    console.log('[Upload] Step 2: Saving to vector database...');
    const chunkCount = await saveToVectorDB(text, sourceId, trimmedUrl, sourceType, userId);

    let displayName = trimmedUrl;
    try {
      const urlObj = new URL(trimmedUrl);
      if (isYouTube) {
        displayName = `YouTube: ${urlObj.searchParams.get('v') || urlObj.pathname.split('/').pop()}`;
      } else {
        displayName = urlObj.hostname + (urlObj.pathname !== '/' ? urlObj.pathname.substring(0, 30) : '');
      }
    } catch {}

    const sourceInfo = {
      id: sourceId,
      name: displayName,
      fullUrl: trimmedUrl,
      type: sourceType,
      chunkCount: chunkCount,
      uploadedAt: new Date().toISOString(),
    };

    console.log(`[Upload] ✅ Success! ${chunkCount} chunks stored for user ${userId}\n`);
    res.json({ success: true, source: sourceInfo });

  } catch (error) {
    console.error('[Upload] ❌ Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────
// DELETE /api/upload/:sourceId
// Only deletes if the source belongs to the user
// ─────────────────────────────────────────────
router.delete('/:sourceId', requireAuth, async (req, res) => {
  try {
    const { sourceId } = req.params;
    const userId = req.userId;

    if (!sourceId) {
      return res.status(400).json({ success: false, error: 'Source ID required' });
    }

    console.log(`[Upload] User ${userId} deleting source: ${sourceId}`);
    // deleteFromVectorDB scopes deletion to userId so users can't
    // delete each other's data even if they guess another sourceId
    await deleteFromVectorDB(sourceId, userId);

    res.json({ success: true, message: 'Source deleted successfully' });

  } catch (error) {
    console.error('[Upload] Delete error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
