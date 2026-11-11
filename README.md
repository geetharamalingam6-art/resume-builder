# Resume Builder

A React and Vite resume builder with dynamic education and experience entries,
editable skills, AI-powered skill suggestions from Gemini, and PDF resume
downloads.

## Setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and set `GEMINI_API_KEY` to your Gemini API key.
   The key is read by the server and is not included in the browser bundle.
3. Run `npm run dev` and open the local URL printed by Vite.

The development command starts both the Vite frontend and the API server.
For a production build, run `npm run build`, then `npm start`; the server serves
the built frontend and the Gemini API endpoint. `npm run preview` builds and
starts that production server.
