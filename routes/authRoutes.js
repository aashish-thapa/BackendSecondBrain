// routes/authRoutes.js - Authentication and User Management routes
import express from 'express';
import {
  registerUser,
  loginUser,
  getProfile,
  updateProfilePicture,
  followUser,
  unfollowUser,
  searchUsers,        // New: Import searchUsers
  getSuggestedUsers,  // New: Import getSuggestedUsers
  getUserById,         // New: Import getUserById for viewing any profile
} from '../controllers/authController.js';
import { protect } from '../middlewares/auth.js';
import upload from '../utils/upload.js';

const router = express.Router();

router.post('/signup', registerUser);
router.post('/login', loginUser);

// Protected routes for current user's profile and follow/unfollow actions
router.get('/profile', protect, getProfile); // Get authenticated user's own profile
router.put('/profile/picture', protect, upload.single('profilePicture'), updateProfilePicture);
router.put('/follow/:id', protect, followUser);     // Follow a user by their ID
router.put('/unfollow/:id', protect, unfollowUser); // Unfollow a user by their ID

// New routes for user discovery
router.get('/search', protect, searchUsers);           // Search users by username (query param)
router.get('/suggested', protect, getSuggestedUsers);  // Get a list of suggested users to follow
router.get('/:id', protect, getUserById);              // Get any user's profile by ID (Public profile view)

export default router;
