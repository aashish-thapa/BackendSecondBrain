// routes/postRoutes.js - Post-related routes
import express from 'express';
import {
  createPost,
  getAllPosts, // Corrected from getPosts
  getPostById,
  deletePost,
  likePost,
  addComment,
  getFeedPosts,
} from '../controllers/postController.js';
import { protect } from '../middlewares/auth.js';

const router = express.Router();

// Route to create a new post and get all posts
router.route('/').post(protect, createPost).get(protect, getAllPosts);

// Route for personalized user feed
router.get('/feed', protect, getFeedPosts);

// Routes for single post operations
router.route('/:id').get(protect, getPostById).delete(protect, deletePost);

// Route to like/unlike a post
router.put('/:id/like', protect, likePost);

// Route to add a comment to a post
router.post('/:id/comment', protect, addComment);

export default router;
