import mongoose from 'mongoose';

const commentSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

// Define the schema for AI Analysis results
const aiAnalysisSchema = mongoose.Schema(
  {
    sentiment: {
      type: String,
      enum: ['Positive', 'Negative', 'Neutral', 'Mixed', 'Unknown', 'Error'], // Expanded possible values
      default: 'Unknown',
    },
    emotions: [
      {
        emotion: { type: String },
        score: { type: Number },
      },
    ],
    toxicity: {
      detected: { type: Boolean, default: false },
      details: { type: mongoose.Schema.Types.Mixed }, // Store toxicity details as a flexible object
    },
    topics: [{ type: String }],
    summary: { type: String },
    category: { type: String },
  },
  {
    _id: false, // Do not create an _id for this subdocument
  },
);

const postSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    image: {
      type: String,
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    comments: [commentSchema],
    aiAnalysis: aiAnalysisSchema,
  },
  {
    timestamps: true,
  },
);

const Post = mongoose.model('Post', postSchema);

export default Post;
