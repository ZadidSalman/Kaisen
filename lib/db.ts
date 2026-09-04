import mongoose, { Schema, Document } from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI

let cached = (global as any).__mongoose ?? { conn: null, promise: null }
;(global as any).__mongoose = cached

export async function connectDB() {
  // Keep this check inside the connection function. Route handlers can then
  // return their normal JSON error response instead of failing while modules
  // are imported and producing Next.js's HTML error document.
  if (!MONGODB_URI) {
    console.warn('[AI Studio] MONGODB_URI not set in environment. Database features will be unavailable.');
    return null;
  }
  if (cached.conn) return cached.conn
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      dbName: 'kaikansen',
    })
  }
  try {
    cached.conn = await cached.promise
  } catch (err) {
    cached.promise = null
    throw err
  }
  return cached.conn
}

export default connectDB
