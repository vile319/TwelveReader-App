/* eslint-disable @typescript-eslint/ban-ts-comment */
import { TextSet } from '../types';

// NOTE: You must replace this with your own OAuth Client ID from Google Cloud Console
// Instructions: https://console.cloud.google.com/apis/credentials
const CLIENT_ID = 'YOUR_GOOGLE_DRIVE_CLIENT_ID.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.appdata';
const API_KEY = 'YOUR_API_KEY'; // Optional: API key for additional quota

// Audiobook storage structure
export interface AudiobookData {
  id: string;
  title: string;
  text: string;
  voice: string;
  audioBlob?: Blob; // Audio file as blob
  audioUrl?: string; // Drive file ID for audio
  wordTimings: Array<{ word: string; start: number; end: number }>;
  duration: number;
  lastPosition: number;
  createdAt: number;
  updatedAt: number;
  coverImage?: string; // Base64 or Drive file ID
}

interface DriveHelpers {
  init: () => Promise<void>;
  isSignedIn: () => boolean;
  signIn: () => Promise<void>;
  signOut: () => void;
  // Text sets (for backward compatibility)
  uploadTextSets: (sets: TextSet[]) => Promise<void>;
  fetchTextSets: () => Promise<TextSet[] | null>;
  // Audiobook management
  saveAudiobook: (audiobook: AudiobookData) => Promise<string>;
  loadAudiobook: (id: string) => Promise<AudiobookData | null>;
  listAudiobooks: () => Promise<AudiobookData[]>;
  deleteAudiobook: (id: string) => Promise<void>;
  // Utility
  getStorageUsage: () => Promise<{ used: number; total: number }>;
}

const fileName = 'verbareader_text_sets.json';
const audiobooksFolderName = 'VerbaReader_Audiobooks';
let gapiLoaded = false;
let audiobooksFolderId: string | null = null;

export const driveHelpers: DriveHelpers = {
  async init() {
    if (gapiLoaded) return;
    console.log('🔧 Initializing Google Drive API...');
    
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => {
        // @ts-ignore
        window.gapi.load('client:auth2', async () => {
          try {
            // @ts-ignore
            await window.gapi.client.init({
              apiKey: API_KEY !== 'YOUR_API_KEY' ? API_KEY : undefined,
              clientId: CLIENT_ID,
              discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
              scope: SCOPES,
            });
            
            // Load Drive API
            // @ts-ignore
            await window.gapi.client.load('drive', 'v3');
            
            gapiLoaded = true;
            console.log('✅ Google Drive API initialized');
            resolve();
          } catch (error) {
            console.error('❌ Failed to initialize Google Drive API:', error);
            reject(error);
          }
        });
      };
      script.onerror = () => reject(new Error('Failed to load gapi'));
      document.body.appendChild(script);
    });
  },
  
  isSignedIn() {
    try {
      // @ts-ignore
      return gapiLoaded && window.gapi?.auth2?.getAuthInstance()?.isSignedIn?.get();
    } catch {
      return false;
    }
  },
  
  async signIn() {
    try {
      await this.init();
      console.log('🔐 Signing in to Google Drive...');
      // @ts-ignore
      await window.gapi.auth2.getAuthInstance().signIn();
      console.log('✅ Signed in to Google Drive');
      
      // Initialize audiobooks folder
      await this.ensureAudiobooksFolder();
    } catch (error) {
      console.error('❌ Failed to sign in:', error);
      throw error;
    }
  },
  
  signOut() {
    if (!gapiLoaded) return;
    try {
      // @ts-ignore
      window.gapi.auth2.getAuthInstance().signOut();
      audiobooksFolderId = null;
      console.log('👋 Signed out from Google Drive');
    } catch (error) {
      console.error('❌ Failed to sign out:', error);
    }
  },
  
  async ensureAudiobooksFolder(): Promise<string> {
    if (audiobooksFolderId) return audiobooksFolderId;
    
    try {
      // Search for existing folder
      // @ts-ignore
      const response = await window.gapi.client.drive.files.list({
        q: `name='${audiobooksFolderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id, name)',
        spaces: 'drive',
      });
      
      if (response.result.files && response.result.files.length > 0) {
        audiobooksFolderId = response.result.files[0].id;
        console.log(`📁 Found existing audiobooks folder: ${audiobooksFolderId}`);
        return audiobooksFolderId;
      }
      
      // Create new folder
      // @ts-ignore
      const createResponse = await window.gapi.client.drive.files.create({
        resource: {
          name: audiobooksFolderName,
          mimeType: 'application/vnd.google-apps.folder',
        },
        fields: 'id',
      });
      
      audiobooksFolderId = createResponse.result.id;
      console.log(`📁 Created new audiobooks folder: ${audiobooksFolderId}`);
      return audiobooksFolderId;
    } catch (error) {
      console.error('❌ Failed to ensure audiobooks folder:', error);
      throw error;
    }
  },
  async getFileId(): Promise<string | null> {
    // @ts-ignore
    const response = await window.gapi.client.drive.files.list({
      q: `name='${fileName}' and trashed=false`,
      fields: 'files(id,name)',
      spaces: 'appDataFolder,drive',
    });
    const files = response.result.files;
    if (files && files.length > 0) return files[0].id;
    return null;
  },
  async uploadTextSets(sets: TextSet[]) {
    if (!this.isSignedIn()) throw new Error('Not signed in');
    const fileContent = JSON.stringify(sets);
    const blob = new Blob([fileContent], { type: 'application/json' });

    const metadata = {
      name: fileName,
      mimeType: 'application/json',
    };

    const fileId = await this.getFileId();
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', blob);

    const method = fileId ? 'PATCH' : 'POST';
    const path = fileId ? `/upload/drive/v3/files/${fileId}?uploadType=multipart` : '/upload/drive/v3/files?uploadType=multipart';
    // @ts-ignore
    await window.gapi.client.request({
      path,
      method,
      body: form,
    });
  },
  async fetchTextSets() {
    if (!this.isSignedIn()) throw new Error('Not signed in');
    const fileId = await this.getFileId();
    if (!fileId) return null;
    // @ts-ignore
    const response = await window.gapi.client.drive.files.get({
      fileId,
      alt: 'media',
    });
    try {
      const data = JSON.parse(response.body) as TextSet[];
      return data;
    } catch {
      return null;
    }
  },
  
  // ========== AUDIOBOOK MANAGEMENT ==========
  
  async saveAudiobook(audiobook: AudiobookData): Promise<string> {
    if (!this.isSignedIn()) throw new Error('Not signed in');
    
    try {
      console.log(`💾 Saving audiobook: ${audiobook.title}`);
      const folderId = await this.ensureAudiobooksFolder();
      
      // Prepare metadata (without audio blob)
      const metadata = {
        id: audiobook.id,
        title: audiobook.title,
        text: audiobook.text,
        voice: audiobook.voice,
        wordTimings: audiobook.wordTimings,
        duration: audiobook.duration,
        lastPosition: audiobook.lastPosition,
        createdAt: audiobook.createdAt,
        updatedAt: Date.now(),
        coverImage: audiobook.coverImage,
      };
      
      // Save metadata as JSON
      const metadataFileName = `${audiobook.id}_metadata.json`;
      const metadataBlob = new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' });
      
      const metadataForm = new FormData();
      metadataForm.append('metadata', new Blob([JSON.stringify({
        name: metadataFileName,
        mimeType: 'application/json',
        parents: [folderId],
      })], { type: 'application/json' }));
      metadataForm.append('file', metadataBlob);
      
      // @ts-ignore
      const metadataResponse = await window.gapi.client.request({
        path: '/upload/drive/v3/files?uploadType=multipart',
        method: 'POST',
        body: metadataForm,
      });
      
      console.log(`✅ Saved metadata: ${metadataResponse.result.id}`);
      
      // Save audio file if provided
      if (audiobook.audioBlob) {
        const audioFileName = `${audiobook.id}_audio.wav`;
        const audioForm = new FormData();
        audioForm.append('metadata', new Blob([JSON.stringify({
          name: audioFileName,
          mimeType: 'audio/wav',
          parents: [folderId],
        })], { type: 'application/json' }));
        audioForm.append('file', audiobook.audioBlob);
        
        // @ts-ignore
        const audioResponse = await window.gapi.client.request({
          path: '/upload/drive/v3/files?uploadType=multipart',
          method: 'POST',
          body: audioForm,
        });
        
        console.log(`✅ Saved audio: ${audioResponse.result.id}`);
        return audioResponse.result.id;
      }
      
      return metadataResponse.result.id;
    } catch (error) {
      console.error('❌ Failed to save audiobook:', error);
      throw error;
    }
  },
  
  async loadAudiobook(id: string): Promise<AudiobookData | null> {
    if (!this.isSignedIn()) throw new Error('Not signed in');
    
    try {
      console.log(`📖 Loading audiobook: ${id}`);
      const folderId = await this.ensureAudiobooksFolder();
      
      // Load metadata
      const metadataFileName = `${id}_metadata.json`;
      // @ts-ignore
      const metadataSearch = await window.gapi.client.drive.files.list({
        q: `name='${metadataFileName}' and '${folderId}' in parents and trashed=false`,
        fields: 'files(id, name)',
      });
      
      if (!metadataSearch.result.files || metadataSearch.result.files.length === 0) {
        console.warn(`⚠️ Metadata not found for audiobook: ${id}`);
        return null;
      }
      
      const metadataFileId = metadataSearch.result.files[0].id;
      
      // @ts-ignore
      const metadataResponse = await window.gapi.client.drive.files.get({
        fileId: metadataFileId,
        alt: 'media',
      });
      
      const metadata = JSON.parse(metadataResponse.body) as AudiobookData;
      
      // Load audio file
      const audioFileName = `${id}_audio.wav`;
      // @ts-ignore
      const audioSearch = await window.gapi.client.drive.files.list({
        q: `name='${audioFileName}' and '${folderId}' in parents and trashed=false`,
        fields: 'files(id, name)',
      });
      
      if (audioSearch.result.files && audioSearch.result.files.length > 0) {
        const audioFileId = audioSearch.result.files[0].id;
        metadata.audioUrl = audioFileId;
        
        // Optionally download audio blob
        // @ts-ignore
        const audioResponse = await window.gapi.client.drive.files.get({
          fileId: audioFileId,
          alt: 'media',
        }, { responseType: 'blob' });
        
        metadata.audioBlob = audioResponse.body;
        console.log(`✅ Loaded audiobook with audio: ${id}`);
      } else {
        console.log(`✅ Loaded audiobook metadata only: ${id}`);
      }
      
      return metadata;
    } catch (error) {
      console.error('❌ Failed to load audiobook:', error);
      return null;
    }
  },
  
  async listAudiobooks(): Promise<AudiobookData[]> {
    if (!this.isSignedIn()) throw new Error('Not signed in');
    
    try {
      console.log('📚 Listing audiobooks...');
      const folderId = await this.ensureAudiobooksFolder();
      
      // List all metadata files
      // @ts-ignore
      const response = await window.gapi.client.drive.files.list({
        q: `'${folderId}' in parents and name contains '_metadata.json' and trashed=false`,
        fields: 'files(id, name, modifiedTime)',
        orderBy: 'modifiedTime desc',
      });
      
      const audiobooks: AudiobookData[] = [];
      
      if (response.result.files) {
        for (const file of response.result.files) {
          try {
            // @ts-ignore
            const contentResponse = await window.gapi.client.drive.files.get({
              fileId: file.id,
              alt: 'media',
            });
            
            const audiobook = JSON.parse(contentResponse.body) as AudiobookData;
            audiobooks.push(audiobook);
          } catch (error) {
            console.warn(`⚠️ Failed to load audiobook: ${file.name}`, error);
          }
        }
      }
      
      console.log(`✅ Found ${audiobooks.length} audiobooks`);
      return audiobooks;
    } catch (error) {
      console.error('❌ Failed to list audiobooks:', error);
      return [];
    }
  },
  
  async deleteAudiobook(id: string): Promise<void> {
    if (!this.isSignedIn()) throw new Error('Not signed in');
    
    try {
      console.log(`🗑️ Deleting audiobook: ${id}`);
      const folderId = await this.ensureAudiobooksFolder();
      
      // Delete metadata file
      const metadataFileName = `${id}_metadata.json`;
      // @ts-ignore
      const metadataSearch = await window.gapi.client.drive.files.list({
        q: `name='${metadataFileName}' and '${folderId}' in parents and trashed=false`,
        fields: 'files(id)',
      });
      
      if (metadataSearch.result.files && metadataSearch.result.files.length > 0) {
        // @ts-ignore
        await window.gapi.client.drive.files.delete({
          fileId: metadataSearch.result.files[0].id,
        });
      }
      
      // Delete audio file
      const audioFileName = `${id}_audio.wav`;
      // @ts-ignore
      const audioSearch = await window.gapi.client.drive.files.list({
        q: `name='${audioFileName}' and '${folderId}' in parents and trashed=false`,
        fields: 'files(id)',
      });
      
      if (audioSearch.result.files && audioSearch.result.files.length > 0) {
        // @ts-ignore
        await window.gapi.client.drive.files.delete({
          fileId: audioSearch.result.files[0].id,
        });
      }
      
      console.log(`✅ Deleted audiobook: ${id}`);
    } catch (error) {
      console.error('❌ Failed to delete audiobook:', error);
      throw error;
    }
  },
  
  async getStorageUsage(): Promise<{ used: number; total: number }> {
    if (!this.isSignedIn()) throw new Error('Not signed in');
    
    try {
      // @ts-ignore
      const response = await window.gapi.client.drive.about.get({
        fields: 'storageQuota',
      });
      
      const quota = response.result.storageQuota;
      return {
        used: parseInt(quota.usage || '0'),
        total: parseInt(quota.limit || '0'),
      };
    } catch (error) {
      console.error('❌ Failed to get storage usage:', error);
      return { used: 0, total: 0 };
    }
  },
} as any;