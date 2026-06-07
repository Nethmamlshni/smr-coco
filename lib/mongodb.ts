import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) throw new Error('MONGODB_URI is not defined');

declare global {
  var _mongooseConn: typeof mongoose | null;
  var _mongoosePromise: Promise<typeof mongoose> | null;
}

let cached = global._mongooseConn;
let cachedPromise = global._mongoosePromise;

export async function connectDB() {
  if (cached) return cached;
  if (!cachedPromise) {
    cachedPromise = mongoose.connect(MONGODB_URI, { bufferCommands: false }).then(m => {
      global._mongooseConn = m;
      return m;
    });
  }
  cached = await cachedPromise;
  return cached;
}
