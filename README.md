# ExpManager

A customer journey mapping web app for creating and managing journey maps with clients, projects, journeys, and phases.

## Features

- **Hierarchy**: Clients → Projects → Journeys → Phases
- **CRUD**: Create, read, update, delete for all entities
- **Phase editing**: Left side drawer with debounced auto-save
- **Drag & drop**: Reorder phases via drag and drop
- **Empty states**: Friendly prompts when no data exists at each level
- **Responsive**: Mobile-friendly with collapsible nav
- **Persistence**: Data stored in localStorage (easily swappable for API)

## Tech Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS
- Zustand (state)
- @dnd-kit (drag and drop)
- uuid

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Scripts

- `npm run dev` – Start development server
- `npm run build` – Production build
- `npm run preview` – Preview production build

## Data Model

The app uses a simple data model designed for future API migration:

- **Client**: id, name, description
- **Project**: id, clientId, name, description
- **Journey**: id, projectId, name, description
- **Phase**: id, journeyId, order, title, description, struggles, opportunities, frontStageActions, backStageActions, relatedProcesses, systemsTechnologiesChannels, customerJobs

Storage is abstracted via `src/lib/storage.ts` – swap `localStorageStore` for an API client when adding a backend.

## Deployment

To put the app online (e.g. with **expmanager.app**), see **[DEPLOY.md](./DEPLOY.md)** for steps using GitHub and Vercel or Netlify, including custom domain setup.

## Adding Authentication

The app is structured to add auth later without major rewrites. Consider:

1. Wrapping routes/components with an auth provider
2. Replacing `localStorageStore` with an API that sends auth tokens
3. Adding login/signup screens and protected routes
