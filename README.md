# TuneWave - Comprehensive Project Review & Documentation

TuneWave is a highly responsive, modern, premium web-based music streaming application that visually mirrors the aesthetics of Spotify while leveraging the immense library of YouTube for audio playback.

This document serves as a deep dive into every single detail of the project's architecture, technology stack, features, and underlying logic.


---

## 🛠️ Technology Stack

- **Framework**: React 19 + Vite + TypeScript.
- **Styling**: Tailwind CSS v4 for rapid UI development and a premium custom design system (using custom variables like `tunewave-accent`, `tunewave-surface`, `tunewave-ink`).
- **State Management**: Zustand, integrated with `zustand/middleware` for local storage persistence.
- **Routing**: React Router DOM v7 for seamless Client-Side Routing (SPA).
- **Icons**: Lucide React for consistent, crisp SVG iconography.
- **Media Player**: `react-youtube` (A React wrapper around the official YouTube IFrame Player API).
- **Notifications**: `sonner` for toast notifications.
- **Animations**: CSS animations combined with `framer-motion` and Tailwind utility classes (`animate-in`, `fade-in`).

---

## 🏗️ Core Architecture & Deep Dive

The application is modularized into several key directories: `components`, `layouts`, `pages`, `services`, `store`, and `utils`.

### 1. State Management (`src/store`)
The application relies heavily on global state to maintain playback across page navigations without interrupting the music.

*   **`usePlayerStore.ts`**: The central nervous system of the application.
    *   **Variables Tracked**: `currentTrack`, `queue` (Array of tracks), `queueIndex`, `isPlaying`, `volume`, `isMuted`, `progress`, `recentlyPlayed`, `isShuffle`, `isRepeat`.
    *   **Logic**: It handles the complexities of a media player. The `playNext` and `playPrevious` functions contain intricate logic for checking queue boundaries, evaluating `isShuffle` and `isRepeat` flags.
    *   **Persistence**: Uses Zustand's `persist` middleware (`tunewave-player-storage`). However, it intelligently uses the `partialize` configuration to only persist safe attributes like `volume`, `recentlyPlayed`, `queue`, `isShuffle`, and `isRepeat`, ensuring that when a user refreshes the page, their session continues right where they left off.
*   **`usePlaylistStore.ts`**: Manages user library data.
    *   **Variables Tracked**: `playlists` (Array of user-created playlists) and `likedSongs`.
    *   **Logic**: Provides actions to create/delete playlists, add/remove tracks, and toggle the "Liked" status of any song. 
    *   **Persistence**: Fully persisted to `localStorage` (`tunewave-playlists`), functioning as a local database for the user.

### 2. The Media Engine (`src/components/Player.tsx`)
This is the most technically complex component in the project.
*   **Invisible IFrame**: It renders a `<YouTube>` component but strictly hides it from the DOM (`className="hidden"`). It passes `opts` containing `autoplay: 1`, `controls: 0`, `fs: 0` to ensure no native YouTube UI bleeds through.
*   **Custom UI**: A fixed, bottom-anchored, glassmorphic (`backdrop-blur-2xl`) control bar completely replaces the YouTube controls.
*   **Sync Logic**: A `setInterval` loop runs every second (when playing and not actively seeking) to ping the YouTube IFrame (`playerRef.current.getCurrentTime()`) and sync it with the global `progress` state, which smoothly drives the linear gradient progress bar.
*   **Event Handling**: It listens to native YouTube state changes (`onStateChange`). For example, when `event.data === 0` (Video Ended), it automatically fires the `playNext()` action from the Zustand store.

### 3. API & Data Layer (`src/services/youtubeService.ts`)
Acts as the bridge between the application and the YouTube Data API v3.
*   **Methods**: 
    *   `search(query)`: Appends "song audio" to queries to prioritize music tracks over standard videos.
    *   `getTrending()`: Fetches the most popular videos in the music category (`videoCategoryId=10`).
*   **Data Normalization**: The API returns complex metadata. This service parses ISO 8601 duration strings (`PT4M13S`) into clean human-readable formats (`4:13`) and extracts the highest quality thumbnails.
*   **Graceful Degradation**: If the backend is unavailable, it seamlessly falls back to a locally stored `mockData.ts` array, ensuring the UI never breaks during development.

### 4. UI Components (`src/components`)
*   **`TrackCard.tsx`**: A highly interactive card for displaying songs. 
    *   **Visuals**: Features a dark gradient overlay that appears on hover. If the track is currently playing, an animated pulsing equalizer (using custom Tailwind keyframes) overlays the thumbnail.
    *   **Interactivity**: Includes a click-away listener (`handleClickOutside`) for a custom context menu (three dots icon) allowing users to add the song to the queue or specific user playlists.
*   **`Sidebar.tsx` & `MobileNav.tsx`**: Responsive navigation. Desktop uses a fixed left sidebar with user playlists fetched from `usePlaylistStore`. Mobile drops to a fixed bottom tab bar for ergonomic touch navigation.

### 5. Pages (`src/pages`)
*   **`Home.tsx`**: Fetches trending music on mount and dynamically renders the `recentlyPlayed` list if it exists in the user's local storage.
*   **`Search.tsx`**: Implements debounced searching to query the YouTube API dynamically without hitting rate limits.
*   **`Library.tsx` & `LikedSongs.tsx`**: Reads directly from `usePlaylistStore` to display saved user data.

---

## 🎨 UI/UX Highlights & Design System

The application is built to feel extremely premium, avoiding standard HTML looks:
1.  **Glassmorphism**: Extensive use of `bg-white/5`, `backdrop-blur-xl`, and transparent borders (`border-white/5`) to create depth.
2.  **Color Palette**: Operates on a deep dark mode (`tunewave-ink`) with striking neon accents (`tunewave-accent` mapped to a vibrant cyan/blue).
3.  **Micro-interactions**: 
    *   Hovering over range sliders expands the thumb pointer (`hover:[&::-webkit-slider-thumb]:scale-125`).
    *   Play buttons scale up on hover.
    *   Images zoom slightly on card hover (`group-hover:scale-105`).
4.  **Responsive Design**: The Player dynamically shifts layouts between mobile and desktop, hiding volume controls on mobile to save space, and the sidebar collapses into a bottom navigation bar.

---

## 🚀 Setup & Installation Instructions

This project is a full-stack application requiring two separate servers: a Node.js Backend and a React Frontend.

### Prerequisites
- Node.js installed (v18+)
- A Google Cloud Project with the **YouTube Data API v3** enabled.

### 1. Backend Setup (Node.js + Express + yt-dlp)
The backend is responsible for extracting direct audio streams to bypass iframe restrictions.
1. Navigate to the backend directory: `cd backend`
2. Install dependencies: `npm install`
3. Start the backend server: `npm run dev` (Runs on port 5000 by default)

### 2. Frontend Setup (React + Vite)
1. Open a new terminal in the project root.
2. Install dependencies: `npm install`
3. Create a `.env` file from `.env.example` and add your keys:
   ```env
   VITE_API_URL=http://localhost:5000
   ```
4. Start the frontend: `npm run dev`

---

## ☁️ Deployment Architecture

### Backend (Render)
The backend is configured for deployment on Render.
1. Connect your repository to Render.
2. Create a new "Web Service".
3. Render will automatically detect the `render.yaml` blueprint provided in the repository root.
4. If doing it manually:
   - Build Command: `cd backend && npm install`
   - Start Command: `cd backend && npm start`
5. Note your Render URL (e.g., `https://tunewave-backend.onrender.com`).

### Frontend (Vercel)
The frontend remains a purely static SPA deployed on Vercel.
1. Connect your repository to Vercel.
2. Framework Preset: Vite
3. Build Command: `npm run build`
4. Output Directory: `dist`
5. **Environment Variables**:
   - `VITE_API_URL`: Your deployed Render backend URL (e.g., `https://tunewave-backend.onrender.com`).

---

## 🔮 Future Enhancements (Roadmap)

While the project is robust, potential future improvements could include:
- **Infinite Scrolling**: Wrapping `react-query` and intersection observers to load more than 15 search results seamlessly.
- **Drag & Drop Queue**: Integrating `@dnd-kit/core` to allow users to reorder the upcoming queue inside the `Player`.
- **Lyrics Integration**: Fetching lyrics from a third-party API based on the currently playing `artist` and `title`.
