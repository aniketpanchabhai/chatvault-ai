# 🤖 RAG Chatbot — Complete Setup Guide
### Angular + Express + LangChain + Gemini + Pinecone

---

## 📁 Project Structure

```
rag-chatbot/
├── backend/
│   ├── routes/
│   │   ├── upload.js        ← File & link upload endpoints
│   │   └── chat.js          ← Chat/question endpoint
│   ├── services/
│   │   ├── extractor.js     ← Reads PDF, TXT, CSV, JSON, URLs, YouTube
│   │   ├── chunker.js       ← Splits text into overlapping chunks
│   │   ├── pinecone.js      ← Vector DB: save, search, delete
│   │   └── gemini.js        ← AI: answer questions with context
│   ├── uploads/             ← Temp storage for uploaded files
│   ├── server.js            ← Express entry point
│   ├── package.json
│   └── .env.example         ← Copy this to .env and fill in keys
│
└── frontend/
    ├── src/
    │   ├── app/
    │   │   ├── app.component.ts    ← All Angular logic
    │   │   ├── app.component.html  ← Two-panel UI template
    │   │   ├── app.component.css   ← Styling
    │   │   └── app.config.ts       ← Angular providers
    │   ├── main.ts
    │   ├── index.html
    │   └── styles.css
    ├── angular.json
    ├── tsconfig.json
    └── package.json
```

---

## 🔑 STEP 1 — Get Your Gemini API Key (FREE)

Gemini is Google's free AI model. We use it for:
- Converting text → numbers (embeddings for Pinecone)
- Answering questions based on retrieved context

### Steps:

1. **Go to** → https://aistudio.google.com

2. **Sign in** with any Google account

3. Click **"Get API Key"** in the top-left sidebar

4. Click **"Create API Key"**

5. Select **"Create API key in new project"**

6. **Copy the key** — it looks like: `AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`

7. Paste it into your `.env` file:
   ```
   GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
   ```

> ✅ The free tier gives you 15 requests/minute and 1 million tokens/day — plenty for development.

---

## 🌲 STEP 2 — Set Up Pinecone (FREE Vector Database)

Pinecone stores your text as vectors (numbers) so we can search by meaning, not keywords.

### 2A — Create Account

1. **Go to** → https://pinecone.io

2. Click **"Sign Up Free"**

3. Sign up with Google or email

4. Complete email verification if prompted

### 2B — Get API Key

1. After login, you land on the **Pinecone Console**

2. In the left sidebar, click **"API Keys"**

3. Click **"Create API Key"**

4. Name it: `rag-chatbot-key`

5. Click **"Create Key"**

6. **Copy the key immediately** (you won't see it again!)
   - Looks like: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

7. Paste it into `.env`:
   ```
   PINECONE_API_KEY=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   ```

### 2C — Create the Index

An "Index" in Pinecone is like a table in a regular database.

1. In the left sidebar, click **"Indexes"**

2. Click **"Create Index"**

3. Fill in the form EXACTLY as below:

   | Field | Value |
   |-------|-------|
   | **Index Name** | `rag-chatbot` |
   | **Dimensions** | `768` |
   | **Metric** | `cosine` |
   | **Cloud** | `AWS` (free) |
   | **Region** | `us-east-1` (free tier) |

   > ⚠️ IMPORTANT: Dimensions MUST be `768` — this matches Gemini's embedding-001 model output size.
   > If you set it wrong, delete the index and recreate it.

4. Click **"Create Index"**

5. Wait ~1 minute for the index to become **Ready** (green dot)

6. Set in `.env`:
   ```
   PINECONE_INDEX=rag-chatbot
   ```

### 2D — Understanding Pinecone's Data Structure

No traditional schema needed! Pinecone stores "records" with this structure:

```
Each record (vector) contains:
┌─────────────────────────────────────────────────┐
│ id       → "sourceId_chunk_0"   (unique string) │
│ values   → [0.123, -0.456, ...]  (768 numbers)  │
│ metadata → {                                     │
│   text:        "The actual text chunk...",       │
│   sourceId:    "uuid-of-the-file",              │
│   sourceName:  "document.pdf",                  │
│   sourceType:  "pdf",                           │
│   chunkIndex:  0,                               │
│   wordCount:   350                              │
│ }                                               │
└─────────────────────────────────────────────────┘
```

- **id**: Must be unique per vector
- **values**: The 768 numbers Gemini generates from text
- **metadata**: Extra info we store alongside the vector (we retrieve this when searching)

> Pinecone has NO SQL, NO tables, NO migrations. Just vectors + metadata.

---

## ⚙️ STEP 3 — Configure Environment File

1. Go into the `backend/` folder

2. Copy the example file:
   ```bash
   # On Mac/Linux:
   cp .env.example .env

   # On Windows:
   copy .env.example .env
   ```

3. Open `.env` and fill in your keys:
   ```env
   GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
   PINECONE_API_KEY=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   PINECONE_INDEX=rag-chatbot
   PORT=3000
   FRONTEND_URL=http://localhost:4200
   ```

4. **Save the file**

> ⚠️ Never commit `.env` to Git! It's already in `.gitignore`.

---

## 📦 STEP 4 — Install Dependencies

### Backend

```bash
# Open terminal, go to backend folder
cd rag-chatbot/backend

# Install all packages
npm install
```

You should see packages installing. This may take 1–2 minutes.

**Key packages installed:**
| Package | Purpose |
|---------|---------|
| `express` | Web server framework |
| `multer` | Handle file uploads |
| `pdf-parse` | Read PDF files |
| `cheerio` | Scrape website HTML |
| `youtube-transcript` | Get YouTube captions |
| `@pinecone-database/pinecone` | Vector database client |
| `@langchain/google-genai` | Gemini AI + embeddings |
| `uuid` | Generate unique IDs |
| `axios` | Make HTTP requests for scraping |
| `dotenv` | Load .env variables |

### Frontend

```bash
# Open a NEW terminal, go to frontend folder
cd rag-chatbot/frontend

# Install Angular packages
npm install
```

This installs Angular 17 and all UI dependencies.

---

## 🚀 STEP 5 — Run the Project

You need **two terminals** running at the same time.

### Terminal 1 — Start Backend

```bash
cd rag-chatbot/backend
node server.js
```

You should see:
```
========================================
  RAG Chatbot Backend
  Running at: http://localhost:3000
  Frontend:   http://localhost:4200
========================================
```

If you see warnings about missing API keys, check your `.env` file.

### Terminal 2 — Start Frontend

```bash
cd rag-chatbot/frontend
npm start
# or: ng serve
```

You should see:
```
✔ Compiled successfully.
Application bundle generation complete.
  Local: http://localhost:4200/
```

### Open in Browser

Go to: **http://localhost:4200**

You should see the two-panel chatbot UI!

---

## 🔄 STEP 6 — How to Use the App

### Upload a File:
1. In the **left panel**, click **"📎 Upload File"**
2. Select a PDF, TXT, CSV, or JSON file
3. Wait for "✅ File uploaded! (X chunks created)"
4. The file appears in the source list with a checkbox ✓

### Add a Website URL:
1. Paste a URL like `https://en.wikipedia.org/wiki/Artificial_intelligence`
2. Click **"Add"**
3. Backend scrapes the page and stores it in Pinecone

### Add a YouTube Video:
1. Paste a YouTube URL like `https://www.youtube.com/watch?v=dQw4w9WgXcQ`
2. Click **"Add"**
3. Backend fetches the transcript (video must have captions)

### Ask Questions:
1. Make sure the checkbox ✓ is checked next to your sources
2. Type your question in the right panel
3. Press **Enter** or click **➤**
4. The bot answers based only on your uploaded content

---

## 🧠 How It All Works (Flow Diagram)

```
UPLOAD FLOW:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

User uploads PDF
       ↓
extractor.js reads the PDF → extracts raw text
       ↓
chunker.js splits text into 400-word chunks with 50-word overlap
       Example: 10,000 word doc → ~27 chunks
       ↓
For each chunk:
  Gemini embedding-001 converts text → 768 numbers
       ↓
  Pinecone stores: { id, vector[768], metadata{text, sourceId} }
       ↓
Frontend shows: "✅ Uploaded! (27 chunks created)"


CHAT FLOW:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

User types: "What is machine learning?"
       ↓
Angular sends { question, selectedSourceIds[] } to backend
       ↓
Gemini embedding-001 converts question → 768 numbers
       ↓
Pinecone finds top 5 vectors CLOSEST to question vector
  (filtered to only selected sourceIds)
       ↓
Retrieve original text from each match's metadata
       ↓
Send to Gemini: "Answer based on this context: [5 chunks]"
       ↓
Gemini returns answer
       ↓
Angular displays answer + "📚 Sources: document.pdf"
```

---

## 🐛 Common Errors & Fixes

### ❌ "GEMINI_API_KEY not set"
- Open `backend/.env` and make sure `GEMINI_API_KEY=` has your actual key
- No quotes around the key value

### ❌ "Pinecone index not found"
- Make sure you created the index named exactly `rag-chatbot` in Pinecone console
- Check `PINECONE_INDEX=rag-chatbot` in `.env`

### ❌ "Dimension mismatch" from Pinecone
- Delete the Pinecone index and recreate it with **Dimensions = 768**
- This happens if you accidentally set wrong dimensions

### ❌ "No transcript available" for YouTube
- The video must have captions/subtitles enabled
- Try a different video, or use a URL instead

### ❌ "CORS error" in browser console
- Make sure backend is running on port 3000
- Make sure `FRONTEND_URL=http://localhost:4200` in `.env`

### ❌ "Cannot find module" errors
- Run `npm install` again in both `backend/` and `frontend/` folders

### ❌ Angular won't compile
- Make sure you're using Node.js 18 or higher: `node --version`
- Delete `node_modules` and run `npm install` again

---

## 📋 Prerequisites Checklist

Before starting, make sure you have:

- [ ] **Node.js 18+** → https://nodejs.org (download LTS version)
- [ ] **npm** (comes with Node.js)
- [ ] **Angular CLI** → `npm install -g @angular/cli`
- [ ] **Google account** (for Gemini API)
- [ ] **Pinecone account** (free at pinecone.io)

Check versions:
```bash
node --version    # Should be v18.0.0 or higher
npm --version     # Should be 9.0.0 or higher
ng version        # Should show Angular CLI 17.x
```

---

## 🔒 Security Notes

- Never share your `.env` file
- Never commit API keys to Git
- The `uploads/` folder stores files temporarily — you can delete them after processing
- Pinecone free tier stores up to 100MB of vectors

---

## 💡 Tips for Debugging

1. **Watch backend logs** — every step prints to console:
   ```
   [Upload] Step 1: Extracting text...
   [Chunker] Total words: 5230, Chunk size: 400, Overlap: 50
   [Pinecone] Saving batch 1/14
   [Chat] Searching vector database...
   [Gemini] Answer generated (342 chars)
   ```

2. **Check Pinecone console** — go to your index and click "Browse" to see stored vectors

3. **Test backend directly** with curl:
   ```bash
   # Health check
   curl http://localhost:3000/

   # Test chat (after uploading a file)
   curl -X POST http://localhost:3000/api/chat \
     -H "Content-Type: application/json" \
     -d '{"question":"test","selectedSourceIds":["your-source-id"]}'
   ```

---

## 📊 Pinecone Free Tier Limits

| Limit | Value |
|-------|-------|
| Vectors | 100,000 |
| Indexes | 5 |
| Storage | 1GB |
| Namespaces | 1 |

For a typical document (10 pages PDF ≈ 2,500 words ≈ 7 chunks), you can store thousands of documents on the free tier.
