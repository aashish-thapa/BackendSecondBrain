// routes/aiRoutes.js - Routes for AI features
import express from 'express';
import { analyzePost } from '../controllers/aiController.js';
import { protect } from '../middlewares/auth.js'; // Import the authentication middleware

const router = express.Router();

// Route to analyze a specific post by ID using AI
router.post('/analyze/:postId', protect, analyzePost);

export default router;
