import { httpApi } from './http.js';
import { demoApi } from './demo.js';

// With VITE_API_URL set the app uses the real API; without it, the in-browser demo.
export const api = import.meta.env.VITE_API_URL ? httpApi : demoApi;
export const isDemo = api.mode === 'demo';
