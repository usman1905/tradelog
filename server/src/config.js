// All settings come from environment variables. See server/.env.example.
const env = process.env;

export const config = {
  port: Number(env.PORT) || 4000,
  mongoUri: env.MONGODB_URI || 'mongodb://127.0.0.1:27017/tradelog',
  jwtSecret: env.JWT_SECRET || (env.NODE_ENV === 'production' ? null : 'dev-only-secret-change-me'),
  jwtExpiresIn: env.JWT_EXPIRES_IN || '7d',
  // Comma-separated list of browser origins allowed to call the API.
  clientOrigins: (env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').map(s => s.trim()).filter(Boolean),
  isTest: env.NODE_ENV === 'test'
};

if (!config.jwtSecret) throw new Error('JWT_SECRET must be set in production');
