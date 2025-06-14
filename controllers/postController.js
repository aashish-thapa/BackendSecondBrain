// controllers/postController.js - Controllers for posts, likes, comments
import Post from '../models/Post.js';
import User from '../models/User.js';

// @desc    Create a new post
// @route   POST /api/posts
// @access  Private
const createPost = async(req, res) => {
  const { content, image } = req.body;

  if (!content) {
    return res.status(400).json({ message: 'Post content is required.' });
  }

  try {
    const post = await Post.create({
      user: req.user._id,
      content,
      image,
    });
    res.status(201).json(post);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error: Could not create post.' });
  }
};

// @desc    Get all posts (for feed)
// @route   GET /api/posts
// @access  Private (or Public, depending on requirements)
const getPosts = async(req, res) => {
  try {
    // Find all posts, sort by creation date (newest first), and populate user info
    const posts = await Post.find({})
      .sort({ createdAt: -1 })
      .populate('user', 'username profilePicture')
      .populate('comments.user', 'username profilePicture');

    res.json(posts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error: Could not retrieve posts.' });
  }
};

// @desc    Get a single post by ID
// @route   GET /api/posts/:id
// @access  Private (or Public)
const getPostById = async(req, res) => {
  try {
    // Find a post by its ID
    const post = await Post.findById(req.params.id)
      .populate('user', 'username profilePicture')
      .populate('comments.user', 'username profilePicture');

    // If post not found, respond with 404
    if (!post) {
      return res.status(404).json({ message: 'Post not found.' });
    }
    res.json(post); // Respond with the found post
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error: Could not retrieve post.' });
  }
};

// @desc    Delete a post
// @route   DELETE /api/posts/:id
// @access  Private
const deletePost = async(req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found.' });
    }

    // Check if the authenticated user is the owner of the post
    if (post.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized to delete this post.' });
    }

    await Post.deleteOne({ _id: req.params.id }); // Use deleteOne for Mongoose 6+

    res.json({ message: 'Post removed.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error: Could not delete post.' });
  }
};

// @desc    Like/Unlike a post
// @route   PUT /api/posts/:id/like
// @access  Private
const likePost = async(req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found.' });
    }

    // Check if the user has already liked the post
    const isLiked = post.likes.includes(req.user._id);

    if (isLiked) {
      // If already liked, unlike the post (remove user ID from likes array)
      post.likes = post.likes.filter((like) => like.toString() !== req.user._id.toString());
      await post.save();
      res.json({ message: 'Post unliked.', post });
    } else {
      // If not liked, like the post (add user ID to likes array)
      post.likes.push(req.user._id);
      await post.save();
      res.json({ message: 'Post liked.', post });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error: Could not like/unlike post.' });
  }
};

// @desc    Add a comment to a post
// @route   POST /api/posts/:id/comment
// @access  Private
const addComment = async(req, res) => {
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ message: 'Comment text is required.' });
  }

  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found.' });
    }

    // Create a new comment object
    const newComment = {
      user: req.user._id, // User ID of the commenter
      text,
    };

    post.comments.push(newComment); // Add the new comment to the post's comments array
    await post.save(); // Save the updated post

    // Re-populate the user field in the newly added comment for immediate response
    const populatedPost = await Post.findById(req.params.id)
      .populate('user', 'username profilePicture')
      .populate('comments.user', 'username profilePicture');

    res.status(201).json(populatedPost.comments[populatedPost.comments.length - 1]); // Respond with the newly added comment
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error: Could not add comment.' });
  }
};

// @desc    Get user-specific feed (posts from followed users + own posts)
// @route   GET /api/posts/feed
// @access  Private
const getUserFeed = async(req, res) => {
  try {
    const user = await User.findById(req.user._id); // Get the authenticated user
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Get IDs of users the current user is following
    const followingUsers = user.following;

    // Include the current user's own ID in the list to fetch their posts too
    const usersToFetch = [...followingUsers, req.user._id];

    // Find posts where the user field is in the usersToFetch array
    const feedPosts = await Post.find({ user: { $in: usersToFetch } })
      .sort({ createdAt: -1 }) // Sort by newest first
      .populate('user', 'username profilePicture')
      .populate('comments.user', 'username profilePicture');

    res.json(feedPosts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error: Could not retrieve feed.' });
  }
};

export { createPost, getPosts, getPostById, deletePost, likePost, addComment, getUserFeed };
