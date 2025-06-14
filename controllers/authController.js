import User from '../models/User.js';
import jwt from 'jsonwebtoken';

// Helper function to generate a JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

// @desc    Register a new user
// @route   POST /api/auth/signup
// @access  Public
const signupUser = async(req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: 'Please enter all fields' });
  }

  const userExists = await User.findOne({ $or: [{ email }, { username }] });

  if (userExists) {
    return res.status(400).json({ message: 'User already exists' });
  }

  try {
    // Create a new user in the database
    const user = await User.create({
      username,
      email,
      password,
    });

    // If user created successfully, send success response with token
    if (user) {
      res.status(201).json({
        _id: user._id,
        username: user.username,
        email: user.email,
        profilePicture: user.profilePicture,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during signup' });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async(req, res) => {
  const { email, password } = req.body;

  // Check if email and password are provided
  if (!email || !password) {
    return res.status(400).json({ message: 'Please enter all fields' });
  }

  try {
    // Find user by email
    const user = await User.findOne({ email });

    // Check if user exists and password matches
    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        username: user.username,
        email: user.email,
        profilePicture: user.profilePicture,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
const getUserProfile = async(req, res) => {
  // req.user is populated by the protect middleware
  res.json({
    _id: req.user._id,
    username: req.user.username,
    email: req.user.email,
    profilePicture: req.user.profilePicture,
    followers: req.user.followers,
    following: req.user.following,
  });
};

export { signupUser, loginUser, getUserProfile };

