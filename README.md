# GitHub Contribution App

A modern web application that helps developers discover, track, and contribute to GitHub projects. Built with React, TypeScript, and Node.js.

> **Note**: Active development is being done on the `develop` branch. Please make sure to check out the develop branch for the latest changes:
> ```bash
> git checkout develop
> ```

## 🌟 Features

- **GitHub Authentication**: Secure OAuth2 integration with GitHub
- **Project Discovery**: Search and explore GitHub repositories
- **Issue Management**: Track and filter GitHub issues across repositories
- **Contributor Insights**: View detailed contributor statistics and profiles
- **Hackathon Integration**: Browse and track hackathon opportunities
- **Dark Mode Support**: Full dark mode theming with Tailwind CSS

## 🚀 Tech Stack

### Frontend
- React.js with TypeScript
- Redux Toolkit for state management
- React Query for data fetching
- Vite as build tool
- React Router for routing
- Tailwind CSS for styling
- Framer Motion for animations
- Chart.js for data visualization
- Custom hooks and contexts for state management
- TypeScript for type safety

### Backend
- Node.js with Express
- Passport.js for GitHub OAuth
- Express middleware for security and performance
- Express Rate Limiting
- ETag support for caching
- Environment-based configuration

## 🛠️ Installation

1. Clone the repository:
```bash
git clone https://github.com/anevski-stefan/codequest.git
cd codequest
```

2. Install dependencies:
```bash
# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install
```

3. Configure environment variables:

Frontend (.env):
```env
VITE_API_URL=http://localhost:3000
```

Backend (.env):
```env
# Server Configuration
NODE_ENV=development
PORT=3000

# Client (frontend) URL used for post-auth redirects
CLIENT_URL=http://localhost:5173

# Allowed CORS origins (comma-separated). Falls back to CLIENT_URL then localhost.
ALLOWED_ORIGINS=http://localhost:5173

# GitHub OAuth Configuration
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_CALLBACK_URL=http://localhost:3000/auth/github/callback

# Supabase (REQUIRED for authentication - access tokens are stored server-side here)
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_KEY=your_supabase_service_role_key

# Session Configuration
SESSION_SECRET=your_secure_session_secret_here

# Encryption key for at-rest user AI keys (AES-256-GCM)
AI_KEY_SECRET=your_secure_ai_key_secret_here

# Mailchimp Configuration (Optional)
MAILCHIMP_API_KEY=your_mailchimp_api_key
MAILCHIMP_LIST_ID=your_mailchimp_list_id
MAILCHIMP_SERVER=your_mailchimp_server
```

4. Start the development servers:
```bash
# Start backend server
cd backend
npm run dev

# In a new terminal, start frontend development server
cd frontend
npm run dev
```

## 📝 License

This project is licensed under the [MIT License](LICENSE) - see the [LICENSE](LICENSE) file for details.
