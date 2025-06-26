// app.js - Main Express application file
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import postRoutes from './routes/postRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import cron from 'node-cron';
import { fetchNewsAndPost } from './controllers/botController.js';

dotenv.config();

connectDB();

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/health', (req, res) => {
  res.status(200).send('Backend is alive!');
});

app.get('/', (req, res) => {
  res.send('API is running...');
});

// NEW: Schedule the bot's news posting task to run every 40 minutes
// Calculation: (24 hours * 60 minutes) / 40 minutes = 36 runs per day
// Total Newsdata.io API calls per day: 5 news bots * 1 call/bot * 36 runs/day = 180 calls/day (within 200 limit)
// The Motivation bot's ZenQuotes.io calls are separate and do not count towards this.
cron.schedule('*/40 * * * *', () => {
  console.log('Running scheduled bot news posting...');
  fetchNewsAndPost();
}, {
  scheduled: true,
  timezone: 'America/Chicago', // Or your desired timezone
});

app.post('/api/bots/trigger-news-post', (req, res) => {
  console.log('Manual trigger for bot news posting received.');
  fetchNewsAndPost();
  res.status(200).json({ message: 'Bot news posting triggered manually.' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
