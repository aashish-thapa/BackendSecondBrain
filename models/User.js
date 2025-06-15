// models/User.js - Mongoose model for User
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const userSchema = mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    profilePicture: {
      type: String,
      default: 'https://placehold.co/150x150/cccccc/ffffff?text=Profile',
    },
    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    following: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    userPreferences: { // NEW FIELD: Store user's aggregated preferences
      likedCategories: {
        type: Map, // Key: category name (string), Value: count (Number)
        of: Number,
        default: {},
      },
      likedTopics: {
        type: Map, // Key: topic name (string), Value: count (Number)
        of: Number,
        default: {},
      },
    },
  },
  {
    timestamps: true,
  },
);

// Encrypt password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate JWT
userSchema.methods.getSignedJwtToken = function() {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const User = mongoose.model('User', userSchema);

export default User;
