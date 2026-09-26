interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  /** 'true' routes all API calls to local fixtures (src/mocks). */
  readonly VITE_USE_MOCK_DATA?: string;
  /** Average simulated latency in ms for mock responses (default 350). */
  readonly VITE_MOCK_LATENCY?: string;
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly MODE: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}