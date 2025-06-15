// controllers/aiController.js - AI processing for posts using Hugging Face and Gemini

import dotenv from 'dotenv';
import Post from '../models/Post.js';

dotenv.config();

// Hugging Face Configuration
const HF_API_TOKEN = process.env.HF_API_TOKEN;
const HF_SENTIMENT_MODEL = process.env.HF_SENTIMENT_MODEL || 'cardiffnlp/twitter-roberta-base-sentiment';
const HF_EMOTION_MODEL = process.env.HF_EMOTION_MODEL || 'j-hartmann/emotion-english-distilroberta-base';
const HF_TOXICITY_MODEL = process.env.HF_TOXICITY_MODEL || 'cardiffnlp/twitter-roberta-base-offensive';
const HF_INFERENCE_API_BASE_URL = 'https://api-inference.huggingface.co/models/';

// Gemini Configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

// Call Hugging Face Inference API
const callHuggingFaceAPI = async(modelId, inputs) => {
  if (!HF_API_TOKEN) {
    console.error(`Hugging Face API token is missing for model: ${modelId}`);
    throw new Error('Hugging Face API token missing.');
  }

  const response = await fetch(`${HF_INFERENCE_API_BASE_URL}${modelId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${HF_API_TOKEN}`,
    },
    body: JSON.stringify({
      inputs,
      options: { wait_for_model: true },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Hugging Face API Error for ${modelId}:`, response.status, errorText);
    throw new Error(`HF API error (${response.status}): ${errorText}`);
  }

  return response.json();
};

// Extract sentiment label from model scores
const getSentimentLabel = (scores) => {
  let predictedLabel = 'Unknown';
  let maxScore = -1;
  let finalLabel = '';

  for (const item of scores) {
    if (item.score > maxScore) {
      maxScore = item.score;
      finalLabel = item.label;
    }
  }

  if (finalLabel === 'LABEL_0') predictedLabel = 'Negative';
  else if (finalLabel === 'LABEL_1') predictedLabel = 'Neutral';
  else if (finalLabel === 'LABEL_2') predictedLabel = 'Positive';

  return predictedLabel;
};

// Extract high-confidence emotions
const getEmotionLabels = (scores, threshold = 0.4) => {
  return scores.filter(emotion => emotion.score >= threshold).map(emotion => ({
    emotion: emotion.label.toLowerCase(),
    score: parseFloat(emotion.score.toFixed(2)),
  }));
};

// Detect toxicity categories
const getToxicityScores = (scores, threshold = 0.5) => {
  const toxicLabels = {};
  let isToxic = false;

  const categories = scores[0] || scores;

  if (!Array.isArray(categories)) {
    console.warn('Toxicity model returned unexpected format:', scores);
    return { detected: false, details: { error: 'Unexpected response format' } };
  }

  for (const item of categories) {
    if (item.score >= threshold) {
      const cleanLabel = item.label.toLowerCase().replace(/_/g, ' ');
      toxicLabels[cleanLabel] = parseFloat(item.score.toFixed(2));
      if (cleanLabel === 'offensive') isToxic = true;
    }
  }

  return { detected: isToxic, details: toxicLabels };
};

// Analyze post using AI models
const analyzePost = async(req, res) => {
  const { postId } = req.params;

  if (!HF_API_TOKEN) {
    return res.status(500).json({ message: 'Hugging Face API token missing.' });
  }
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ message: 'Gemini API key missing.' });
  }

  try {
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Post not found.' });

    const postContent = post.content;
    let sentiment = 'Unknown';
    let emotions = [];
    let toxicity = { detected: false, details: {} };
    let topics = [];
    let summary = '';
    let category = 'Uncategorized';

    const [
      sentimentPromise,
      emotionPromise,
      toxicityPromise,
      geminiPromise,
    ] = await Promise.allSettled([
      callHuggingFaceAPI(HF_SENTIMENT_MODEL, postContent),
      callHuggingFaceAPI(HF_EMOTION_MODEL, postContent),
      callHuggingFaceAPI(HF_TOXICITY_MODEL, postContent),
      (async() => {
        const geminiCategories = ['News', 'Sports', 'Technology', 'Entertainment', 'Politics', 'Art', 'Science', 'Education', 'Lifestyle', 'Travel', 'Food', 'Health', 'Personal Update', 'Opinion', 'Humor', 'Other'];
        const geminiPrompt = `Analyze the following social media post.
        1. Extract 3-5 distinct, key topics/keywords mentioned in the post.
        2. Provide a concise summary of the post (max 50 words).
        3. Classify the post into ONE of the following categories: ${geminiCategories.join(', ')}. If none fit well, use "Other".

        Provide the output in JSON format:
        {
          "topics": ["topic1", "topic2", "topic3"],
          "summary": "Concise summary.",
          "category": "CategoryName"
        }

        Post: "${postContent}"`;

        const geminiPayload = {
          contents: [{ role: 'user', parts: [{ text: geminiPrompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'OBJECT',
              properties: {
                'topics': { type: 'ARRAY', items: { type: 'STRING' } },
                'summary': { type: 'STRING' },
                'category': { type: 'STRING', enum: geminiCategories.concat('Other') },
              },
              required: ['topics', 'summary', 'category'],
            },
          },
        };

        const geminiResponse = await fetch(GEMINI_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(geminiPayload),
        });

        if (!geminiResponse.ok) {
          const geminiErrorText = await geminiResponse.text();
          console.error('Gemini API Error:', geminiResponse.status, geminiErrorText);
          throw new Error(`Gemini API error (${geminiResponse.status}): ${geminiErrorText}`);
        }

        const geminiResult = await geminiResponse.json();
        if (geminiResult.candidates?.[0]?.content?.parts?.[0]?.text) {
          return JSON.parse(geminiResult.candidates[0].content.parts[0].text);
        } else {
          throw new Error('No valid Gemini response.');
        }
      })(),
    ]);

    // Handle model outputs
    if (sentimentPromise.status === 'fulfilled') {
      if (Array.isArray(sentimentPromise.value?.[0])) {
        sentiment = getSentimentLabel(sentimentPromise.value[0]);
      } else {
        sentiment = 'Unknown';
      }
    } else {
      sentiment = 'Error';
    }

    if (emotionPromise.status === 'fulfilled') {
      if (Array.isArray(emotionPromise.value?.[0])) {
        emotions = getEmotionLabels(emotionPromise.value[0]);
      } else {
        emotions = [];
      }
    } else {
      emotions = [{ emotion: 'Error', score: 'N/A' }];
    }

    if (toxicityPromise.status === 'fulfilled') {
      toxicity = getToxicityScores(toxicityPromise.value);
    } else {
      toxicity = { detected: false, details: { error: 'N/A' } };
    }

    if (geminiPromise.status === 'fulfilled') {
      topics = geminiPromise.value.topics || [];
      summary = geminiPromise.value.summary || 'AI summary unavailable.';
      category = geminiPromise.value.category || 'Uncategorized';
    } else {
      topics = ['AI Error'];
      summary = 'AI summary unavailable.';
      category = 'Error';
    }

    if (toxicity.detected) {
      sentiment = 'Mixed';
    }

    const aiAnalysis = {
      sentiment,
      emotions,
      toxicity,
      topics,
      summary,
      category,
    };

    post.aiAnalysis = aiAnalysis;
    await post.save();

    res.json({
      postId: post._id,
      content: post.content,
      aiAnalysis,
      message: 'Post analyzed successfully.',
    });

  } catch (error) {
    console.error('AI analysis error:', error);
    res.status(500).json({ message: 'Server error during AI analysis.' });
  }
};

export { analyzePost };
