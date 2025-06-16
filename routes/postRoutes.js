// routes/postRoutes.js - Routes for social features
import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { protect } from '../middlewares/auth.js';
import dotenv from 'dotenv';
import {
  createPost,
  getAllPosts,
  getPostById,
  deletePost,
  likePost,
  addComment,
  getFeedPosts,
  getTrendingTopics,
  getPostsByTopic,
} from '../controllers/postController.js';

dotenv.config();

const router = express.Router();

// --- Cloudinary Configuration ---
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Multer to use Cloudinary Storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'second-brain-posts',
    format: async(req, file) => 'png', // Always save as PNG for consistency, or use original format
    public_id: (req, file) => `post-${Date.now()}-${file.originalname.split('.')[0]}`.replace(/[^a-zA-Z0-9-.]/g, ''), // Generate unique public_id, allow periods
  },
  allowedFormats: ['jpg', 'jpeg', 'png', 'gif'],
});

// Create the multer upload middleware
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB file size limit
});
// --- END Cloudinary Configuration ---

// All post routes require authentication (protect middleware)
router.route('/').post(
  protect,
  upload.single('image'), // Multer middleware to handle single file upload named 'image'
  (req, res, next) => { // NEW: Debugging middleware
    console.log('--- Inside postRoutes.js after Multer ---');
    console.log('req.file:', req.file); // Check if Multer successfully processed the file
    console.log('req.body:', req.body); // Check other form fields
    if (!req.file) {
      console.log('No file uploaded by Multer.');
      // Optional: If you want to return an error if no image is uploaded
      // return res.status(400).json({ message: 'Image file is required.' });
    }
    next(); // Continue to the createPost controller
  },
  createPost,
).get(protect, getAllPosts); // Create post, Get all posts

router.route('/feed').get(protect, getFeedPosts);
router.get('/trending-topics', protect, getTrendingTopics);
router.get('/by-topic', protect, getPostsByTopic);
router.route('/:id').get(protect, getPostById).delete(protect, deletePost);
router.route('/:id/like').put(protect, likePost);
router.route('/:id/comment').post(protect, addComment);

export default router;
