// app.js - Main Express application file
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cron from 'node-cron'; // NEW: Import node-cron
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import postRoutes from './routes/postRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js'; // NEW: Import notification routes
import { fetchNewsAndPost } from './controllers/botController.js'; // NEW: Import bot controller function

dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Body parser for JSON requests

// Routes
app.use('/api/auth', authRoutes); // Authentication routes (signup, login)
app.use('/api/posts', postRoutes); // Post-related routes (create, read, update, delete, like, comment)
app.use('/api/ai', aiRoutes);
app.use('/api/notifications', notificationRoutes); // NEW: Use notification routes

// NEW: Health Check Endpoint for Ping Services
app.get('/health', (req, res) => {
  res.status(200).send('Backend is alive!');
});

// Basic route for testing server
app.get('/', (req, res) => {
  res.send('API is running...');
});

cron.schedule('*/15 * * * *', () => {
  console.log('Running scheduled bot news posting...');
  fetchNewsAndPost();
}, {
  scheduled: true,
  timezone: 'America/Chicago', // Or your desired timezone (e.g., 'UTC', 'America/New_York')
});

// Optional: A route to manually trigger the bot for testing
app.post('/api/bots/trigger-news-post', (req, res) => {
  console.log('Manual trigger for bot news posting received.');
  fetchNewsAndPost();
  res.status(200).json({ message: 'Bot news posting triggered manually.' });
});

// app.use((err, req, res, next) => {
//   console.error(err.stack);
//   res.status(500).send('Something broke!');
// });

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

//Skipping testing for now
// if (process.env.NODE_ENV !== 'test') {
//   app.listen(PORT, () => {
//     console.log(`Server running on port ${PORT}`);
//   });
// }
// export default app;
