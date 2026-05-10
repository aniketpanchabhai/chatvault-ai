# Quick Start Guide - ChatVault AI

## 🚀 How to Run the Updated Application

### Prerequisites
- Node.js & npm installed
- Backend running on `http://localhost:3000`
- Clerk authentication configured

### Running the Frontend

```bash
cd b:\rag-chatbot-clerk\frontend

# Install dependencies (if not already done)
npm install

# Start development server
npm start

# Build for production
npm run build

# Run production build
npm install -g http-server
http-server dist/frontend/browser
```

The application will be available at `http://localhost:4200`

---

## ✨ New Features to Try

### 1. **Dark Mode Toggle** 🌙
- Click the moon/sun icon in the header (top-right)
- Your preference is automatically saved
- All UI elements smoothly transition to dark mode

### 2. **Settings Menu** ⚙️
- Click the settings icon (gear) in the header
- **Upload Options**: Toggle different file types on/off
  - PDF Upload
  - Text Upload (TXT, CSV, JSON)
  - URL/Website Ingestion
- Each setting takes effect immediately

### 3. **Responsive Design**
- Test on different screen sizes:
  - **Desktop** (>1024px): Full two-panel layout
  - **Tablet** (768px-1024px): Adjusted panel widths
  - **Mobile** (<768px): Vertical stacking (chat above, sources below)
- All interactions work smoothly on mobile

### 4. **New UI Elements**
- ✨ New "ChatVault AI" branding
- 📊 Interactive data sources panel with hover effects
- 💬 Improved chat interface with smooth animations
- 🎯 Professional settings menu with checkboxes
- 📄 Footer with copyright and links

### 5. **Improved Interactions**
- Hover over sources to see delete button
- Messages smoothly slide in and animate
- Typing indicator shows when bot is responding
- Error messages clearly displayed
- Success feedback on uploads

---

## 🎨 Customization Guide

### Changing Colors

Edit [app.component.css](src/app/app.component.css) at the top:

```css
:root {
  --color-primary: #5b7eff;        /* Change primary blue */
  --color-primary-dark: #4563cc;   /* Change hover blue */
  --color-success: #10b981;        /* Change success green */
  --color-error: #ef4444;          /* Change error red */
  --bg-primary: #ffffff;           /* Change light background */
}

:root[data-theme="dark"] {
  --bg-primary: #0f0f1a;           /* Change dark background */
  --text-primary: #e8e8e8;         /* Change dark text color */
}
```

### Changing Application Title

Edit [app.component.html](src/app/app.component.html) line ~24:

```html
<span class="app-title">ChatVault AI</span>
<span class="app-subtitle">Your AI, Your Data</span>
```

### Changing Logo

Edit the same file, line ~22:

```html
<span class="logo">✨</span>  <!-- Change emoji here -->
```

---

## 🔍 Browser DevTools Tips

### Check Dark Mode State
Open browser console and run:
```javascript
document.documentElement.getAttribute('data-theme')
// Returns: 'dark' or 'light'
```

### Test Theme Programmatically
```javascript
document.documentElement.setAttribute('data-theme', 'dark');
document.documentElement.setAttribute('data-theme', 'light');
```

### Check Stored Theme Preference
```javascript
localStorage.getItem('theme')  // Returns stored theme
```

---

## 📱 Mobile Testing

### Chrome DevTools Mobile View
1. Press `F12` or Right-click → Inspect
2. Click Device Toolbar icon (top-left)
3. Select device or set custom dimensions:
   - **Mobile**: 375×667 (iPhone SE)
   - **Tablet**: 768×1024 (iPad)
   - **Desktop**: 1920×1080 (Desktop)

### Responsive Breakpoints
- **Desktop**: ≥1025px - Full two-panel layout
- **Tablet**: 769px-1024px - Adjusted panels
- **Mobile**: 481px-768px - Vertical stacking
- **Small Mobile**: ≤480px - Compact layout

---

## 🐛 Troubleshooting

### Dark Mode Not Working
- Clear browser localStorage: `localStorage.clear()`
- Refresh the page
- Check browser console for errors

### Settings Menu Not Closing
- Click outside the settings menu
- Or click another button in the header

### Upload Not Working
- Check if file type is enabled in Settings
- Verify backend is running on port 3000
- Check browser console for CORS errors

### Messages Not Displaying
- Ensure at least one source is selected
- Check backend is returning responses
- Verify markdown is being parsed correctly

---

## 📊 Performance Tips

### Optimize for Production
```bash
npm run build --configuration production
```

This creates an optimized build with:
- Tree-shaking of unused code
- Minified CSS and JavaScript
- AOT (Ahead-of-Time) compilation

### Monitor Performance
Use Chrome DevTools → Lighthouse to audit:
- Performance
- Accessibility
- Best Practices
- SEO

---

## 🔗 File Structure

```
frontend/src/app/
├── app.component.html      # UI template (updated)
├── app.component.css       # Styles with dark mode (completely rewritten)
├── app.component.ts        # Component logic (enhanced)
├── auth.service.ts         # Authentication
├── auth.interceptor.ts     # HTTP interceptor
└── app.config.ts           # App configuration

frontend/src/
└── styles.css              # Global styles (updated)
└── index.html              # Entry HTML
└── main.ts                 # App bootstrap
```

---

## 📝 Known Limitations

- Settings dropdown may overlap on very small screens (mitigated with positioning)
- Markdown rendering depends on `ngx-markdown` package
- Dark mode requires JavaScript (CSS-only fallback could be added)

---

## 💬 Support

For issues or feature requests:
1. Check the browser console for errors
2. Verify backend is running
3. Review the IMPROVEMENTS_SUMMARY.md file
4. Check network tab in DevTools for API errors

---

**Last Updated**: May 2026  
**Version**: 1.0  
**Status**: ✅ Production Ready
