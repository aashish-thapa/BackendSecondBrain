# Social Media Backend

This is a comprehensive backend application for a social media platform, built with Node.js, Express, and MongoDB (FOR MVP ONLY). It includes robust features for user authentication, post management, social interactions, and advanced AI-driven content analysis and personalization.

## Features Included

* **Express + ESM**: Modern JavaScript modules support for clean, modular code.
* **MongoDB with Mongoose Models**: Robust NoSQL database integration for flexible data storage.
* **User Authentication**:
    * Secure user signup and login using JWT (JSON Web Tokens).
    * Password hashing with `bcryptjs` for security.
    * Protected routes ensuring only authenticated users can access certain resources.
* **Social Features**:
    * **Post Management**: Create, retrieve (all, by ID), and delete posts.
    * **Liking System**: Users can like and unlike posts.
    * **Commenting System**: Users can add comments to posts.
    * **User Following**: Basic structure for user-to-user following (though routes for follow/unfollow are not explicitly built out, the relationship is in the User model).
* **Advanced AI Integration (Hybrid Hugging Face & Gemini)**:
    * **Sentiment Analysis**: Utilizes a specialized Hugging Face model (`cardiffnlp/twitter-roberta-base-sentiment`) to determine the overall emotional tone of posts (Positive, Negative, Neutral, Mixed).
    * **Emotion Detection**: Leverages another Hugging Face model (`j-hartmann/emotion-english-distilroberta-base`) to identify nuanced emotions like joy, anger, sadness, surprise, etc.
    * **Toxicity & Hate Speech Detection**: Employs a Hugging Face model (`cardiffnlp/twitter-roberta-base-offensive`) to flag potentially offensive or harmful content, contributing to content moderation.
    * **Topic Extraction**: Uses **Gemini AI** to extract 3-5 distinct, key topics/keywords from post content.
    * **Content Summarization**: Utilizes **Gemini AI** to generate concise summaries (max 50 words) of posts.
    * **Content Categorization**: **Gemini AI** classifies posts into one of several predefined categories (e.g., Technology, Sports, Entertainment, Personal Update), aiding organization and discovery.
    * **AI analysis results are saved directly with each post** in the database, allowing for persistent insights.
* **Personalized Content Feed**:
    * Beyond a simple chronological feed or posts from followed users, the feed now **learns user interests** based on posts they `like`.
    * When a user likes a post, its AI-generated categories and topics are aggregated into the user's `userPreferences`.
    * Posts in the personalized feed (`/api/posts/feed`) are dynamically **ranked and prioritized** based on:
        * Posts from followed users and the user's own posts (base priority).
        * How well post categories and topics match the user's accumulated `likedCategories` and `likedTopics`.
        * Recency of the post.
        * (Optional) Penalties for toxic content to promote a healthier feed.
* **Code Quality**:
    * **Linting**: ESLint setup for consistent code style and quality.
    * **Pre-commit hook**: Husky + `lint-staged` to automatically lint and fix code before committing, ensuring code quality standards are met.
    * **GitHub Actions CI**: Automated linting on every branch push or pull request to maintain code integrity in the repository.

---

## Getting Started

### Prerequisites

Before you can run this backend, ensure you have the following installed:

* **Node.js**: Version 18 or higher is recommended.
    * [Download Node.js](https://nodejs.org/en/download/)
* **MongoDB**: A running instance (local or cloud-hosted via MongoDB Atlas).
    * [Install MongoDB Community Edition](https://docs.mongodb.com/manual/installation/)
    * [MongoDB Atlas (Cloud)](https://www.mongodb.com/cloud/atlas)
* **npm** (Node Package Manager) or **Yarn**: Usually comes with Node.js.
* **Hugging Face API Token**: Required for Sentiment, Emotion, and Toxicity analysis.
    * [Get your Hugging Face API Token](https://huggingface.co/settings/tokens) (Ensure it has at least "Read" access).
* **Gemini API Key**: Required for Topic Extraction, Summarization, and Categorization.
    * [Get your Gemini API Key](https://aistudio.google.com/app/apikey)

### Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/aashish-thapa/BackendSecondBrain 
    cd BackEndSecondBrain
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    # Or if you use yarn: yarn install
    ```

3.  **Set up environment variables**:
    Create a file named `.env` in the **root directory** of your project (same level as `package.json` and `app.js`). Copy the content below into your `.env` file and replace the placeholder values with your actual keys and desired settings.

    ```env
    NODE_ENV=development
    PORT=5000
    MONGO_URI=mongodb://localhost:27017/social-media-db # Example local MongoDB URI
    JWT_SECRET=your_super_secret_jwt_key # IMPORTANT: Use a strong, random, unique string
    JWT_EXPIRES_IN=1h # Example: Token expires in 1 hour. Can be '7d' for 7 days etc.

    # Hugging Face AI Models
    HF_API_TOKEN=YOUR_HUGGING_FACE_API_TOKEN_HERE
    HF_SENTIMENT_MODEL=cardiffnlp/twitter-roberta-base-sentiment
    HF_EMOTION_MODEL=j-hartmann/emotion-english-distilroberta-base
    HF_TOXICITY_MODEL=cardiffnlp/twitter-roberta-base-offensive

    # Google Gemini AI Key
    GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE
    ```
    * **`MONGO_URI`**: Your MongoDB connection string. If using MongoDB Atlas, copy your connection string from there.
    * **`JWT_SECRET`**: A secret key used to sign and verify JWTs. **Crucial for security; keep it secret!**
    * **`JWT_EXPIRES_IN`**: Controls how long issued JWTs are valid.
    * **Hugging Face Models**: These are the specific models hosted on Hugging Face's Inference API used for their respective tasks.
    * **`GEMINI_API_KEY`**: Your API key for Google Gemini.

4.  **Husky Setup (for Git hooks)**:
    Husky should automatically set up the Git hooks upon `npm install` (due to the `prepare` script in `package.json`). If not, you can manually run:
    ```bash
    npx husky install
    ```

---

## Running the Application

* **Start the development server**:
    ```bash
    npm run dev
    ```
    This command uses `nodemon` to start the server. It will automatically restart the server whenever you save changes to your `.js` files. The server will typically run on `http://localhost:5000`.

* **Start the production server**:
    ```bash
    npm start
    ```
    This command starts the server for a production environment.

The API will be running on the `PORT` specified in your `.env` file (default: `http://localhost:5000`).

---

## Code Quality

* **Linting (ESLint)**:
    To lint your code and automatically fix fixable issues according to the configured ESLint rules:
    ```bash
    npm run lint:fix
    ```
    To just check for linting issues without fixing them:
    ```bash
    npm run lint
    ```

---

## API Endpoints Documentation

This section provides detailed information on all available API endpoints, including their HTTP methods, authentication requirements, expected request bodies, and examples of successful and error responses.

### Base URL

All endpoints are prefixed with the base URL for your API, e.g., `http://localhost:5000/api`.

---

### **1. Authentication Endpoints (`/api/auth`)**

| Endpoint           | Method | Description                        | Auth Required | Request Body (JSON)                                        | Success Response (Status & Body)                                                                               | Common Error Responses (Status & Body)                                                              |
| :----------------- | :----- | :--------------------------------- | :------------ | :--------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------- |
| `/api/auth/signup` | `POST` | Registers a new user.              | No            | ```json { "username": "string", "email": "string", "password": "string" } ``` | `201 Created` <br/> ```json { "_id": "string", "username": "string", "email": "string", "profilePicture": "string", "token": "string" } ``` | `400 Bad Request: {"message":"Please enter all fields."}` <br/> `400 Bad Request: {"message":"User already exists."}` <br/> `500 Server Error: {"message":"Server error."}` |
| `/api/auth/login`  | `POST` | Authenticates a user and returns a JWT. | No            | ```json { "email": "string", "password": "string" } ```     | `200 OK` <br/> ```json { "_id": "string", "username": "string", "email": "string", "profilePicture": "string", "token": "string" } ``` | `400 Bad Request: {"message":"Please enter all fields."}` <br/> `401 Unauthorized: {"message":"Invalid credentials."}` <br/> `500 Server Error: {"message":"Server error."}` |
| `/api/auth/profile`| `GET`  | Retrieves the authenticated user's profile details. | Yes           | None                                                       | `200 OK` <br/> ```json { "_id": "string", "username": "string", "email": "string", "profilePicture": "string", "followers": ["string"], "following": ["string"], "userPreferences": { "likedCategories": { "CategoryName": number }, "likedTopics": { "TopicName": number } } } ``` | `401 Unauthorized: {"message":"Not authorized, no token provided."}` <br/> `401 Unauthorized: {"message":"Not authorized, token failed."}` <br/> `404 Not Found: {"message":"User not found."}` |

---

### **2. Post Endpoints (`/api/posts`)**

All post-related endpoints require authentication unless specified.

| Endpoint                 | Method | Description                                | Auth Required | Request Body (JSON)                                        | Success Response (Status & Body)                                                                                                                                                                                                                                                                                                                                                                                    | Common Error Responses (Status & Body)                                                                      |
| :----------------------- | :----- | :----------------------------------------- | :------------ | :--------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------- |
| `/api/posts`             | `POST` | Creates a new post. `aiAnalysis` fields are initialized and will be populated after calling `/api/ai/analyze/:postId`. | Yes           | ```json { "content": "string", "image": "string" (optional) } ``` | `201 Created` <br/> ```json { "_id": "string", "user": "string", "content": "string", "image": "string", "likes": [], "comments": [], "aiAnalysis": { "sentiment": "Unknown", "emotions": [], "toxicity": { "detected": false, "details": {} }, "topics": [], "summary": "", "category": "Uncategorized" }, "createdAt": "date", "updatedAt": "date", "__v": 0 } ``` | `400 Bad Request: {"message":"Post content is required."}` <br/> `401 Unauthorized` <br/> `500 Server Error: {"message":"Server error."}` |
| `/api/posts`             | `GET`  | Retrieves all posts chronologically (global feed). Populates user and comment user details. | Yes           | None                                                       | `200 OK` <br/> ```json [ { "_id": "string", "user": { "_id": "string", "username": "string", "profilePicture": "string" }, "content": "string", "image": "string", "likes": ["string"], "comments": [ { "user": { "_id": "string", "username": "string", "profilePicture": "string" }, "text": "string", "createdAt": "date", "_id": "string" } ], "aiAnalysis": { "sentiment": "string", "emotions": [{ "emotion": "string", "score": number }], "toxicity": { "detected": boolean, "details": { "offensive": number, "not offensive": number } }, "topics": ["string"], "summary": "string", "category": "string" }, "createdAt": "date", "updatedAt": "date", "__v": 0 }, ... ] ``` | `401 Unauthorized` <br/> `500 Server Error: {"message":"Server error."}` |
| `/api/posts/feed`        | `GET`  | Retrieves a personalized feed for the authenticated user, ranked by `relevanceScore` based on liked content. | Yes           | None                                                       | `200 OK` <br/> ```json [ { "_id": "string", "user": { "_id": "string", "username": "string", "profilePicture": "string" }, "content": "string", "image": "string", "likes": ["string"], "comments": [ { "user": { "_id": "string", "username": "string", "profilePicture": "string" }, "text": "string", "createdAt": "date", "_id": "string" } ], "aiAnalysis": { ... }, "createdAt": "date", "updatedAt": "date", "__v": 0, "relevanceScore": number }, ... ] ``` | `401 Unauthorized` <br/> `404 Not Found: {"message":"User not found."}` <br/> `500 Server Error: {"message":"Server error."}` |
| `/api/posts/:id`         | `GET`  | Retrieves a single post by its ID. Populates user and comment user details. | Yes           | None                                                       | `200 OK` <br/> (Single post object, same structure as an element in `GET /api/posts` response)             | `401 Unauthorized` <br/> `404 Not Found: {"message":"Post not found."}` <br/> `500 Server Error: {"message":"Server error."}` |
| `/api/posts/:id`         | `DELETE` | Deletes a post by its ID. Only the post owner can delete it. | Yes           | None                                                       | `200 OK: {"message":"Post removed."}`                                                                        | `401 Unauthorized: {"message":"Not authorized to delete this post."}` <br/> `404 Not Found: {"message":"Post not found."}` <br/> `500 Server Error: {"message":"Server error."}` |
| `/api/posts/:id/like`    | `PUT`  | Toggles a like/unlike on a post. Updates user's `likedCategories` and `likedTopics` preferences. | Yes           | None                                                       | `200 OK: {"message":"Post liked.","post":{...}}` or <br/> `{"message":"Post unliked.","post":{...}}` (returns updated post object) | `401 Unauthorized` <br/> `404 Not Found: {"message":"Post not found."}` <br/> `500 Server Error: {"message":"Server error."}` |
| `/api/posts/:id/comment` | `POST` | Adds a comment to a post.          | Yes           | ```json { "text": "string" } ```                           | `201 Created` <br/> ```json { "user": { "_id": "string", "username": "string", "profilePicture": "string" }, "text": "string", "createdAt": "date", "_id": "string" } ``` | `400 Bad Request: {"message":"Comment text is required."}` <br/> `401 Unauthorized` <br/> `404 Not Found: {"message":"Post not found."}` <br/> `500 Server Error: {"message":"Server error."}` |

---

### **3. AI Endpoints (`/api/ai`)**

This endpoint triggers the AI analysis for a specific post and saves the results to the post in the database.

| Endpoint                   | Method | Description                                | Auth Required | Request Body (JSON) | Success Response (Status & Body)                                                                                                                                                                                                                                                                                                                                                                                                           | Common Error Responses (Status & Body)                                                                                                                  |
| :------------------------- | :----- | :----------------------------------------- | :------------ | :------------------ | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/ai/analyze/:postId` | `POST` | Analyzes a post's content using AI (sentiment, emotions, toxicity, topics, summary, category) and saves the `aiAnalysis` data back to the post. | Yes           | None                | `200 OK` <br/> ```json { "postId": "string", "content": "string", "aiAnalysis": { "sentiment": "string", "emotions": [ { "emotion": "string", "score": number } ], "toxicity": { "detected": boolean, "details": { "offensive": number, "not offensive": number } }, "topics": ["string"], "summary": "string", "category": "string" }, "message": "Post analyzed successfully and analysis saved." } ``` | `401 Unauthorized` <br/> `404 Not Found: {"message":"Post not found."}` <br/> `500 Server Error: {"message":"AI service not configured: Hugging Face API token missing."}` <br/> `500 Server Error: {"message":"AI service not configured: Gemini API key missing."}` <br/> `500 Server Error: {"message":"Failed to get analysis from AI."}` <br/> `500 Server Error: {"message":"Unexpected AI response format."}` <br/> `500 Server Error: {"message":"Server error during overall AI analysis."}` |

---

## General Notes for Frontend Developers

* **Authentication Header**: For all **authenticated endpoints**, you must include an `Authorization` header in your HTTP requests:
    ```
    Authorization: Bearer <YOUR_JWT_TOKEN>
    ```
    Replace `<YOUR_JWT_TOKEN>` with the actual token received from the `/api/auth/login` or `/api/auth/signup` endpoints.
* **Content-Type**: For all `POST` and `PUT` requests that send JSON data in the request body, always include the header:
    ```
    Content-Type: application/json
    ```
* **Error Handling**: Always be prepared to handle various HTTP status codes (e.g., `400 Bad Request`, `401 Unauthorized`, `404 Not Found`, `500 Server Error`). The backend generally provides a `message` field in the JSON error response for display to the user.
* **IDs**: All `_id` fields returned by MongoDB are strings (e.g., `654321abcdef1234567890`).
* **Dates**: `createdAt` and `updatedAt` fields are ISO 8601 formatted date strings (e.g., `2025-06-15T01:31:40.716Z`). You can parse these into `Date` objects in JavaScript for display or formatting.
* **Populated Fields**: Notice that in responses for posts and comments, the `user` field is often "populated." This means instead of just a user ID, you'll receive an object containing common user details like `_id`, `username`, and `profilePicture`. This saves you from making extra API calls to fetch user data.
* **`aiAnalysis` Object**: This nested object on each post provides all the rich AI insights. Use these fields to enhance your UI (e.g., show sentiment icons, display detected topics, filter by category, highlight toxic content for moderators).
* **`relevanceScore` (for `/api/posts/feed`)**: This numeric field helps you rank posts. Higher scores mean more relevant posts for the current user based on their preferences and network.

---

## Project Structure


.
├── .github/
│   └── workflows/
│       └── ci.yml             # GitHub Actions CI workflow for linting
├── config/
│   └── db.js                  # MongoDB connection setup
├── controllers/
│   ├── aiController.js        # Logic for AI analysis (Hugging Face & Gemini)
│   ├── authController.js      # Logic for user authentication (signup, login, profile)
│   └── postController.js      # Logic for post management (create, get, like, comment, feed)
├── middlewares/
│   └── auth.js                # JWT authentication middleware
├── models/
│   ├── Post.js                # Mongoose model for posts (includes AI analysis schema)
│   └── User.js                # Mongoose model for users (includes user preferences)
├── routes/
│   ├── aiRoutes.js            # API routes for AI features
│   ├── authRoutes.js          # API routes for authentication
│   └── postRoutes.js          # API routes for posts
├── .env.example               # Example environment variables
├── .eslintrc.js               # ESLint configuration
├── .gitignore                 # Files/directories to ignore in Git
├── .prettierrc                # Prettier configuration for code formatting
├── app.js                     # Main Express application entry point
├── package.json               # Project dependencies and scripts
└── README.md                  # Project documentation (this file)


---

## Contribution

Feel free to fork this repository and contribute!


