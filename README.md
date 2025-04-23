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
- Tailwind CSS for styling
- Framer Motion for animations
- Chart.js for data visualization

### Backend
- Node.js with Express
- Passport.js for GitHub OAuth
- Memory Cache for performance optimization
- Express Rate Limiting
- ETag support for caching

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

3. Create environment variables:

Frontend (.env):
```env
VITE_API_URL=http://localhost:3000
VITE_OPENAI_API_KEY=your_openai_api_key
```

Backend (.env):
```env
# GitHub OAuth Configuration
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_CALLBACK_URL=http://localhost:3000/auth/github/callback

# Server Configuration
NODE_ENV=development
PORT=3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Session Configuration
SESSION_SECRET=your_secure_session_secret_here

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

# Start frontend development server
cd frontend
npm run dev
```

## 🏗️ Project Structure

```
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── features/
│   │   ├── services/
│   │   ├── store/
│   │   ├── types/
│   │   └── utils/
│   └── public/
└── backend/
    ├── src/
    │   ├── routes/
    │   ├── services/
    │   └── models/
    └── config/
```
