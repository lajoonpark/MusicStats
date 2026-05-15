# YouTube Music Stats

A fully client-side personal dashboard that turns your Google Takeout YouTube/YouTube Music history into a Wrapped-style recap.

## Tech Stack

- Next.js 15 (App Router)
- TypeScript
- TailwindCSS
- Recharts
- No backend, no auth, no database
- Optimized for Vercel deployment

## Features

- Drag-and-drop upload for Google Takeout history files
  - Supports `.json` and `.html`
- Real parser for messy YouTube titles with normalization
- Dashboard sections:
  - Top 10 Artists
  - Top 10 Songs
  - Songs On Repeat
  - Most Active Listening Days
  - Listening Activity by Month
  - Total Plays / Unique Songs / Unique Artists
  - Recently Played
- Recharts visualizations:
  - Top artists bar chart
  - Top songs bar chart
  - Monthly activity line chart
  - Artist distribution pie chart
- Songs-on-repeat obsession scoring
- Music personality labels from listening patterns
- Share recap card with in-browser PNG download
- Dark mode glassmorphism UI, transitions, and skeleton loading states

## Project Structure

```text
/components
  /charts
  /cards
  /upload
  /dashboard

/lib
  parser.ts
  normalization.ts
  analytics.ts
  personality.ts

/types
  music.ts
```

## Getting Your Google Takeout Data

1. Open [Google Takeout](https://takeout.google.com/)
2. Select **YouTube and YouTube Music**
3. Include history export
4. Download the archive
5. Extract and locate the history file (`.json` or `.html`)

Flow reminder: **Google Takeout → YouTube and YouTube Music → history**

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Supported Input Formats

- Google Takeout JSON history
- Google Takeout HTML history

Error handling is included for:
- Invalid files
- Empty files
- Corrupted JSON
- Unsupported formats

## Build, Lint, and Run

```bash
npm run lint
npm run build
npm run start
```

## Vercel Deployment

1. Push this repository to GitHub
2. Import the project into Vercel
3. Use default Next.js settings
4. Deploy

No server-side env variables are required for core functionality.

## Screenshots

- `[Placeholder]` Upload landing page
- `[Placeholder]` Full analytics dashboard
- `[Placeholder]` Recap card download view
