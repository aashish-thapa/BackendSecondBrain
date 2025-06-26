// controllers/botController.js - Logic for server-side bot actions and automated news posting (Using Newsdata.io /latest endpoint)
import Post from '../models/Post.js';
import User from '../models/User.js';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import { performAIAnalysisOnPost } from './aiController.js';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const NEWSDATA_API_KEY = process.env.NEWSDATA_API_KEY;
const NEWSDATA_API_BASE_URL = 'https://newsdata.io/api/1/latest';
const ZENQUOTES_API_BASE_URL = 'https://zenquotes.io/api/quotes';

/**
 * Configuration for different bot users.
 * - query: Main search keyword for Newsdata.io.
 * - category: Newsdata.io category (e.g., 'sports', 'technology', 'entertainment').
 * - language: Language of articles (e.g., 'en').
 * - country: Specific country code (e.g., 'us', 'in').
 * - timezone: Timezone for 'pubDateTZ' parameter (e.g., 'America/Chicago').
 * - titlePrefix: A prefix for the post title.
 * - postLimit: The number of articles/quotes this bot will attempt to post per run (Newsdata.io free tier max size is 10).
 * - type: 'news' for Newsdata.io, 'quote' for ZenQuotes.io.
 */
const botConfigurations = [
  {
    username: 'BreakingNewsBot',
    query: 'top',
    category: 'top',
    language: 'en',
    country: null,
    timezone: null,
    titlePrefix: '🚨 BREAKING NEWS:',
    postLimit: 3, // Fetch and post up to 3 articles per run
    type: 'news',
  },
  {
    username: 'ExploreSports',
    query: null,
    category: 'sports',
    language: 'en',
    country: 'us',
    timezone: 'America/New_York',
    titlePrefix: '⚽ Sports Update:',
    postLimit: 3, // Fetch and post up to 3 articles per run
    type: 'news',
  },
  {
    username: 'TechTrendsBot',
    query: null,
    category: 'technology',
    language: 'en',
    country: 'us',
    timezone: 'America/Los_Angeles',
    titlePrefix: '💻 Tech Trends:',
    postLimit: 3, // Fetch and post up to 3 articles per run
    type: 'news',
  },
  {
    username: 'WeatherAlerts',
    query: 'weather OR forecast',
    category: null,
    language: 'en',
    country: 'us',
    timezone: 'America/Chicago',
    titlePrefix: '☁️ Weather Alert:',
    postLimit: 3, // Fetch and post up to 3 articles per run
    fallbackContent: 'No specific weather news right now, but always check your local forecast! Stay safe out there.',
    type: 'news',
  },
  {
    username: 'Entertainment', // NEW: Entertainment Bot
    query: null,
    category: 'entertainment',
    language: 'en',
    country: 'us',
    timezone: 'America/New_York',
    titlePrefix: '🎬 Entertainment Buzz:',
    postLimit: 3, // Fetch and post up to 3 articles per run
    type: 'news',
  },
  {
    username: 'Motivation',
    query: null,
    category: null,
    language: null,
    country: null,
    timezone: null,
    titlePrefix: '✨ Daily Motivation:',
    postLimit: 1, // Keep as 1 for quotes
    type: 'quote',
  },
];

const fetchNews = async({ query, category, language = 'en', country = null, timezone = null, pageSize = 5 }) => {
  if (!NEWSDATA_API_KEY) {
    console.error('ERROR: NEWSDATA_API_KEY is not set in .env. Cannot fetch news from Newsdata.io.');
    return [];
  }

  const url = new URL(NEWSDATA_API_BASE_URL);
  url.searchParams.append('apikey', NEWSDATA_API_KEY);
  url.searchParams.append('language', language);
  url.searchParams.append('size', pageSize); // Newsdata.io uses 'size' instead of 'pageSize'

  if (query) {
    url.searchParams.append('q', query);
  }
  if (category) {
    url.searchParams.append('category', category);
  }
  if (country) {
    url.searchParams.append('country', country);
  }
  if (timezone) {
    url.searchParams.append('timezone', timezone);
  }

  try {
    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.status === 'success') {
      return data.results;
    } else {
      console.error(`Newsdata.io API error for query "${query || category || 'latest'}" (status: ${data.status}):`, data.message);
      return [];
    }
  } catch (error) {
    console.error(`Error fetching news from Newsdata.io for query "${query || category || 'latest'}":`, error);
    return [];
  }
};

const fetchQuote = async() => {
  try {
    const response = await fetch(ZENQUOTES_API_BASE_URL);
    const data = await response.json();
    if (Array.isArray(data) && data.length > 0) {
      return data[Math.floor(Math.random() * data.length)];
    }
    console.warn('No quotes received from ZenQuotes.io or unexpected format.');
    return null;
  } catch (error) {
    console.error('Error fetching quote from ZenQuotes.io:', error);
    return null;
  }
};

const createBotPost = async(userId, content, imageUrl = null) => {
  try {
    if (!content || content.trim().length < 10) {
      console.warn(`Attempted to create empty or too short bot post for user ${userId}. Skipping.`);
      return null;
    }

    const post = new Post({
      user: userId,
      content: content,
      image: imageUrl,
      aiAnalysis: {
        sentiment: 'Unknown',
        emotions: [],
        toxicity: { detected: false, details: {} },
        topics: [],
        summary: '',
        category: 'Uncategorized',
        factCheck: 'Unknown',
      },
    });

    const createdPost = await post.save();
    console.log(`Bot post created by ${userId}: ${createdPost._id}. Content preview: "${content.substring(0, Math.min(content.length, 50))}..."`);
    return createdPost;
  } catch (error) {
    console.error(`ERROR: Failed to create bot post for user ${userId}:`, error);
    return null;
  }
};

// Removed the 'delay' function as per user request to post frequently
// const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const fetchNewsAndPost = async() => {
  console.log('\n--- Running fetchNewsAndPost cron job (Newsdata.io /latest & ZenQuotes.io) ---');

  const bots = await User.find({ isBot: true });

  if (bots.length === 0) {
    console.log('No bot users found in the database. Please ensure you have created users with isBot: true.');
    return;
  }

  for (const botConfig of botConfigurations) {
    const botUser = bots.find(b => b.username === botConfig.username);

    if (!botUser) {
      console.warn(`WARNING: Bot user "${botConfig.username}" not found in database. Skipping.`);
      continue;
    }

    // Removed random delay here to allow frequent posting
    // console.log(`Delaying processing for ${botConfig.username} by ${Math.round(randomDelayMs / 1000)} seconds.`);
    // await delay(randomDelayMs);

    console.log(`Processing content for bot: ${botConfig.username} (Type: ${botConfig.type})`);
    let postContent = '';
    let imageUrl = null;

    if (botConfig.type === 'news') {
      let articles = await fetchNews({
        query: botConfig.query,
        category: botConfig.category,
        language: botConfig.language,
        country: botConfig.country,
        timezone: botConfig.timezone,
        pageSize: botConfig.postLimit,
      });

      articles = articles.filter(a => a.title && a.description && a.link).slice(0, botConfig.postLimit);

      if (articles.length > 0) {
        for (const article of articles) {
          postContent = `**${botConfig.titlePrefix}** ${article.title}\n\n` +
                              `${article.description || 'No description available.'}\n\n` +
                              `Read more: ${article.link}`;
          imageUrl = article.image_url || null;
          const newBotPost = await createBotPost(botUser._id, postContent, imageUrl);
          if (newBotPost) {
            await performAIAnalysisOnPost(newBotPost._id);
          }
        }
      } else if (botConfig.fallbackContent) {
        console.log(`No suitable news articles found for ${botConfig.username}. Using fallback content.`);
        const newBotPost = await createBotPost(botUser._id, botConfig.fallbackContent, botConfig.defaultImageUrl || null);
        if (newBotPost) {
          await performAIAnalysisOnPost(newBotPost._id);
        }
      } else {
        console.log(`No suitable news articles or fallback content found for ${botConfig.username}. Skipping post for this run.`);
      }
    } else if (botConfig.type === 'quote') {
      const quote = await fetchQuote();
      if (quote && quote.q && quote.a) {
        postContent = `**${botConfig.titlePrefix}** "${quote.q}"\n\n` +
                      `— ${quote.a}`;
        imageUrl = null;
        const newBotPost = await createBotPost(botUser._id, postContent, imageUrl);
        if (newBotPost) {
          await performAIAnalysisOnPost(newBotPost._id);
        }
      } else {
        console.log(`Failed to fetch a quote for ${botConfig.username}. Skipping post.`);
      }
    } else {
      console.warn(`WARNING: Unknown bot type "${botConfig.type}" for bot ${botConfig.username}. Skipping.`);
    }
  }
  console.log('--- Finished fetchNewsAndPost cron job ---');
};

export { fetchNewsAndPost };
