export interface ModelPreferences {
  selectedModel: string;
  preferredDevice: 'webgpu' | 'wasm' | 'cpu';
  autoSelect: boolean;
  // Add other fields if needed from context
} 