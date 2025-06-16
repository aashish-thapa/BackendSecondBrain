import mongoose from 'mongoose';

const notificationSchema = mongoose.Schema(
  {
    // The user who receives this notification
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // The type of notification (e.g., 'like', 'comment', 'follow')
    type: {
      type: String,
      enum: ['like', 'comment', 'follow'],
      required: true,
    },
    // The user who initiated the action (e.g., the one who liked, commented, or followed)
    initiator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Reference to the post if the notification is related to a post (like, comment)
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: function() { return this.type === 'like' || this.type === 'comment'; }, // Required only for 'like' and 'comment' types
    },
    // A concise message for the notification
    message: {
      type: String,
      required: true,
    },
    // Whether the notification has been read by the recipient
    read: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields
  },
);

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
