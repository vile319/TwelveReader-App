import { TextSet } from '../types';

export class GoogleDriveSync {
    private accessToken: string | null = null;
    private folderId: string | null = null;
    private fileId: string | null = null;
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

        if (!createRes.ok) throw new Error('Failed to create sync folder');
        const createData = await createRes.json();
        this.folderId = createData.id;
        return this.folderId!;
    }

    private async getFileId(folderId: string): Promise<string | null> {
        if (this.fileId) return this.fileId;
        if (!this.accessToken) throw new Error("Not authenticated");

        const query = encodeURIComponent(`name='${this.FILE_NAME}' and '${folderId}' in parents and trashed=false`);
        const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&spaces=drive`, {
            headers: { Authorization: `Bearer ${this.accessToken}` }
        });

        if (!res.ok) return null;
        const data = await res.json();

        if (data.files && data.files.length > 0) {
            this.fileId = data.files[0].id;
            return this.fileId;
        }
        return null;
    }

    async uploadTextSets(sets: TextSet[]): Promise<void> {
        if (!this.accessToken) return;

        const folderId = await this.getFolderId();
        const fileId = await this.getFileId(folderId);

        const fileContent = JSON.stringify(sets);
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

    async fetchTextSets(): Promise<TextSet[] | null> {
        if (!this.accessToken) return null;

        const folderId = await this.getFolderId();
        const fileId = await this.getFileId(folderId);

        if (!fileId) return null;

        const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
            headers: { Authorization: `Bearer ${this.accessToken}` }
        });

        if (!res.ok) return null;

        try {
            const data = await res.json();
            return Array.isArray(data) ? data as TextSet[] : null;
        } catch {
            return null;
        }
    }
}

// Export a singleton instance
export const driveSync = new GoogleDriveSync();
