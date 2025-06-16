// controllers/authController.js - User authentication and profile management
import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createNotification } from './notificationController.js';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const getCloudinaryPublicId = (imageUrl) => {
  if (!imageUrl || !imageUrl.includes('res.cloudinary.com')) return null;
  const parts = imageUrl.split('/');
  const uploadIndex = parts.indexOf('upload');
  if (uploadIndex === -1 || uploadIndex + 1 >= parts.length) return null;
  const publicIdWithExt = parts.slice(uploadIndex + 2).join('/');
  return publicIdWithExt.split('.')[0];
};

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

// Register a new user
const registerUser = async(req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ message: 'Please enter all fields.' });
  }

  try {
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: 'User with this email already exists.' });

    user = await User.findOne({ username });
    if (user) return res.status(400).json({ message: 'Username already taken.' });

    user = new User({ username, email, password });
    await user.save();

    res.status(201).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      profilePicture: user.profilePicture,
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during signup.' });
  }
};

// Login user
const loginUser = async(req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Please enter all fields.' });
  }

  try {
    const user = await User.findOne({ email });
    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        username: user.username,
        email: user.email,
        profilePicture: user.profilePicture,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid credentials.' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during login.' });
  }
};

// Get logged-in user profile
const getProfile = async(req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password')
      .populate('followers', 'username profilePicture')
      .populate('following', 'username profilePicture');

    if (user) res.json(user);
    else res.status(404).json({ message: 'User not found.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// Update profile picture
const updateProfilePicture = async(req, res) => {
  console.log('--- Inside updateProfilePicture controller ---');
  console.log('req.file (uploaded image info):', req.file);

  const profilePictureUrl = req.file ? req.file.path : null;
  const defaultProfilePicUrl = 'https://placehold.co/150x150/cccccc/ffffff?text=Profile';

  if (!profilePictureUrl) {
    return res.status(400).json({ message: 'No image file provided or invalid file type/size.' });
  }

  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    if (user.profilePicture && user.profilePicture !== defaultProfilePicUrl) {
      const oldPublicId = getCloudinaryPublicId(user.profilePicture);
      if (oldPublicId) {
        try {
          await cloudinary.uploader.destroy(oldPublicId);
          console.log(`Cloudinary old profile picture deleted: ${oldPublicId}`);
        } catch (cloudinaryError) {
          console.error('Failed to delete old profile picture:', cloudinaryError);
        }
      }
    }

    user.profilePicture = profilePictureUrl;
    await user.save();

    res.json({
      message: 'Profile picture updated successfully.',
      profilePicture: user.profilePicture,
      userId: user._id,
    });
  } catch (error) {
    console.error('Error updating profile picture:', error);
    res.status(500).json({ message: 'Server error updating profile picture.' });
  }
};

// Follow a user
const followUser = async(req, res) => {
  try {
    const userToFollowId = req.params.id;
    const loggedInUserId = req.user._id;

    if (userToFollowId.toString() === loggedInUserId.toString()) {
      return res.status(400).json({ message: 'You cannot follow yourself.' });
    }

    const userToFollow = await User.findById(userToFollowId);
    const loggedInUser = await User.findById(loggedInUserId);
    if (!userToFollow || !loggedInUser) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (loggedInUser.following.includes(userToFollowId)) {
      return res.status(400).json({ message: 'Already following this user.' });
    }

    loggedInUser.following.push(userToFollowId);
    userToFollow.followers.push(loggedInUserId);
    await loggedInUser.save();
    await userToFollow.save();

    await createNotification({
      recipient: userToFollow._id,
      type: 'follow',
      initiator: req.user._id,
      post: null,
      message: `${req.user.username} started following you.`,
    });

    res.json({ message: `Successfully followed ${userToFollow.username}.` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during follow operation.' });
  }
};

// Unfollow a user
const unfollowUser = async(req, res) => {
  try {
    const userToUnfollowId = req.params.id;
    const loggedInUserId = req.user._id;

    if (userToUnfollowId.toString() === loggedInUserId.toString()) {
      return res.status(400).json({ message: 'You cannot unfollow yourself.' });
    }

    const userToUnfollow = await User.findById(userToUnfollowId);
    const loggedInUser = await User.findById(loggedInUserId);
    if (!userToUnfollow || !loggedInUser) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (!loggedInUser.following.includes(userToUnfollowId)) {
      return res.status(400).json({ message: 'Not currently following this user.' });
    }

    loggedInUser.following = loggedInUser.following.filter(
      (id) => id.toString() !== userToUnfollowId.toString(),
    );
    userToUnfollow.followers = userToUnfollow.followers.filter(
      (id) => id.toString() !== loggedInUserId.toString(),
    );

    await loggedInUser.save();
    await userToUnfollow.save();

    res.json({ message: `Successfully unfollowed ${userToUnfollow.username}.` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during unfollow operation.' });
  }
};

// Search users by username
const searchUsers = async(req, res) => {
  const { username } = req.query;
  const loggedInUserId = req.user._id;

  if (!username) {
    return res.status(400).json({ message: 'Search query (username) is required.' });
  }

  try {
    const users = await User.find({
      username: { $regex: username, $options: 'i' },
      _id: { $ne: loggedInUserId },
    }).select('-password');

    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during user search.' });
  }
};

// Get suggested users to follow
const getSuggestedUsers = async(req, res) => {
  try {
    const loggedInUser = await User.findById(req.user._id);
    if (!loggedInUser) return res.status(404).json({ message: 'User not found.' });

    const followingIds = loggedInUser.following.map(id => id.toString());
    const ownUserId = loggedInUser._id.toString();

    const suggestedUsers = await User.find({
      _id: { $ne: ownUserId, $nin: followingIds },
    }).select('-password -email -followers');

    res.json(suggestedUsers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching suggested users.' });
  }
};

// Get any user's profile by ID
const getUserById = async(req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('followers', 'username profilePicture')
      .populate('following', 'username profilePicture');

    if (!user) return res.status(404).json({ message: 'User not found.' });

    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error retrieving user profile.' });
  }
};

export {
  registerUser,
  loginUser,
  getProfile,
  followUser,
  unfollowUser,
  searchUsers,
  getSuggestedUsers,
  updateProfilePicture,
  getUserById,
};
