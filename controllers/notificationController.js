// controllers/notificationController.js - Logic for notification management
import Notification from '../models/Notification.js';

const createNotification = async({ recipient, type, initiator, post, message }) => {
  try {
    if (recipient.toString() === initiator.toString()) return;

    const notification = new Notification({
      recipient,
      type,
      initiator,
      post,
      message,
    });
    await notification.save();
    console.log(`Notification created for ${recipient}: ${message}`);
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};

const getNotifications = async(req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .populate('initiator', 'username profilePicture')
      .populate('post', 'content')
      .sort({ createdAt: -1 });

    res.json(notifications);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching notifications.' });
  }
};

const markNotificationAsRead = async(req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found.' });
    }

    if (notification.recipient.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized to mark this notification as read.' });
    }

    notification.read = true;
    await notification.save();

    res.json({ message: 'Notification marked as read.', notification });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error marking notification as read.' });
  }
};

const markAllNotificationsAsRead = async(req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, read: false },
      { $set: { read: true } },
    );

    res.json({ message: 'All notifications marked as read.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error marking all notifications as read.' });
  }
};

export {
  createNotification,
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
};
