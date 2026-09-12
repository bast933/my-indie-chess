import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { config } from './config.js';
import { setupSocketHandlers } from './socketHandlers.js';

const app = express();
const httpServer = createServer(app);

// CORS configuration
app.use(cors({
  origin: config.corsOrigin,
  credentials: true
}));

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Socket.IO setup
const io = new Server(httpServer, {
  cors: {
    origin: config.corsOrigin,
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// Setup socket handlers
setupSocketHandlers(io);

// Start server
httpServer.listen(config.port, () => {
  console.log(`🚀 Indie Chess Server running on port ${config.port}`);
  console.log(`📍 CORS origin: ${config.corsOrigin}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
