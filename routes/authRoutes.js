import express from 'express';
import { signupUser, loginUser, getUserProfile } from '../controllers/authController.js';
import { protect } from '../middlewares/auth.js';

const router = express.Router();

router.post('/signup', signupUser); // Route for user registration
router.post('/login', loginUser);   // Route for user login
router.get('/profile', protect, getUserProfile); // Protected route to get user profile

export default router;

