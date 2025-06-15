// controllers/postController.js
import Post from '../models/Post.js';
import User from '../models/User.js';

// Create a new post
const createPost = async(req, res) => {
  const { content, image } = req.body;

  if (!content) {
    return res.status(400).json({ message: 'Post content is required.' });
  }

  try {
    const post = new Post({
      user: req.user._id,
      content,
      image,
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
    res.status(201).json(createdPost);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// Get all posts (global feed)
const getAllPosts = async(req, res) => {
  try {
    const posts = await Post.find({})
      .populate('user', 'username profilePicture')
      .populate('comments.user', 'username profilePicture')
      .sort({ createdAt: -1 });
    res.json(posts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// Get a single post by ID
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

// Delete a post
const deletePost = async(req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (post) {
      if (post.user.toString() !== req.user._id.toString()) {
        return res.status(401).json({ message: 'Not authorized to delete this post.' });
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

// Like or unlike a post and update user preferences
const likePost = async(req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    const user = await User.findById(req.user._id);

    if (!post || !user) {
      return res.status(404).json({ message: 'Post or user not found.' });
    }

    const userId = req.user._id.toString();
    const isLiked = post.likes.includes(userId);

    if (isLiked) {
      post.likes = post.likes.filter((like) => like.toString() !== userId);

      if (post.aiAnalysis) {
        if (post.aiAnalysis.category && user.userPreferences.likedCategories.has(post.aiAnalysis.category)) {
          const count = user.userPreferences.likedCategories.get(post.aiAnalysis.category) || 0;
          count > 0
            ? user.userPreferences.likedCategories.set(post.aiAnalysis.category, count - 1)
            : user.userPreferences.likedCategories.delete(post.aiAnalysis.category);
        }

        post.aiAnalysis.topics?.forEach(topic => {
          if (user.userPreferences.likedTopics.has(topic)) {
            const count = user.userPreferences.likedTopics.get(topic) || 0;
            count > 0
              ? user.userPreferences.likedTopics.set(topic, count - 1)
              : user.userPreferences.likedTopics.delete(topic);
          }
        });
      }

      await user.save();
      res.json({ message: 'Post unliked.', post });

    } else {
      post.likes.push(userId);

      if (post.aiAnalysis) {
        const { category, topics } = post.aiAnalysis;

        if (category) {
          const count = user.userPreferences.likedCategories.get(category) || 0;
          user.userPreferences.likedCategories.set(category, count + 1);
        }

        topics?.forEach(topic => {
          const count = user.userPreferences.likedTopics.get(topic) || 0;
          user.userPreferences.likedTopics.set(topic, count + 1);
        });
      }

      await user.save();
      res.json({ message: 'Post liked.', post });
    }

    await post.save();

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// Add a comment to a post
const addComment = async(req, res) => {
  const { text } = req.body;
  const { id } = req.params;

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
    await post.save();

    const newComment = post.comments[post.comments.length - 1];
    const populatedComment = await newComment.populate('user', 'username profilePicture');

    res.status(201).json(populatedComment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// Get personalized user feed
const getFeedPosts = async(req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const followedUsersIds = user.following.map(id => id.toString());
    const ownUserId = req.user._id.toString();

    let posts = await Post.find({
      $or: [
        { user: { $in: followedUsersIds } },
        { user: ownUserId },
      ],
    })
      .populate('user', 'username profilePicture')
      .populate('comments.user', 'username profilePicture');

    const userLikedCategories = user.userPreferences.likedCategories;
    const userLikedTopics = user.userPreferences.likedTopics;

    const sortedCategories = Array.from(userLikedCategories.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([name]) => name);

    const sortedTopics = Array.from(userLikedTopics.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([name]) => name);

    const scorePost = (post) => {
      let score = 0;

      if (followedUsersIds.includes(post.user._id.toString()) || post.user._id.toString() === ownUserId) {
        score += 10;
      }

      if (post.aiAnalysis?.category && userLikedCategories.has(post.aiAnalysis.category)) {
        score += userLikedCategories.get(post.aiAnalysis.category) * 2;
      }

      post.aiAnalysis?.topics?.forEach(topic => {
        if (userLikedTopics.has(topic)) {
          score += userLikedTopics.get(topic);
        }
      });

      const now = Date.now();
      const age = now - new Date(post.createdAt).getTime();
      const dayMs = 86400000;
      score += Math.max(0, 5 - (age / (dayMs * 5)));

      if (post.aiAnalysis?.toxicity?.detected) {
        score -= 5;
      }

      return score;
    };

    const scoredPosts = posts.map(post => ({
      ...post.toObject(),
      relevanceScore: scorePost(post),
    }));

    scoredPosts.sort((a, b) => {
      if (b.relevanceScore !== a.relevanceScore) {
        return b.relevanceScore - a.relevanceScore;
      }
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    res.json(scoredPosts);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error.' });
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
};
