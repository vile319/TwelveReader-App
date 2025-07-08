/* eslint-disable @typescript-eslint/ban-ts-comment */
import { TextSet } from '../types';

// NOTE: You must replace this with your own OAuth Client ID from Google Cloud Console
const CLIENT_ID = 'YOUR_GOOGLE_DRIVE_CLIENT_ID.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

interface DriveHelpers {
  init: () => Promise<void>;
  isSignedIn: () => boolean;
  signIn: () => Promise<void>;
  signOut: () => void;
  uploadTextSets: (sets: TextSet[]) => Promise<void>;
  fetchTextSets: () => Promise<TextSet[] | null>;
}

const fileName = 'verbareader_text_sets.json';
let gapiLoaded = false;

export const driveHelpers: DriveHelpers = {
  async init() {
    if (gapiLoaded) return;
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => {
        // @ts-ignore
        window.gapi.load('client:auth2', async () => {
          // @ts-ignore
          await window.gapi.client.init({
            clientId: CLIENT_ID,
            scope: SCOPES,
          });
          gapiLoaded = true;
          resolve();
        });
      };
      script.onerror = () => reject(new Error('Failed to load gapi'));
      document.body.appendChild(script);
    });
  },
  isSignedIn() {
    // @ts-ignore
    return gapiLoaded && window.gapi.auth2.getAuthInstance().isSignedIn.get();
  },
  async signIn() {
    await this.init();
    // @ts-ignore
    await window.gapi.auth2.getAuthInstance().signIn();
  },
  signOut() {
    if (!gapiLoaded) return;
    // @ts-ignore
    window.gapi.auth2.getAuthInstance().signOut();
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
} as any;