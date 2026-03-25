require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: process.env.CLIENT_ORIGIN, methods: ['GET', 'POST'] }
});

app.set('io', io);

// Middleware
app.use(cors({ origin: process.env.CLIENT_ORIGIN, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB connection with in-memory fallback
async function connectMongoDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    console.log('✅ MongoDB connected to', process.env.MONGODB_URI);
  } catch (err) {
    console.warn('⚠️  Local MongoDB not available:', err.message);
    console.log('🔄 Starting in-memory MongoDB server...');
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri);
    console.log('✅ In-memory MongoDB connected at', uri);
    console.log('⚠️  Data will not persist after server restart. Install MongoDB locally or use MongoDB Atlas for persistence.');
  }
}

connectMongoDB().catch(err => console.error('❌ MongoDB connection failed entirely:', err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/wallet', require('./routes/wallet'));
app.use('/api/payment', require('./routes/payment'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/goals', require('./routes/goals'));
app.use('/api/parental', require('./routes/parental'));
app.use('/api/users', require('./routes/users'));
app.use('/api/recharge', require('./routes/recharge'));
app.use('/api/tickets', require('./routes/tickets'));
app.use('/api/gold', require('./routes/gold'));
app.use('/api/bills', require('./routes/bills'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/badges', require('./routes/badges'));
app.use('/api/budgets', require('./routes/budgets'));
app.use('/api/export', require('./routes/export'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// Socket.io
io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);
  socket.on('join', ({ userId }) => {
    if (userId) {
      socket.join(`user-${userId}`);
      socket.join(`parent-${userId}`);
      console.log(`User ${userId} joined rooms`);
    }
  });
  socket.on('disconnect', () => console.log('Socket disconnected:', socket.id));
});

// ===== CRON JOBS =====

// 1. Weekly Allowance — daily at 9am, check if today matches allowance day
cron.schedule('0 9 * * *', async () => {
  try {
    const ParentalControl = require('./models/ParentalControl');
    const User = require('./models/User');
    const Transaction = require('./models/Transaction');
    const Notification = require('./models/Notification');
    const now = new Date();
    const dayOfWeek = now.getDay();
    const pcs = await ParentalControl.find({ 'allowanceSchedule.enabled': true, 'allowanceSchedule.dayOfWeek': dayOfWeek });
    for (const pc of pcs) {
      const amount = pc.allowanceSchedule.amount;
      if (!amount || amount <= 0) continue;
      const lastSent = pc.allowanceSchedule.lastSent;
      if (lastSent && (now - lastSent) < 6 * 24 * 60 * 60 * 1000) continue;
      const child = await User.findByIdAndUpdate(pc.childId, { $inc: { walletBalance: amount } }, { new: true });
      if (child) {
        await Transaction.create({ userId: pc.childId, type: 'credit', amount, merchant: 'Weekly Allowance', category: 'allowance', status: 'approved', balanceAfter: child.walletBalance, authMethod: 'none' });
        pc.allowanceSchedule.lastSent = now;
        pc.notifications.push({ message: `₹${amount} allowance sent to ${child.name}.`, type: 'allowance', amount, merchant: 'Allowance' });
        await pc.save();
        await Notification.create({ userId: pc.childId, type: 'allowance', message: `₹${amount} weekly allowance received!` });
        io.to(`user-${pc.childId}`).emit('allowance_received', { amount, walletBalance: child.walletBalance });
      }
    }
  } catch (err) {
    console.error('Allowance cron error:', err);
  }
});

// 2. Auto-Pay (Standing Instructions) — runs every hour
cron.schedule('0 * * * *', async () => {
  try {
    const ParentalControl = require('./models/ParentalControl');
    const User = require('./models/User');
    const Transaction = require('./models/Transaction');
    const Notification = require('./models/Notification');
    const now = new Date();
    const dayOfWeek = now.getDay();
    const dayOfMonth = now.getDate();

    const allPCs = await ParentalControl.find({ 'autoPaySchedules.0': { $exists: true } });
    for (const pc of allPCs) {
      for (const schedule of pc.autoPaySchedules) {
        if (!schedule.isActive) continue;
        if (schedule.startDate && now < schedule.startDate) continue;
        if (schedule.endDate && now > schedule.endDate) continue;

        let shouldExecute = false;
        if (schedule.frequency === 'weekly' && schedule.dayOfWeek === dayOfWeek) {
          const lastExec = schedule.lastExecuted;
          if (!lastExec || (now - lastExec) > 6 * 24 * 60 * 60 * 1000) shouldExecute = true;
        }
        if (schedule.frequency === 'monthly' && schedule.dayOfMonth === dayOfMonth) {
          const lastExec = schedule.lastExecuted;
          if (!lastExec || (now - lastExec) > 25 * 24 * 60 * 60 * 1000) shouldExecute = true;
        }

        if (shouldExecute) {
          const parent = pc.parentId ? await User.findById(pc.parentId) : null;
          const child = await User.findById(pc.childId);
          if (!child) continue;

          // Check parent balance if parent exists
          if (parent && parent.walletBalance < schedule.amount) {
            console.log(`Auto-pay failed for ${child.name}: Parent ${parent.name} has insufficient funds.`);
            await Notification.create({ userId: pc.parentId, type: 'blocked', message: `Auto-pay of ₹${schedule.amount} to ${child.name} failed due to insufficient funds.` });
            continue;
          }

          if (parent) {
            await User.findByIdAndUpdate(pc.parentId, { $inc: { walletBalance: -schedule.amount } });
          }
          
          const newChildBal = child.walletBalance + Number(schedule.amount);
          await User.findByIdAndUpdate(pc.childId, { walletBalance: newChildBal });
          
          await Transaction.create({ userId: pc.childId, type: 'credit', amount: schedule.amount, merchant: `Auto-Pay from ${parent?.name || 'Parent'}`, category: 'allowance', status: 'approved', balanceAfter: newChildBal, authMethod: 'none' });
          if (parent) {
            await Transaction.create({ userId: pc.parentId, type: 'debit', amount: schedule.amount, merchant: `Auto-Pay to ${child.name}`, category: 'allowance', status: 'approved', balanceAfter: parent.walletBalance - schedule.amount });
          }

          schedule.lastExecuted = now;
          await pc.save();

          await Notification.create({ userId: pc.childId, type: 'allowance', message: `₹${schedule.amount} auto-pay received!` });
          if (pc.parentId) {
            await Notification.create({ userId: pc.parentId, type: 'allowance', message: `₹${schedule.amount} auto-pay sent to ${child.name}.` });
          }
          io.to(`user-${pc.childId}`).emit('money_received', { amount: schedule.amount, walletBalance: newChildBal });
        }
      }
    }
  } catch (err) {
    console.error('Auto-pay cron error:', err);
  }
});

// 3. Divyang auto-debit (Standing Instructions) — reuses same pattern via User model
// This is handled by the same auto-pay mechanism for divyang users

// Seed blocked apps if empty
(async () => {
  try {
    const BlockedApp = require('./models/BlockedApp');
    const count = await BlockedApp.countDocuments();
    if (count === 0) {
      await BlockedApp.insertMany([
        { appName: 'Dream11', upiId: 'dream11@ybl', category: 'gambling' },
        { appName: 'MPL', upiId: 'mpl@paytm', category: 'gambling' },
        { appName: 'WinZO', upiId: 'winzo@ybl', category: 'gambling' },
        { appName: 'Rummy Circle', upiId: 'rummycircle@ybl', category: 'gambling' },
        { appName: 'BetWay', upiId: 'betway@ybl', category: 'betting' },
        { appName: 'Bet365', upiId: 'bet365@ybl', category: 'betting' },
        { appName: '1xBet', upiId: '1xbet@ybl', category: 'betting' },
        { appName: 'AdultSite', upiId: 'adult@ybl', category: 'adult' },
        { appName: 'SuspiciousApp', upiId: 'suspicious@ybl', category: 'suspicious' },
      ]);
      console.log('✅ Blocked apps seeded');
    }
  } catch (err) {
    console.error('Seed error:', err);
  }
})();

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 PayBridge backend running on port ${PORT}`));
