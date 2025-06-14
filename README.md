Social Media Backend

This is a comprehensive backend application for a social media platform, built with Node.js, Express, and MongoDB. It includes features like user authentication, post management, likes, comments, and a personalized user feed.
Features Included

    Express + ESM: Modern JavaScript modules support.

    MongoDB with Mongoose models: Robust NoSQL database integration.

    Authentication (signup, login): Secure user authentication using JWT (JSON Web Tokens) and bcrypt for password hashing.

    Social features:

        Posts creation, retrieval, and deletion.

        User-specific feed (posts from followed users and own posts).

        Liking and unliking posts.

        Commenting on posts.

    Linting: ESLint setup for consistent code style and quality.

    Pre-commit hook: Husky + lint-staged to auto-lint and fix code before committing.

    GitHub Actions CI: Automated linting on every branch push or pull request.

Getting Started
Prerequisites

    Node.js (v18 or higher recommended)

    MongoDB (local or cloud instance)

    npm (Node Package Manager) or Yarn

Installation

    Clone the repository:

    git clone https://your-repo-link/backend.git
    cd backend

    Install dependencies:

    npm install
    # Or if you use yarn: yarn install

    Set up environment variables:
    Create a .env file in the root directory of the project and add the following:

    NODE_ENV=development
    PORT=5000
    MONGO_URI=mongodb://localhost:27017/social-media-db
    JWT_SECRET=your_super_secret_jwt_key # Make this a strong, random string
    JWT_EXPIRES_IN=1h

        MONGO_URI: Your MongoDB connection string. If running locally, mongodb://localhost:27017/social-media-db is a common default.

        JWT_SECRET: A strong, random string used to sign your JWTs.

        JWT_EXPIRES_IN: How long the JWT token will be valid (e.g., 1h for 1 hour, 7d for 7 days).

    Husky Setup:
    Husky should automatically set up the Git hooks upon npm install (due to the prepare script in package.json). If not, run:

    npx husky install

Running the Application

    Start the development server:

    npm run dev

    This will start the server using nodemon (with --watch for ESM) which automatically restarts on file changes.

    Start the production server:

    npm start

The API will be running on http://localhost:5000 (or your specified PORT).
Linting

To lint your code and automatically fix fixable issues:

npm run lint:fix

To just check for linting issues:

npm run lint


# 📘 API Endpoints Documentation

This document outlines the available API endpoints, including methods, authentication requirements, request/response structures, and common error responses.

---

## 🔐 Authentication Endpoints

### **POST** `/api/auth/signup`

Register a new user.

* **Auth Required:** No
* **Request Body:**

  ```json
  {
    "username": "string",
    "email": "string",
    "password": "string"
  }
  ```
* **Success Response:**

  ```json
  {
    "_id": "string",
    "username": "string",
    "email": "string",
    "profilePicture": "string",
    "token": "string"
  }
  ```
* **Error Responses:**

  * `400 Bad Request`:

    ```json
    { "message": "Please enter all fields" }
    { "message": "User already exists" }
    ```
  * `500 Server Error`

---

### **POST** `/api/auth/login`

Authenticate user and return JWT token.

* **Auth Required:** No
* **Request Body:**

  ```json
  {
    "email": "string",
    "password": "string"
  }
  ```
* **Success Response:** *Same as signup response*
* **Error Responses:**

  * `400 Bad Request`: `{ "message": "Please enter all fields" }`
  * `401 Unauthorized`: `{ "message": "Invalid credentials" }`
  * `500 Server Error`

---

### **GET** `/api/auth/profile`

Get the currently authenticated user's profile.

* **Auth Required:** Yes
* **Success Response:**

  ```json
  {
    "_id": "string",
    "username": "string",
    "email": "string",
    "profilePicture": "string",
    "followers": ["string"],
    "following": ["string"]
  }
  ```
* **Error Responses:**

  * `401 Unauthorized`:

    ```json
    { "message": "Not authorized, no token" }
    { "message": "Not authorized, token failed" }
    ```

---

## 📝 Post Endpoints

### **POST** `/api/posts`

Create a new post.

* **Auth Required:** Yes
* **Request Body:**

  ```json
  {
    "content": "string",
    "image": "string" // optional
  }
  ```
* **Success Response:**

  ```json
  {
    "_id": "string",
    "user": "string",
    "content": "string",
    "image": "string",
    "likes": [],
    "comments": [],
    "createdAt": "date",
    "updatedAt": "date"
  }
  ```
* **Error Responses:**

  * `400 Bad Request`: `{ "message": "Post content is required." }`
  * `401 Unauthorized`
  * `500 Server Error`

---

### **GET** `/api/posts`

Retrieve all posts (global feed).

* **Auth Required:** Yes
* **Success Response:**

  ```json
  [
    {
      "_id": "string",
      "user": {
        "_id": "string",
        "username": "string",
        "profilePicture": "string"
      },
      "content": "string",
      "image": "string",
      "likes": ["string"],
      "comments": [
        {
          "user": {
            "_id": "string",
            "username": "string",
            "profilePicture": "string"
          },
          "text": "string",
          "createdAt": "date",
          "_id": "string"
        }
      ],
      "createdAt": "date",
      "updatedAt": "date"
    }
  ]
  ```
* **Error Responses:**

  * `401 Unauthorized`
  * `500 Server Error`

---

### **GET** `/api/posts/feed`

Retrieve personalized feed (only posts from followed users).

* **Auth Required:** Yes
* **Success Response:** *Same structure as `/api/posts`*
* **Error Responses:**

  * `401 Unauthorized`
  * `404 Not Found`: `{ "message": "User not found." }`
  * `500 Server Error`

---

### **GET** `/api/posts/:id`

Get a single post by ID.

* **Auth Required:** Yes
* **Success Response:** *Same structure as a single post from `/api/posts`*
* **Error Responses:**

  * `401 Unauthorized`
  * `404 Not Found`: `{ "message": "Post not found." }`
  * `500 Server Error`

---

### **DELETE** `/api/posts/:id`

Delete a post.

* **Auth Required:** Yes
* **Success Response:**

  ```json
  { "message": "Post removed." }
  ```
* **Error Responses:**

  * `401 Unauthorized`: `{ "message": "Not authorized to delete this post." }`
  * `404 Not Found`: `{ "message": "Post not found." }`
  * `500 Server Error`

---

### **PUT** `/api/posts/:id/like`

Toggle like/unlike on a post.

* **Auth Required:** Yes
* **Success Response:**

  ```json
  { "message": "Post liked." } // or "Post unliked."
  ```
* **Error Responses:**

  * `401 Unauthorized`
  * `404 Not Found`: `{ "message": "Post not found." }`
  * `500 Server Error`

---

### **POST** `/api/posts/:id/comment`

Add a comment to a post.

* **Auth Required:** Yes
* **Request Body:**

  ```json
  {
    "text": "string"
  }
  ```
* **Success Response:**

  ```json
  {
    "user": {
      "_id": "string",
      "username": "string",
      "profilePicture": "string"
    },
    "text": "string",
    "createdAt": "date",
    "_id": "string"
  }
  ```
* **Error Responses:**

  * `400 Bad Request`: `{ "message": "Comment text is required." }`
  * `401 Unauthorized`
  * `404 Not Found`: `{ "message": "Post not found." }`
  * `500 Server Error`

---

## ⚙️ General Notes for Frontend Developers

* **Authentication Header:**
  Use `Authorization: Bearer <YOUR_JWT_TOKEN>` for all authenticated requests.

* **Content-Type Header:**
  For POST and PUT requests, set `Content-Type: application/json`.

* **Error Handling:**
  Handle HTTP statuses like `400`, `401`, `404`, and `500`. Check the `message` field in error responses.

* **ID Fields:**
  All `_id` values are strings (MongoDB ObjectIDs).

* **Date Fields:**
  `createdAt` and `updatedAt` use ISO 8601 strings. Parse them as `Date` objects in the frontend.

* **Populated Fields:**
  Fields like `user` and `comments.user` in post responses are populated with `username` and `profilePicture`.

---

Refer to the initial project structure provided in the chat.
CI/CD (GitHub Actions)

The .github/workflows/ci.yml file configures a GitHub Actions workflow that automatically runs ESLint on every push to main or develop branches, and on every pull_request targeting these branches.
Contribution

Feel free to fork this repository and contribute!
