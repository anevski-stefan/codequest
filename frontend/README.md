# CodeQuest Frontend

React + TypeScript + Vite client for CodeQuest — a GitHub contribution app.

## Setup

```bash
npm install
cp .env.example .env   # set VITE_API_URL to your backend URL
```

## Scripts

- `npm run dev` — start the Vite dev server
- `npm run build` — type-check (`tsc`) and build for production
- `npm run preview` — preview the production build
- `npm run lint` — ESLint

## Stack

- React 18 + TypeScript
- Redux Toolkit (`src/store`) for auth/global state
- TanStack Query (`@tanstack/react-query` v5) for server data
- React Router for routing
- Tailwind CSS for styling
- Framer Motion for animations
- Chart.js for charts

See the [root README](../README.md) for full project setup and backend configuration.
