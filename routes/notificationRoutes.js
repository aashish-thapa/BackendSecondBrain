// routes/notificationRoutes.js - API routes for notifications
import express from 'express';
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../controllers/notificationController.js';
import { protect } from '../middlewares/auth.js'; // Protect routes

const router = express.Router();

// Get notifications for the authenticated user
router.get('/', protect, getNotifications);

// Mark a specific notification as read
router.put('/:id/read', protect, markNotificationAsRead);

// Mark all notifications for the authenticated user as read
router.put('/read-all', protect, markAllNotificationsAsRead);

export default router;
