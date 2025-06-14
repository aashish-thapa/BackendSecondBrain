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

API Endpoints

This document outlines the available API endpoints, their methods, authentication requirements, request bodies, and expected successful/error response structures.
Authentication Endpoints

Endpoint
	

Method
	

Description
	

Auth Required
	

Request Body (JSON)
	

Success Response (JSON)
	

Common Error Responses (Status Code & Body)

/api/auth/signup
	

POST
	

Register a new user
	

No
	

{ "username": "string", "email": "string", "password": "string" }
	

{"_id":"string","username":"string","email":"string","profilePicture":"string","token":"string"}
	

400 Bad Request: {"message":"Please enter all fields"}  400 Bad Request: {"message":"User already exists"}  500 Server Error

/api/auth/login
	

POST
	

Authenticate user & get token
	

No
	

{ "email": "string", "password": "string" }
	

{"_id":"string","username":"string","email":"string","profilePicture":"string","token":"string"}
	

400 Bad Request: {"message":"Please enter all fields"}  401 Unauthorized: {"message":"Invalid credentials"}  500 Server Error

/api/auth/profile
	

GET
	

Get authenticated user profile
	

Yes
	

None
	

{"_id":"string","username":"string","email":"string","profilePicture":"string","followers":["string"], "following":["string"]}
	

401 Unauthorized: {"message":"Not authorized, no token"}  401 Unauthorized: {"message":"Not authorized, token failed"}
Post Endpoints

Endpoint
	

Method
	

Description
	

Auth Required
	

Request Body (JSON)
	

Success Response (JSON)
	

Common Error Responses (Status Code & Body)

/api/posts
	

POST
	

Create a new post
	

Yes
	

{ "content": "string", "image": "string" (optional) }
	

{"_id":"string","user":"string","content":"string","image":"string","likes":[],"comments":[],"createdAt":"date","updatedAt":"date"}
	

400 Bad Request: {"message":"Post content is required."}  401 Unauthorized  500 Server Error

/api/posts
	

GET
	

Get all posts (global feed)
	

Yes
	

None
	

[ { "_id": "string", "user": {"_id":"string","username":"string","profilePicture":"string"}, "content": "string", "image": "string", "likes": ["string"], "comments": [ { "user": {"_id":"string","username":"string","profilePicture":"string"}, "text": "string", "createdAt": "date", "_id": "string" } ], "createdAt": "date", "updatedAt": "date" } ]
	

401 Unauthorized  500 Server Error

/api/posts/feed
	

GET
	

Get personalized user feed
	

Yes
	

None
	

Same as GET /api/posts (array of populated post objects, but filtered by user's following list)
	

401 Unauthorized  404 Not Found: {"message":"User not found."}  500 Server Error

/api/posts/:id
	

GET
	

Get a single post by ID
	

Yes
	

None
	

Single post object (same structure as array element in GET /api/posts response)
	

401 Unauthorized  404 Not Found: {"message":"Post not found."}  500 Server Error

/api/posts/:id
	

DELETE
	

Delete a post
	

Yes
	

None
	

{"message":"Post removed."}
	

401 Unauthorized: {"message":"Not authorized to delete this post."}  404 Not Found: {"message":"Post not found."}  500 Server Error

/api/posts/:id/like
	

PUT
	

Toggle like/unlike on a post
	

Yes
	

None
	

{"message":"Post liked."} or {"message":"Post unliked."} with the updated post object
	

401 Unauthorized  404 Not Found: {"message":"Post not found."}  500 Server Error

/api/posts/:id/comment
	

POST
	

Add a comment to a post
	

Yes
	

{ "text": "string" }
	

{"user":{"_id":"string","username":"string","profilePicture":"string"},"text":"string","createdAt":"date","_id":"string"}
	

400 Bad Request: {"message":"Comment text is required."}  401 Unauthorized  404 Not Found: {"message":"Post not found."}  500 Server Error
General Notes for Frontend:

    Authentication Header: For all authenticated endpoints, include the header Authorization: Bearer <YOUR_JWT_TOKEN>.

    Content-Type: For POST and PUT requests that send JSON data, always include the header Content-Type: application/json.

    Error Handling: Always be prepared to handle different HTTP status codes (e.g., 400, 401, 404, 500) and display appropriate messages to the user based on the message field in the error response body.

    IDs: All _id fields returned by MongoDB are strings.

    Dates: createdAt and updatedAt fields are ISO 8601 formatted date strings. You can parse these into Date objects in JavaScript for display.

    Populated Fields: Notice that user and comments.user fields are "populated" in GET requests for posts, meaning they include the username and profilePicture of the associated user, not just their ID. This is very helpful for display in the frontend.

This reference should provide a clear guide for consuming your backend API!
Project Structure

Refer to the initial project structure provided in the chat.
CI/CD (GitHub Actions)

The .github/workflows/ci.yml file configures a GitHub Actions workflow that automatically runs ESLint on every push to main or develop branches, and on every pull_request targeting these branches.
Contribution

Feel free to fork this repository and contribute!