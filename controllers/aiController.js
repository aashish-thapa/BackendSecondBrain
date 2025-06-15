import dotenv from 'dotenv';
import Post from '../models/Post.js';

dotenv.config();

const HF_API_TOKEN = process.env.HF_API_TOKEN;
const HF_SENTIMENT_MODEL = process.env.HF_SENTIMENT_MODEL || 'cardiffnlp/twitter-roberta-base-sentiment';
const HF_EMOTION_MODEL = process.env.HF_EMOTION_MODEL || 'j-hartmann/emotion-english-distilroberta-base';
const HF_TOXICITY_MODEL = process.env.HF_TOXICITY_MODEL || 'cardiffnlp/twitter-roberta-base-offensive';

const HF_INFERENCE_API_BASE_URL = 'https://api-inference.huggingface.co/models/';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

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
      inputs: inputs,
      options: {
        wait_for_model: true,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Hugging Face API Error for ${modelId}:`, response.status, errorText);
    throw new Error(`HF API error (${response.status}): ${errorText}`);
  }

  return response.json();
};

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

  if (finalLabel === 'LABEL_0') {
    predictedLabel = 'Negative';
  } else if (finalLabel === 'LABEL_1') {
    predictedLabel = 'Neutral';
  } else if (finalLabel === 'LABEL_2') {
    predictedLabel = 'Positive';
  }

  return predictedLabel;
};

const getEmotionLabels = (scores, threshold = 0.4) => {
  return scores.filter(emotion => emotion.score >= threshold).map(emotion => ({
    emotion: emotion.label.toLowerCase(),
    score: parseFloat(emotion.score.toFixed(2)),
  }));
};

const getToxicityScores = (scores, threshold = 0.5) => {
  const toxicLabels = {};
  let isToxic = false;

  const categories = scores[0] || scores;

  if (!Array.isArray(categories)) {
    console.warn('Toxicity model returned unexpected format for categories:', scores);
    return { detected: false, details: { error: 'Unexpected response format for categories' } };
  }

  for (const item of categories) {
    if (item.score >= threshold) {
      const cleanLabel = item.label.toLowerCase().replace(/_/g, ' ');
      toxicLabels[cleanLabel] = parseFloat(item.score.toFixed(2));

      if (cleanLabel === 'offensive') {
        isToxic = true;
      }
    }
  }
  return { detected: isToxic, details: toxicLabels };
};

// @desc    Analyze post content using multiple AI models
// @route   POST /api/ai/analyze/:postId
// @access  Private
const analyzePost = async(req, res) => {
  const { postId } = req.params;

  if (!HF_API_TOKEN) {
    return res.status(500).json({ message: 'AI service not configured: Hugging Face API token missing.' });
  }
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ message: 'AI service not configured: Gemini API key missing.' });
  }

  try {
    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ message: 'Post not found.' });
    }

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

        Provide the output in JSON format like this:
        {
          "topics": ["topic1", "topic2", "topic3"],
          "summary": "Concise summary of the post.",
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
                'topics': {
                  'type': 'ARRAY',
                  'items': { 'type': 'STRING' },
                },
                'summary': { 'type': 'STRING' },
                'category': { 'type': 'STRING', 'enum': geminiCategories.concat('Other') },
              },
              'required': ['topics', 'summary', 'category'],
            },
          },
        };

        const geminiResponse = await fetch(GEMINI_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(geminiPayload),
        });

        if (!geminiResponse.ok) {
          const geminiErrorText = await geminiResponse.text();
          console.error('Gemini API Error (Topics/Summary/Category):', geminiResponse.status, geminiErrorText);
          throw new Error(`Gemini API error (${geminiResponse.status}): ${geminiErrorText}`);
        } else {
          const geminiResult = await geminiResponse.json();
          if (geminiResult.candidates && geminiResult.candidates.length > 0 &&
              geminiResult.candidates[0].content && geminiResult.candidates[0].content.parts &&
              geminiResult.candidates[0].content.parts.length > 0) {
            try {
              const jsonString = geminiResult.candidates[0].content.parts[0].text;
              return JSON.parse(jsonString);
            } catch (parseError) {
              console.error('Failed to parse Gemini JSON response:', parseError);
              throw new Error('Error parsing Gemini JSON response.');
            }
          } else {
            throw new Error('No valid Gemini response found.');
          }
        }
      })(),
    ]);

    if (sentimentPromise.status === 'fulfilled') {
      console.log('Raw HF Sentiment Output:', JSON.stringify(sentimentPromise.value));
      if (Array.isArray(sentimentPromise.value) && Array.isArray(sentimentPromise.value[0])) {
        sentiment = getSentimentLabel(sentimentPromise.value[0]);
      } else {
        console.warn('Unexpected sentiment output format. Using \'Unknown\'.', sentimentPromise.value);
        sentiment = 'Unknown';
      }
    } else {
      console.error('Sentiment Analysis failed:', sentimentPromise.reason);
      sentiment = 'Error';
    }

    if (emotionPromise.status === 'fulfilled') {
      console.log('Raw HF Emotion Output:', JSON.stringify(emotionPromise.value));
      if (Array.isArray(emotionPromise.value) && Array.isArray(emotionPromise.value[0])) {
        emotions = getEmotionLabels(emotionPromise.value[0]);
      } else {
        console.warn('Unexpected emotion output format. Using empty array.', emotionPromise.value);
        emotions = [];
      }
    } else {
      console.error('Emotion Detection failed:', emotionPromise.reason);
      emotions = [{ emotion: 'Error', score: 'N/A' }];
    }

    if (toxicityPromise.status === 'fulfilled') {
      console.log('Raw HF Toxicity Output:', JSON.stringify(toxicityPromise.value));
      toxicity = getToxicityScores(toxicityPromise.value);
    } else {
      console.error('Toxicity detection failed:', toxicityPromise.reason);
      toxicity = { detected: false, details: { error: 'N/A' } };
    }

    if (geminiPromise.status === 'fulfilled') {
      topics = geminiPromise.value.topics || [];
      summary = geminiPromise.value.summary || 'AI summary unavailable.';
      category = geminiPromise.value.category || 'Uncategorized';
    } else {
      console.error('Gemini analysis failed:', geminiPromise.reason);
      topics = ['AI Error'];
      summary = 'AI summary unavailable.';
      category = 'Error';
    }

    if (toxicity.detected) {
      sentiment = 'Mixed';
    }

    const aiAnalysis = {
      sentiment: sentiment,
      emotions: emotions,
      toxicity: toxicity,
      topics: topics,
      summary: summary,
      category: category,
    };

    res.json({
      postId: post._id,
      content: post.content,
      aiAnalysis: aiAnalysis,
    });

  } catch (error) {
    console.error('Server error during overall AI analysis:', error);
    res.status(500).json({ message: 'Server error during overall AI analysis.' });
  }
};

export { analyzePost };
