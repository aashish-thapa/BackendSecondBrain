// controllers/postController.js - Post-related logic
import Post from '../models/Post.js';
import User from '../models/User.js'; // Import User model to update preferences and fetch user data for feed
import { createNotification } from './notificationController.js'; // NEW: Import createNotification
import { v2 as cloudinary } from 'cloudinary';
// @desc    Create a new post
// @route   POST /api/posts
// @access  Private

// NEW: Configure Cloudinary (needs to be done in each file that uses Cloudinary directly)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// NEW: Helper function to extract public ID from Cloudinary URL
const getCloudinaryPublicId = (imageUrl) => {
  if (!imageUrl || !imageUrl.includes('res.cloudinary.com')) {
    return null; // Not a Cloudinary URL
  }
  // Example URL: https://res.cloudinary.com/cloud_name/image/upload/v12345/folder/public_id.png
  // We need to extract 'folder/public_id' part
  const parts = imageUrl.split('/');
  const uploadIndex = parts.indexOf('upload');
  if (uploadIndex === -1 || uploadIndex + 1 >= parts.length) {
    return null; // Invalid Cloudinary URL structure
  }
  // The public_id is usually everything after 'upload/' and version, up to the file extension
  // It includes folder path if any. Remove the file extension for deletion.
  const publicIdWithExt = parts.slice(uploadIndex + 2).join('/'); // Skip 'upload' and 'version'
  return publicIdWithExt.split('.')[0]; // Get public ID without extension
};

const createPost = async(req, res) => {
  // NEW: Debugging logs
  console.log('--- Inside createPost controller ---');
  console.log('req.file (in controller):', req.file);
  console.log('req.body (in controller):', req.body);

  const { content } = req.body;
  // Cloudinary image URL will be available on req.file.path
  // `req.file` will be undefined if no file was uploaded or if Multer failed
  const imageUrl = req.file ? req.file.path : null; // Cloudinary returns the full URL here

  // Also, add a check for content in req.body
  if (!content) {
    return res.status(400).json({ message: 'Post content is required.' });
  }

  try {
    const post = new Post({
      user: req.user._id,
      content,
      image: imageUrl, // Save the Cloudinary URL (will be null if no file or upload failed)
      aiAnalysis: {
        sentiment: 'Unknown',
        emotions: [],
        toxicity: { detected: false, details: {} },
        topics: [],
        summary: '',
        category: 'Uncategorized',
      },
    });

    const createdPost = await post.save();
    res.status(201).json(createdPost); // This should now include the image if imageUrl was set
  } catch (error) {
    console.error('Error in createPost:', error); // Log the specific error
    // Multer/Cloudinary errors are often caught by Multer before reaching here
    // but if any error makes it to the controller, handle it.
    if (error.message) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error during post creation.' });
  }
};

// @desc    Get all posts (global feed)
// @route   GET /api/posts
// @access  Private
const getAllPosts = async(req, res) => {
  try {
    // Populate the user field to get username and profilePicture
    // Also populate comments.user and include aiAnalysis
    const posts = await Post.find({})
      .populate('user', 'username profilePicture')
      .populate('comments.user', 'username profilePicture')
      .sort({ createdAt: -1 }); // Latest posts first
    res.json(posts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// @desc    Get a single post by ID
// @route   GET /api/posts/:id
// @access  Private
const getPostById = async(req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('user', 'username profilePicture')
      .populate('comments.user', 'username profilePicture');

    if (post) {
      res.json(post);
    } else {
      res.status(404).json({ message: 'Post not found.' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// @desc    Delete a post
// @route   DELETE /api/posts/:id
// @access  Private
const deletePost = async(req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (post) {
      // Check if the logged-in user is the owner of the post
      if (post.user.toString() !== req.user._id.toString()) {
        return res.status(401).json({ message: 'Not authorized to delete this post.' });
      }

      // NEW: Delete image from Cloudinary if it exists
      if (post.image) {
        const publicId = getCloudinaryPublicId(post.image);
        if (publicId) {
          try {
            await cloudinary.uploader.destroy(publicId);
            console.log(`Cloudinary image deleted: ${publicId}`);
          } catch (cloudinaryError) {
            console.error(`Failed to delete image ${publicId} from Cloudinary:`, cloudinaryError);
            // Continue with post deletion even if image deletion fails, as post is primary data
          }
        }
      }

      await Post.deleteOne({ _id: req.params.id });
      res.json({ message: 'Post removed.' });
    } else {
      res.status(404).json({ message: 'Post not found.' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// @desc    Toggle like/unlike on a post and update user preferences
// @route   PUT /api/posts/:id/like
// @access  Private
const likePost = async(req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    const user = await User.findById(req.user._id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found.' });
    }
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const userId = req.user._id.toString();
    const isLiked = post.likes.includes(userId);

    if (isLiked) {
      // User is unliking the post
      post.likes = post.likes.filter((like) => like.toString() !== userId);
      // Decrement user preferences (existing logic)
      if (post.aiAnalysis) {
        if (post.aiAnalysis.category && user.userPreferences.likedCategories.has(post.aiAnalysis.category)) {
          const currentCount = user.userPreferences.likedCategories.get(post.aiAnalysis.category) || 0;
          if (currentCount > 0) { user.userPreferences.likedCategories.set(post.aiAnalysis.category, currentCount - 1); } else { user.userPreferences.likedCategories.delete(post.aiAnalysis.category); }
        }
        if (post.aiAnalysis.topics && post.aiAnalysis.topics.length > 0) {
          post.aiAnalysis.topics.forEach(topic => {
            if (user.userPreferences.likedTopics.has(topic)) {
              const currentCount = user.userPreferences.likedTopics.get(topic) || 0;
              if (currentCount > 0) { user.userPreferences.likedTopics.set(topic, currentCount - 1); } else { user.userPreferences.likedTopics.delete(topic); }
            }
          });
        }
      }
      await user.save();
      res.json({ message: 'Post unliked.', post });

    } else {
      // User is liking the post
      post.likes.push(userId);
      // Increment user preferences (existing logic)
      if (post.aiAnalysis) {
        if (post.aiAnalysis.category) {
          const category = post.aiAnalysis.category;
          const currentCount = user.userPreferences.likedCategories.get(category) || 0;
          user.userPreferences.likedCategories.set(category, currentCount + 1);
        }
        if (post.aiAnalysis.topics && post.aiAnalysis.topics.length > 0) {
          post.aiAnalysis.topics.forEach(topic => {
            const currentCount = user.userPreferences.likedTopics.get(topic) || 0;
            user.userPreferences.likedTopics.set(topic, currentCount + 1);
          });
        }
      }
      await user.save();

      // NEW: Create notification for the post owner
      await createNotification({
        recipient: post.user, // The owner of the post
        type: 'like',
        initiator: req.user._id, // The user who liked it
        post: post._id,
        message: `${req.user.username} liked your post: "${post.content.substring(0, 30)}..."`,
      });

      res.json({ message: 'Post liked.', post });
    }

    await post.save();

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// @desc    Add a comment to a post
// @route   POST /api/posts/:id/comment
// @access  Private
const addComment = async(req, res) => {
  const { text } = req.body;
  const { id } = req.params; // Post ID

  if (!text) {
    return res.status(400).json({ message: 'Comment text is required.' });
  }

  try {
    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found.' });
    }

    const comment = {
      user: req.user._id,
      text,
    };

    post.comments.push(comment);
    const newCommentObjectId = post.comments[post.comments.length - 1]._id; // Get ID before saving

    await post.save();

    const updatedPost = await Post.findById(id)
      .populate({
        path: 'comments.user',
        select: 'username profilePicture',
      });

    const newCommentWithUser = updatedPost.comments.find(
      c => c._id.toString() === newCommentObjectId.toString(),
    );

    // NEW: Create notification for the post owner
    await createNotification({
      recipient: post.user, // The owner of the post
      type: 'comment',
      initiator: req.user._id, // The user who commented
      post: post._id,
      message: `${req.user.username} commented on your post: "${text.substring(0, 30)}..."`,
    });

    if (newCommentWithUser) {
      res.status(201).json(newCommentWithUser);
    } else {
      console.warn('Could not find newly added comment after population.');
      res.status(201).json({ message: 'Comment added successfully, but could not retrieve populated comment.', post: updatedPost });
    }

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// @desc    Get personalized user feed (now includes all posts, ranked)
// @route   GET /api/posts/feed
// @access  Private
const getFeedPosts = async(req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const followedUsersIds = user.following.map(id => id.toString());
    const ownUserId = req.user._id.toString();

    // Fetch ALL posts initially. The scoring function will prioritize relevant ones.
    let posts = await Post.find({})
      .populate('user', 'username profilePicture')
      .populate('comments.user', 'username profilePicture');

    // --- Personalization Logic ---
    const userLikedCategories = user.userPreferences.likedCategories;
    const userLikedTopics = user.userPreferences.likedTopics;

    // Convert Maps to array of {name, count} and sort by count to get top interests
    const sortedCategories = Array.from(userLikedCategories.entries())
      .sort(([, countA], [, countB]) => countB - countA)
      .map(([name]) => name);
    const sortedTopics = Array.from(userLikedTopics.entries())
      .sort(([, countA], [, countB]) => countB - countA)
      .map(([name]) => name);

    // Define a scoring function for posts
    const scorePost = (post) => {
      let score = 0;

      // Give a significant base score for posts from followed users or own posts
      if (followedUsersIds.includes(post.user._id.toString()) || post.user._id.toString() === ownUserId) {
        score += 100; // High base relevance for network content
      }

      // Add score based on category match from AI analysis
      if (post.aiAnalysis && post.aiAnalysis.category && userLikedCategories.has(post.aiAnalysis.category)) {
        score += userLikedCategories.get(post.aiAnalysis.category) * 10; // Strong impact of liked categories
      }

      // Add score based on topic match from AI analysis
      if (post.aiAnalysis && post.aiAnalysis.topics && post.aiAnalysis.topics.length > 0) {
        post.aiAnalysis.topics.forEach(topic => {
          if (userLikedTopics.has(topic)) {
            score += userLikedTopics.get(topic) * 5; // Moderate impact of liked topics
          }
        });
      }

      // Add a small score for recent posts (decaying over time)
      const now = Date.now();
      const postAgeMs = now - new Date(post.createdAt).getTime();
      const oneDayMs = 24 * 60 * 60 * 1000;
      // Max 5 points for very recent posts, decaying to 0 over 5 days
      score += Math.max(0, 5 - (postAgeMs / (oneDayMs * 5)));

      // Penalize toxic posts (optional, adjust score as needed for your platform's moderation)
      if (post.aiAnalysis && post.aiAnalysis.toxicity && post.aiAnalysis.toxicity.detected) {
        score -= 50; // Significant penalty for toxic posts
      }

      return score;
    };

    // Score all fetched posts
    const scoredPosts = posts.map(post => ({
      ...post.toObject(), // Convert Mongoose document to plain JS object for manipulation
      relevanceScore: scorePost(post),
    }));

    // Sort posts by relevance score (highest first), then by creation date (newest first for ties)
    scoredPosts.sort((a, b) => {
      if (b.relevanceScore !== a.relevanceScore) {
        return b.relevanceScore - a.relevanceScore;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    res.json(scoredPosts);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// @desc    Get global trending topics
// @route   GET /api/posts/trending-topics
// @access  Private
const getTrendingTopics = async(req, res) => {
  try {
    // Define a time window for "trending" (e.g., last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const limit = parseInt(req.query.limit) || 10; // Default to 10 trending topics

    const trendingTopics = await Post.aggregate([
      // Stage 1: Filter posts by creation date (optional, for recency)
      {
        $match: {
          'aiAnalysis.topics': { $exists: true, $ne: [] }, // Ensure posts have topics
          createdAt: { $gte: sevenDaysAgo }, // Only consider posts from the last 7 days
        },
      },
      // Stage 2: Deconstruct the topics array into individual documents
      {
        $unwind: '$aiAnalysis.topics',
      },
      // Stage 3: Group by topic and count occurrences
      {
        $group: {
          _id: '$aiAnalysis.topics', // Group by the topic name
          count: { $sum: 1 },         // Count occurrences
        },
      },
      // Stage 4: Sort by count in descending order
      {
        $sort: { count: -1 },
      },
      // Stage 5: Limit to the top N topics
      {
        $limit: limit,
      },
      // Stage 6: Reshape the output documents
      {
        $project: {
          _id: 0, // Exclude the default _id
          topic: '$_id', // Rename _id to topic
          count: 1, // Include the count
        },
      },
    ]);

    res.json(trendingTopics);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching trending topics.' });
  }
};

// @desc    Get posts related to a specific topic
// @route   GET /api/posts/by-topic?topic=<query>
// @access  Private
const getPostsByTopic = async(req, res) => {
  const { topic } = req.query; // Get topic query from URL (e.g., ?topic=Technology)

  if (!topic) {
    return res.status(400).json({ message: 'Topic query parameter is required.' });
  }

  try {
    // Find posts where the aiAnalysis.topics array contains the specified topic
    // Use $regex with 'i' option for case-insensitive matching
    const posts = await Post.find({
      'aiAnalysis.topics': { $regex: topic, $options: 'i' },
    })
      .populate('user', 'username profilePicture')
      .populate('comments.user', 'username profilePicture')
      .sort({ createdAt: -1 }); // Sort by newest first, can be changed to rank by relevance if desired

    res.json(posts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching posts by topic.' });
  }
};

export {
  createPost,
  getAllPosts,
  getPostById,
  deletePost,
  likePost,
  addComment,
  getFeedPosts,
  getTrendingTopics,
  getPostsByTopic,
};
