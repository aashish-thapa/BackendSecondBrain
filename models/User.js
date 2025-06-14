// models/User.js - Mongoose model for User
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs'; // Import bcrypt for password hashing

const UserSchema = mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Please add a username'], // Username is required
      unique: true, // Username must be unique
      trim: true, // Trim whitespace from username
      minlength: [3, 'Username must be at least 3 characters long'], // Minimum length
    },
    email: {
      type: String,
      required: [true, 'Please add an email'], // Email is required
      unique: true, // Email must be unique
      match: [
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
        'Please enter a valid email', // Regex for email validation
      ],
    },
    password: {
      type: String,
      required: [true, 'Please add a password'], // Password is required
      minlength: [6, 'Password must be at least 6 characters long'], // Minimum length
    },
    profilePicture: {
      type: String,
      default: 'https://placehold.co/150x150/cccccc/ffffff?text=Profile', // Default profile picture
    },
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Array of user IDs who follow this user
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Array of user IDs this user follows
  },
  {
    timestamps: true, // Add createdAt and updatedAt timestamps
  },
);

// Pre-save hook to hash the password before saving a new user or updating password
UserSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) {
    next();
  }

  // Generate a salt with 10 rounds
  const salt = await bcrypt.genSalt(10);
  // Hash the password using the generated salt
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to compare entered password with hashed password
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', UserSchema); // Create the User model

export default User; // Export the User model

