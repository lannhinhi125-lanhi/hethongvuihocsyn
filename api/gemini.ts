import {createGeminiHandler} from '../server/geminiHandler.js';

// Vercel injects deployment environment variables at runtime.
// Local .env files are never loaded here.
export default createGeminiHandler();
