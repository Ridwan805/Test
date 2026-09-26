import mongoose from 'mongoose';
import dns from 'dns';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Use reliable public DNS servers (Google 8.8.8.8 & Cloudflare 1.1.1.1) to resolve Atlas SRV records
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // Ignore if custom DNS servers cannot be set
}

// Fix Windows Node.js DNS SRV resolution order for MongoDB Atlas mongodb+srv URIs
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

let mongoMemoryServer = null;

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) {
    return;
  }
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/aintuition_db';
  
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
    console.log(`[MongoDB Cloud] Connected successfully to MongoDB Atlas: ${mongoose.connection.host}`);
  } catch (err) {
    console.warn(`[MongoDB Warning] Could not connect to remote MongoDB Atlas (${err.message}).`);
    console.log('[MongoDB Fallback] Initializing MongoMemoryServer in-memory database for seamless local development...');
    
    try {
      mongoMemoryServer = await MongoMemoryServer.create();
      const memUri = mongoMemoryServer.getUri();
      await mongoose.connect(memUri);
      console.log(`[MongoDB] Connected successfully to In-Memory MongoDB at: ${memUri}`);
    } catch (memErr) {
      console.error('[MongoDB Error] Failed to start in-memory database:', memErr);
      process.exit(1);
    }
  }
};

export default connectDB;
