import mongoose from 'mongoose';
import { config } from './config.js';
import { createApp } from './app.js';

await mongoose.connect(config.mongoUri);
console.log('Connected to MongoDB');

const server = createApp().listen(config.port, () => console.log(`API listening on http://localhost:${config.port}`));

// Finish open requests and close the database cleanly on shutdown.
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => mongoose.disconnect().then(() => process.exit(0))));
}
