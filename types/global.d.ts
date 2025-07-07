declare namespace NodeJS {
  // Add custom environment variables here if needed
  interface ProcessEnv {
    readonly NODE_ENV?: 'development' | 'production' | 'test';
    // Vite prefixed env vars could be declared like:
    // readonly VITE_API_URL?: string;
  }
}