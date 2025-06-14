import express from 'express';
import {
  createPost,
  getPosts,
  getPostById,
  deletePost,
  likePost,
  addComment,
  getUserFeed,
} from '../controllers/postController.js';
import { protect } from '../middlewares/auth.js';

const router = express.Router();

// All post routes require authentication (protect middleware)
router.route('/').post(protect, createPost).get(protect, getPosts);
router.route('/feed').get(protect, getUserFeed); // Get user's personalized feed
router
  .route('/:id')
  .get(protect, getPostById)
  .delete(protect, deletePost);
router.route('/:id/like').put(protect, likePost); // Toggle like on a post
router.route('/:id/comment').post(protect, addComment); // Add a comment to a post

export default router;
