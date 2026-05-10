// ============================================================
// app.component.ts - Main Angular Component (with Clerk Auth)
// ============================================================

import { Component, OnInit, AfterViewChecked, ElementRef, ViewChild, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MarkdownComponent } from 'ngx-markdown';
import { AuthService, ClerkUser } from './auth.service';

interface Source {
  id: string;
  name: string;
  fullUrl?: string;
  type: string;
  chunkCount?: number;
  uploadedAt?: string;
  selected: boolean;
}

interface Message {
  role: 'user' | 'bot';
  text: string;
  sourcesUsed?: string[];
  timestamp: Date;
}

interface UploadSettings {
  enablePDF: boolean;
  enableText: boolean;
  enableURL: boolean;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, MarkdownComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, AfterViewChecked {

  @ViewChild('messagesContainer') messagesContainer!: ElementRef;

  backendUrl = 'https://chatvault-ai.onrender.com/';

  // ── Auth State ──
  isAuthLoaded = false;
  currentUser: ClerkUser | null = null;

  // ── Theme State ──
  isDarkMode = false;
  showSettingsMenu = false;
  showUploadSettings = false;

  // ── Upload Settings ──
  uploadSettings: UploadSettings = {
    enablePDF: true,
    enableText: true,
    enableURL: true
  };

  // ── Left Panel State ──
  sources: Source[] = [];
  linkInput: string = '';
  isUploading: boolean = false;
  uploadError: string = '';
  uploadSuccess: string = '';

  // ── Right Panel State ──
  messages: Message[] = [];
  userInput: string = '';
  isLoading: boolean = false;
  chatError: string = '';

  private shouldScrollToBottom = true;

  constructor(
    private http: HttpClient,
    public authService: AuthService,
  ) {
    this.loadThemePreference();
  }

  async ngOnInit() {
    // Initialize Clerk auth
    await this.authService.initialize();

    // Subscribe to auth state
    this.authService.isLoaded$.subscribe(loaded => {
      this.isAuthLoaded = loaded;
    });

    this.authService.user$.subscribe(user => {
      this.currentUser = user;

      // Reset sources when user changes (sign in / sign out)
      if (!user) {
        this.sources = [];
        this.messages = [];
      } else {
        // Show welcome message when signed in
        if (this.messages.length === 0) {
          this.messages.push({
            role: 'bot',
            text: `👋 Hello, ${user.firstName || 'there'}! I'm ChatVault AI.\n\nHere's how to use me:\n1. Upload files or paste URLs on the left\n2. Check the checkbox next to sources you want to query\n3. Ask me any question in the chat!\n\nYour data is private — only you can see and query your uploaded sources.`,
            timestamp: new Date()
          });
        }
      }
    });
  }

  ngAfterViewChecked() {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
    }
  }

  private scrollToBottom() {
    try {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop =
          this.messagesContainer.nativeElement.scrollHeight;
      }
    } catch {}
  }

  // ── Theme Management ──

  toggleDarkMode() {
    this.isDarkMode = !this.isDarkMode;
    localStorage.setItem('theme', this.isDarkMode ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', this.isDarkMode ? 'dark' : 'light');
  }

  private loadThemePreference() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      this.isDarkMode = true;
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }

  // ── Settings Menu ──

  toggleSettingsMenu() {
    this.showSettingsMenu = !this.showSettingsMenu;
  }

  closeSettingsMenu() {
    this.showSettingsMenu = false;
    this.showUploadSettings = false;
  }

  toggleUploadSettings() {
    this.showUploadSettings = !this.showUploadSettings;
  }

  openAbout() {
    alert('ChatVault AI v1.0\n\nPowered by Google Gemini & Pinecone Vector Database\n\nBuilt with Angular & Node.js');
    this.closeSettingsMenu();
  }

  // ── Upload Settings ──

  getAcceptedFileTypes(): string {
    const types = [];
    if (this.uploadSettings.enablePDF) types.push('.pdf');
    if (this.uploadSettings.enableText) types.push('.txt,.csv,.json');
    return types.join(',');
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: any) {
    const settingsContainer = document.querySelector('.settings-menu-container');
    if (settingsContainer && !settingsContainer.contains(event.target)) {
      this.closeSettingsMenu();
    }
  }

  // ── Auth Actions ──

  signIn() {
    this.authService.openSignIn();
  }

  async signOut() {
    await this.authService.signOut();
    this.sources = [];
    this.messages = [];
  }

  // ── LEFT PANEL: File Upload ──

  onFileSelected(event: any) {
    if (!this.currentUser) {
      this.showUploadError('Please sign in to upload files.');
      return;
    }

    const file: File = event.target.files[0];
    if (!file) return;

    const allowedTypes = ['pdf', 'txt', 'csv', 'json'];
    const extension = file.name.split('.').pop()?.toLowerCase() || '';

    if (!allowedTypes.includes(extension)) {
      this.showUploadError(`File type .${extension} is not supported. Use: PDF, TXT, CSV, JSON`);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      this.showUploadError('File is too large. Maximum size is 10MB.');
      return;
    }

    this.isUploading = true;
    this.uploadError = '';
    this.uploadSuccess = '';

    const formData = new FormData();
    formData.append('file', file);

    // AuthInterceptor automatically adds Authorization: Bearer <token>
    this.http.post<any>(`${this.backendUrl}/upload/file`, formData).subscribe({
      next: (response) => {
        if (response.success) {
          this.sources.push({ ...response.source, selected: true });
          this.showUploadSuccess(`✅ "${file.name}" uploaded! (${response.source.chunkCount} chunks created)`);
        }
        this.isUploading = false;
        event.target.value = '';
      },
      error: (err) => {
        this.showUploadError(err.error?.error || 'Upload failed. Check console for details.');
        this.isUploading = false;
        event.target.value = '';
      }
    });
  }

  // ── LEFT PANEL: Add URL / YouTube Link ──

  addLink() {
    if (!this.currentUser) {
      this.showUploadError('Please sign in to add links.');
      return;
    }

    const url = this.linkInput.trim();
    if (!url) return;

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      this.showUploadError('URL must start with http:// or https://');
      return;
    }

    this.isUploading = true;
    this.uploadError = '';
    this.uploadSuccess = '';

    this.http.post<any>(`${this.backendUrl}/upload/link`, { url }).subscribe({
      next: (response) => {
        if (response.success) {
          this.sources.push({ ...response.source, selected: true });
          const type = response.source.type === 'youtube' ? 'YouTube video' : 'Website';
          this.showUploadSuccess(`✅ ${type} added! (${response.source.chunkCount} chunks created)`);
          this.linkInput = '';
        }
        this.isUploading = false;
      },
      error: (err) => {
        this.showUploadError(err.error?.error || 'Failed to process link. The site may block scraping.');
        this.isUploading = false;
      }
    });
  }

  // ── LEFT PANEL: Delete a Source ──

  deleteSource(source: Source, event: Event) {
    event.stopPropagation();

    if (!confirm(`Delete "${source.name}"? This will remove all its data from the vector database.`)) {
      return;
    }

    this.http.delete(`${this.backendUrl}/upload/${source.id}`).subscribe({
      next: () => {
        this.sources = this.sources.filter(s => s.id !== source.id);
        this.showUploadSuccess('🗑️ Source deleted');
      },
      error: (err) => {
        this.showUploadError(err.error?.error || 'Delete failed');
      }
    });
  }

  selectAll() { this.sources.forEach(s => s.selected = true); }
  deselectAll() { this.sources.forEach(s => s.selected = false); }
  getSelectedCount(): number { return this.sources.filter(s => s.selected).length; }
  getSelectedIds(): string[] { return this.sources.filter(s => s.selected).map(s => s.id); }

  // ── RIGHT PANEL: Send Chat Message ──

  sendMessage() {
    if (!this.currentUser) {
      this.chatError = '⚠️ Please sign in to use the chatbot!';
      return;
    }

    const question = this.userInput.trim();
    if (!question || this.isLoading) return;

    const selectedIds = this.getSelectedIds();
    if (selectedIds.length === 0) {
      this.chatError = '⚠️ Please select at least one source from the left panel!';
      return;
    }

    this.chatError = '';

    this.messages.push({ role: 'user', text: question, timestamp: new Date() });
    this.userInput = '';
    this.isLoading = true;
    this.shouldScrollToBottom = true;

    const chatHistory = this.messages.slice(-6).map(m => ({ role: m.role, text: m.text }));

    this.http.post<any>(`${this.backendUrl}/chat`, {
      question,
      selectedSourceIds: selectedIds,
      chatHistory
    }).subscribe({
      next: (response) => {
        this.messages.push({
          role: 'bot',
          text: response.answer,
          sourcesUsed: response.sourcesUsed || [],
          timestamp: new Date()
        });
        this.isLoading = false;
        this.shouldScrollToBottom = true;
      },
      error: (err) => {
        this.messages.push({
          role: 'bot',
          text: '❌ Error: ' + (err.error?.error || 'Something went wrong. Check the backend console.'),
          timestamp: new Date()
        });
        this.isLoading = false;
      }
    });
  }

  onKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  clearChat() {
    this.messages = [{
      role: 'bot',
      text: 'Chat cleared! Ask me anything about your uploaded sources.',
      timestamp: new Date()
    }];
  }

  showUploadError(msg: string) {
    this.uploadError = msg;
    this.uploadSuccess = '';
    setTimeout(() => this.uploadError = '', 6000);
  }

  showUploadSuccess(msg: string) {
    this.uploadSuccess = msg;
    this.uploadError = '';
    setTimeout(() => this.uploadSuccess = '', 4000);
  }

  getSourceIcon(type: string): string {
    const icons: Record<string, string> = {
      pdf: '📄', txt: '📝', csv: '📊', json: '{ }', url: '🌐', youtube: '🎥',
    };
    return icons[type] || '📁';
  }

  formatSourceName(name: string): string {
    return name.length > 35 ? name.substring(0, 32) + '...' : name;
  }

  getUserInitials(): string {
    if (!this.currentUser) return '?';
    const first = this.currentUser.firstName?.[0] || '';
    const last = this.currentUser.lastName?.[0] || '';
    return (first + last).toUpperCase() || this.currentUser.emailAddress[0].toUpperCase();
  }
}
