// ============================================================
// extractor.js - Extract text from any source type
// Supports: PDF, TXT, CSV, JSON, Website URLs, YouTube links
// ============================================================

const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const axios = require('axios');
const cheerio = require('cheerio');
const { YoutubeTranscript } = require('youtube-transcript');

// ─────────────────────────────────────────────
// PDF Extractor
// Uses pdf-parse library to read text from PDF
// ─────────────────────────────────────────────
async function extractFromPDF(filePath) {
  console.log('[Extractor] Reading PDF:', filePath);
  const buffer = fs.readFileSync(filePath);
  const result = await pdfParse(buffer);
  console.log(`[Extractor] PDF extracted - ${result.text.length} characters`);
  return result.text;
}

// ─────────────────────────────────────────────
// TXT Extractor
// Simple file read
// ─────────────────────────────────────────────
async function extractFromTXT(filePath) {
  console.log('[Extractor] Reading TXT:', filePath);
  const text = fs.readFileSync(filePath, 'utf-8');
  console.log(`[Extractor] TXT extracted - ${text.length} characters`);
  return text;
}

// ─────────────────────────────────────────────
// CSV Extractor
// Reads CSV as plain text (works fine for RAG)
// Each row becomes part of the searchable content
// ─────────────────────────────────────────────
async function extractFromCSV(filePath) {
  console.log('[Extractor] Reading CSV:', filePath);
  const raw = fs.readFileSync(filePath, 'utf-8');

  // Convert CSV rows into readable sentences
  const lines = raw.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.trim());

  let readableText = `CSV Data with columns: ${headers.join(', ')}\n\n`;

  // Each data row becomes a readable line
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const row = headers.map((h, idx) => `${h}: ${values[idx] || ''}`).join(', ');
    readableText += row + '\n';
  }

  console.log(`[Extractor] CSV extracted - ${lines.length} rows`);
  return readableText;
}

// ─────────────────────────────────────────────
// JSON Extractor
// Converts JSON to readable text format
// ─────────────────────────────────────────────
async function extractFromJSON(filePath) {
  console.log('[Extractor] Reading JSON:', filePath);
  const raw = fs.readFileSync(filePath, 'utf-8');

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new Error('Invalid JSON file: ' + e.message);
  }

  // Convert JSON to readable text recursively
  function jsonToText(obj, prefix = '') {
    let text = '';
    if (typeof obj === 'object' && obj !== null) {
      if (Array.isArray(obj)) {
        obj.forEach((item, idx) => {
          text += jsonToText(item, `${prefix}[${idx}] `);
        });
      } else {
        Object.entries(obj).forEach(([key, value]) => {
          if (typeof value === 'object') {
            text += `${prefix}${key}:\n`;
            text += jsonToText(value, prefix + '  ');
          } else {
            text += `${prefix}${key}: ${value}\n`;
          }
        });
      }
    } else {
      text += `${prefix}${obj}\n`;
    }
    return text;
  }

  const text = jsonToText(parsed);
  console.log(`[Extractor] JSON extracted - ${text.length} characters`);
  return text;
}

// ─────────────────────────────────────────────
// URL / Website Scraper
// Downloads page HTML and extracts visible text
// Removes ads, scripts, nav etc. using cheerio
// ─────────────────────────────────────────────
async function extractFromURL(url) {
  console.log('[Extractor] Scraping URL:', url);

  const response = await axios.get(url, {
    timeout: 15000,
    headers: {
      // Pretend to be a real browser so sites don't block us
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/91.0.4472.124 Safari/537.36',
    },
  });

  const $ = cheerio.load(response.data);

  // Remove elements that are not useful content
  $('script').remove();
  $('style').remove();
  $('nav').remove();
  $('header').remove();
  $('footer').remove();
  $('iframe').remove();
  $('noscript').remove();
  $('[class*="ad"]').remove();
  $('[id*="ad"]').remove();
  $('[class*="cookie"]').remove();
  $('[class*="popup"]').remove();
  $('[class*="modal"]').remove();
  $('[class*="banner"]').remove();

  // Extract page title
  const title = $('title').text().trim();

  // Try to get main content first (article, main tag)
  let mainContent = '';
  const mainSelectors = ['article', 'main', '[role="main"]', '.content', '#content', '.post', '.article'];

  for (const selector of mainSelectors) {
    if ($(selector).length) {
      mainContent = $(selector).text();
      break;
    }
  }

  // If no main content found, use body
  if (!mainContent || mainContent.length < 100) {
    mainContent = $('body').text();
  }

  // Clean up whitespace
  const cleanText = mainContent
    .replace(/\t/g, ' ')
    .replace(/\n{3,}/g, '\n\n')  // max 2 blank lines
    .replace(/ {2,}/g, ' ')       // max 1 space
    .trim();

  const fullText = `Page Title: ${title}\nSource URL: ${url}\n\n${cleanText}`;
  console.log(`[Extractor] URL scraped - ${fullText.length} characters`);
  return fullText;
}

// ─────────────────────────────────────────────
// YouTube Transcript Extractor
// Gets the auto-generated or uploaded transcript
// ─────────────────────────────────────────────
async function extractFromYouTube(url) {
  console.log('[Extractor] Getting YouTube transcript:', url);

  // Extract video ID from various YouTube URL formats
  // https://www.youtube.com/watch?v=VIDEO_ID
  // https://youtu.be/VIDEO_ID
  // https://www.youtube.com/embed/VIDEO_ID
  let videoId = '';

  if (url.includes('v=')) {
    videoId = url.split('v=')[1].split('&')[0];
  } else if (url.includes('youtu.be/')) {
    videoId = url.split('youtu.be/')[1].split('?')[0];
  } else if (url.includes('embed/')) {
    videoId = url.split('embed/')[1].split('?')[0];
  }

  if (!videoId) {
    throw new Error('Could not extract YouTube video ID from URL: ' + url);
  }

  console.log('[Extractor] YouTube video ID:', videoId);

  // Fetch transcript
  const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);

  if (!transcriptItems || transcriptItems.length === 0) {
    throw new Error('No transcript available for this YouTube video. The video may not have captions enabled.');
  }

  // Join all transcript pieces with timestamps
  const transcriptText = transcriptItems
    .map(item => {
      const seconds = Math.floor(item.offset / 1000);
      const minutes = Math.floor(seconds / 60);
      const secs = seconds % 60;
      const timestamp = `[${minutes}:${secs.toString().padStart(2, '0')}]`;
      return `${timestamp} ${item.text}`;
    })
    .join(' ');

  const fullText = `YouTube Video Transcript\nVideo URL: ${url}\nVideo ID: ${videoId}\n\n${transcriptText}`;
  console.log(`[Extractor] YouTube transcript extracted - ${transcriptItems.length} segments`);
  return fullText;
}

// ─────────────────────────────────────────────
// MAIN FUNCTION
// Routes to the right extractor based on type
// ─────────────────────────────────────────────
async function extractText(type, source) {
  const typeHandlers = {
    'pdf': extractFromPDF,
    'txt': extractFromTXT,
    'csv': extractFromCSV,
    'json': extractFromJSON,
    'url': extractFromURL,
    'youtube': extractFromYouTube,
  };

  const handler = typeHandlers[type];
  if (!handler) {
    throw new Error(`Unsupported source type: "${type}". Supported: pdf, txt, csv, json, url, youtube`);
  }

  return await handler(source);
}

module.exports = { extractText };
