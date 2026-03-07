import { TextSet, ReadingProgressEntry } from '../types';

export interface SyncData {
    textSets: TextSet[];
    readingProgress: Record<string, ReadingProgressEntry>;
}

export class GoogleDriveSync {
    private accessToken: string | null = null;
    private folderId: string | null = null;
    private readonly FOLDER_NAME = 'TwelveReader Sync';
    private readonly FILE_NAME = 'twelvereader_data.json';

    constructor(accessToken?: string) {
        if (accessToken) {
            this.accessToken = accessToken;
        }
    }

    setAccessToken(token: string) {
        this.accessToken = token;
    }

    hasToken(): boolean {
        return !!this.accessToken;
    }

    // Find or create 'TwelveReader Sync' folder
    private async getFolderId(): Promise<string> {
        if (this.folderId) return this.folderId;
        if (!this.accessToken) throw new Error("Not authenticated with Google Drive");

        // 1. Search for existing folder
        const query = encodeURIComponent(`mimeType='application/vnd.google-apps.folder' and name='${this.FOLDER_NAME}' and trashed=false`);
        const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&spaces=drive`, {
            headers: { Authorization: `Bearer ${this.accessToken}` }
        });

        if (searchRes.status === 401) throw new Error('Google Drive token expired');
        if (!searchRes.ok) throw new Error('Failed to query Google Drive');
        const searchData = await searchRes.json();

        if (searchData.files && searchData.files.length > 0) {
            this.folderId = searchData.files[0].id;
            return this.folderId!;
        }

        // 2. Create if not exists
        const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: this.FOLDER_NAME,
                mimeType: 'application/vnd.google-apps.folder'
            })
        });

        if (createRes.status === 401) throw new Error('Google Drive token expired');
        if (!createRes.ok) throw new Error('Failed to create sync folder');
        const createData = await createRes.json();
        this.folderId = createData.id;
        return this.folderId!;
    }

    private async getFileId(folderId: string, fileName: string = this.FILE_NAME): Promise<string | null> {
        if (!this.accessToken) throw new Error("Not authenticated");

        const query = encodeURIComponent(`name='${fileName}' and '${folderId}' in parents and trashed=false`);
        const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&spaces=drive`, {
            headers: { Authorization: `Bearer ${this.accessToken}` }
        });

        if (res.status === 401) throw new Error('Google Drive token expired');
        if (!res.ok) return null;

        const data = await res.json();
        if (data.files && data.files.length > 0) {
            return data.files[0].id;
        }
        return null;
    }

    async uploadAudioBlob(id: string, blob: Blob): Promise<void> {
        if (!this.accessToken) return;

        const folderId = await this.getFolderId();
        const fileName = `${id}.wav`;
        const fileId = await this.getFileId(folderId, fileName);

        const metadata = {
            name: fileName,
            parents: fileId ? undefined : [folderId]
        };

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', blob);

        const url = fileId
            ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`
            : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

        const method = fileId ? 'PATCH' : 'POST';

        const res = await fetch(url, {
            method,
            headers: { Authorization: `Bearer ${this.accessToken}` },
            body: form
        });

        if (res.status === 401) throw new Error('Google Drive token expired');
        if (!res.ok) throw new Error('Failed to upload audio blob to Google Drive');
    }

    async fetchAudioBlob(id: string): Promise<Blob | null> {
        if (!this.accessToken) return null;

        const folderId = await this.getFolderId();
        const fileName = `${id}.wav`;
        const fileId = await this.getFileId(folderId, fileName);

        if (!fileId) return null;

        const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
            headers: { Authorization: `Bearer ${this.accessToken}` }
        });

        if (res.status === 401) throw new Error('Google Drive token expired');
        if (!res.ok) return null;

        return await res.blob();
    }

    async uploadSyncData(sets: TextSet[], progress: Record<string, ReadingProgressEntry> = {}): Promise<void> {
        if (!this.accessToken) return;

        const folderId = await this.getFolderId();
        const fileId = await this.getFileId(folderId, this.FILE_NAME);

        const payload: SyncData = {
            textSets: sets,
            readingProgress: progress
        };
        const fileContent = JSON.stringify(payload);
        const metadata = {
            name: this.FILE_NAME,
            parents: fileId ? undefined : [folderId] // Only specify parents on creation
        };

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', new Blob([fileContent], { type: 'application/json' }));

        const url = fileId
            ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`
            : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

        const method = fileId ? 'PATCH' : 'POST';

        const res = await fetch(url, {
            method,
            headers: { Authorization: `Bearer ${this.accessToken}` },
            body: form
        });

        if (!res.ok) throw new Error('Failed to upload sync data to Google Drive');
    }

    async fetchSyncData(): Promise<SyncData | null> {
        if (!this.accessToken) return null;

        const folderId = await this.getFolderId();
        const fileId = await this.getFileId(folderId, this.FILE_NAME);

        if (!fileId) return null;

        const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
            headers: { Authorization: `Bearer ${this.accessToken}` }
        });

        if (res.status === 401) throw new Error('Google Drive token expired');
        if (!res.ok) return null;

        try {
            const data = await res.json();
            // Handle legacy format where data was just an array of TextSet
            if (Array.isArray(data)) {
                return {
                    textSets: data as TextSet[],
                    readingProgress: {}
                };
            }
            // Handle new format
            if (data && typeof data === 'object' && Array.isArray(data.textSets)) {
                return data as SyncData;
            }
            return null;
        } catch {
            return null;
        }
    }
}

// Export a singleton instance
export const driveSync = new GoogleDriveSync();
