import dotenv from 'dotenv';
import Post from '../models/Post.js';

dotenv.config();

// Hugging Face Configuration for Sentiment Analysis
const HF_API_TOKEN = process.env.HF_API_TOKEN;
const HF_SENTIMENT_MODEL = process.env.HF_SENTIMENT_MODEL || 'cardiffnlp/twitter-roberta-base-sentiment'; // Confirmed model
const HF_INFERENCE_API_URL = `https://api-inference.huggingface.co/models/${HF_SENTIMENT_MODEL}`;

// Gemini AI Configuration for Topics and Summarization
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

// Function to map Hugging Face sentiment scores to custom sentiment labels
const getSentimentLabel = (scores) => {
  // Hugging Face sentiment models like cardiffnlp/twitter-roberta-base-sentiment
  // typically return an array of objects with labels like LABEL_0, LABEL_1, LABEL_2
  // LABEL_0: Negative, LABEL_1: Neutral, LABEL_2: Positive
  let predictedLabel = 'Unknown'; // Default if no clear prediction

  let maxScore = -1;
  let finalLabel = '';

  // Find the label with the highest score
  for (const item of scores) {
    if (item.score > maxScore) {
      maxScore = item.score;
      finalLabel = item.label;
    }
  }

  // Map the Hugging Face labels to our custom labels
  if (finalLabel === 'LABEL_0') {
    predictedLabel = 'Negative';
  } else if (finalLabel === 'LABEL_1') {
    predictedLabel = 'Neutral';
  } else if (finalLabel === 'LABEL_2') {
    predictedLabel = 'Positive';
  }
  //TODO
  // Optional: Add a threshold check if maxScore is very low (e.g., < 0.5),
  // implying the model is not confident, and you might want to call it 'Mixed' or 'Unclear'.
  // For this model, scores are generally high for the predicted label.

  return predictedLabel;
};

// @desc    Analyze post content using Hugging Face (Sentiment) and Gemini (Topics/Summary)
// @route   POST /api/ai/analyze/:postId
// @access  Private (requires authentication)
const analyzePost = async(req, res) => {
  const { postId } = req.params;

  // Initial checks for API keys
  if (!HF_API_TOKEN) {
    console.error('Hugging Face API token is not set in environment variables.');
    return res.status(500).json({ message: 'AI service not configured: Hugging Face API token missing.' });
  }
  if (!GEMINI_API_KEY) {
    console.error('Gemini API key is not set in environment variables.');
    return res.status(500).json({ message: 'AI service not configured: Gemini API key missing.' });
  }

  try {
    // 1. Fetch the post from the database
    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ message: 'Post not found.' });
    }

    const postContent = post.content;

    // --- Part 1: Call Hugging Face for Sentiment Analysis ---
    let sentimentResult = { sentiment: 'Unknown' };
    try {
      const hfPayload = {
        inputs: postContent,
        options: {
          wait_for_model: true,
        },
      };

      const hfResponse = await fetch(HF_INFERENCE_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${HF_API_TOKEN}`,
        },
        body: JSON.stringify(hfPayload),
      });

      if (!hfResponse.ok) {
        const hfErrorText = await hfResponse.text();
        console.error('Hugging Face API Error (Sentiment):', hfResponse.status, hfErrorText);
        sentimentResult = { sentiment: 'Error - HF', details: hfErrorText };
      } else {
        const hfData = await hfResponse.json();
        const sentimentScores = hfData[0];
        if (sentimentScores && Array.isArray(sentimentScores)) {
          sentimentResult = { sentiment: getSentimentLabel(sentimentScores) };
        } else {
          sentimentResult = { sentiment: 'Error - HF Format', details: hfData };
        }
      }
    } catch (hfError) {
      console.error('Hugging Face API call failed (Sentiment):', hfError);
      sentimentResult = { sentiment: 'Error - HF Call', details: hfError.message };
    }

    // --- Part 2: Call Gemini AI for Topics and Summarization ---
    let topics = [];
    let summary = '';

    try {
      const geminiPrompt = `Analyze the following social media post.
      1. Extract 3-5 distinct, key topics/keywords mentioned in the post.
      2. Provide a concise summary of the post (max 50 words).

      Provide the output in JSON format like this:
      {
        "topics": ["topic1", "topic2", "topic3"],
        "summary": "Concise summary of the post."
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
            },
            'required': ['topics', 'summary'],
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
        console.error('Gemini API Error (Topics/Summary):', geminiResponse.status, geminiErrorText);
        topics = ['Error getting topics'];
        summary = 'Error summarizing post.';
      } else {
        const geminiResult = await geminiResponse.json();
        if (geminiResult.candidates && geminiResult.candidates.length > 0 &&
            geminiResult.candidates[0].content && geminiResult.candidates[0].content.parts &&
            geminiResult.candidates[0].content.parts.length > 0) {
          try {
            const jsonString = geminiResult.candidates[0].content.parts[0].text;
            const parsedGemini = JSON.parse(jsonString);
            topics = parsedGemini.topics || [];
            summary = parsedGemini.summary || 'Could not generate summary.';
          } catch (parseError) {
            console.error('Failed to parse Gemini JSON response:', parseError);
            topics = ['Parsing Error'];
            summary = 'Error parsing AI summary.';
          }
        } else {
          topics = ['No Gemini Response'];
          summary = 'No summary from AI.';
        }
      }
    } catch (geminiError) {
      console.error('Gemini API call failed (Topics/Summary):', geminiError);
      topics = ['API Call Failed'];
      summary = 'Gemini API call failed.';
    }

    // 3. Combine results and respond
    const aiAnalysis = {
      sentiment: sentimentResult.sentiment,
      topics: topics,
      summary: summary,
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
