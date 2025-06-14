// models/Post.js - Mongoose model for Post
import mongoose from 'mongoose';

const PostSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId, // Reference to the User who created the post
      required: true,
      ref: 'User', // Link to the 'User' model
    },
    content: {
      type: String,
      required: [true, 'Post content cannot be empty'], // Content is required
      maxlength: [500, 'Post content cannot exceed 500 characters'], // Maximum length
    },
    image: {
      type: String,
      default: '', // Optional image URL for the post
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId, // Array of User IDs who liked the post
        ref: 'User',
      },
    ],
    comments: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId, // User who made the comment
          required: true,
          ref: 'User',
        },
        text: {
          type: String,
          required: [true, 'Comment text cannot be empty'], // Comment text
          maxlength: [200, 'Comment text cannot exceed 200 characters'],
        },
        createdAt: {
          type: Date,
          default: Date.now, // Timestamp for the comment
        },
      },
    ],
  },
  {
    timestamps: true, // Add createdAt and updatedAt timestamps for the post
  },
);

const Post = mongoose.model('Post', PostSchema); // Create the Post model

export default Post; // Export the Post model

