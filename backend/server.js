const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const { Server } = require('socket.io');
const http = require('http');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // For development
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Socket.IO
app.set('io', io); // Make io accessible in routes

const activeLocks = new Map(); // brandId -> adminId
let billingLock = null; // { adminName, socketId, timestamp }

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('lock_brand', ({ brandId, adminName }) => {
    if (!activeLocks.has(brandId)) {
      activeLocks.set(brandId, { adminName, socketId: socket.id, timestamp: Date.now() });
      io.emit('brand_locked', { brandId, adminName });
    }
  });

  socket.on('unlock_brand', ({ brandId }) => {
    if (activeLocks.has(brandId) && activeLocks.get(brandId).socketId === socket.id) {
      activeLocks.delete(brandId);
      io.emit('brand_unlocked', { brandId });
    }
  });

  socket.on('lock_billing', ({ adminName }) => {
    if (!billingLock) {
      billingLock = { adminName, socketId: socket.id, timestamp: Date.now() };
      io.emit('billing_locked', { adminName });
    }
  });

  socket.on('unlock_billing', () => {
    if (billingLock && billingLock.socketId === socket.id) {
      billingLock = null;
      io.emit('billing_unlocked');
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    for (const [brandId, lockInfo] of activeLocks.entries()) {
      if (lockInfo.socketId === socket.id) {
        activeLocks.delete(brandId);
        io.emit('brand_unlocked', { brandId });
      }
    }
    if (billingLock && billingLock.socketId === socket.id) {
      billingLock = null;
      io.emit('billing_unlocked');
    }
  });
});

// Auto unlock inactive locks (5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [brandId, lockInfo] of activeLocks.entries()) {
    if (now - lockInfo.timestamp > 5 * 60 * 1000) {
      activeLocks.delete(brandId);
      io.emit('brand_unlocked', { brandId });
    }
  }
  if (billingLock && now - billingLock.timestamp > 5 * 60 * 1000) {
    billingLock = null;
    io.emit('billing_unlocked');
  }
}, 60 * 1000);

// DB Connection
mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/rice_godown').then(() => console.log('MongoDB Connected to Atlas'))
  .catch(err => console.log(err));

// Routes (will be created next)
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/brands', require('./routes/brandRoutes'));
app.use('/api/bills', require('./routes/billRoutes'));
app.use('/api/summary', require('./routes/summaryRoutes'));
app.use('/api/search', require('./routes/searchRoutes'));
app.use('/api/upload', require('./routes/uploadRoutes'));

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
