<div align="center">

<img width="1200" height="475" alt="Kaikansen Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

# ≋ Kaikansen

**The ultimate anime OP/ED rating, discovery, and social platform.**

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Latest-47A248?style=for-the-badge&logo=mongodb)](https://www.mongodb.com/)
[![Gemini AI](https://img.shields.io/badge/Gemini_AI-Powered-8E75B2?style=for-the-badge&logo=google-gemini)](https://deepmind.google/technologies/gemini/)

</div>

---

## 🌊 Overview

Kaikansen (カイカンセン) is a premium web application designed for anime enthusiasts to discover, rate, and experience anime opening (OP) and ending (ED) themes. built with a focus on immersive aesthetics and fluid performance, utilizing the **Tidal UI v7** design system.

---

## ✨ Key Features

- **🎨 Tidal UI v7 Design**: A fluid, modern, and mobile-first design system inspired by the Tidal music platform, featuring glassmorphism and smooth micro-animations.
- **🎧 Listen Mode**: An immersive experience for high-quality audio-visual playback with real-time equalizer animations.
- **🔄 AniList Integration**: Seamlessly synchronize your watch list and profile via OAuth authentication.
- **🧪 AI-Powered Discovery**: Intelligent theme recommendations and semantic search powered by Google Gemini.
- **⭐ Advanced Rating System**: Rate your favorite themes and see community trends in real-time.
- **📱 Mobile-First Experience**: Optimized layouts for both desktop "Navigation Rail" and mobile "Bottom Bar" interaction models.

---

## 🚀 Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Animations**: [Motion (Framer Motion)](https://motion.dev/)
- **Database**: [MongoDB](https://www.mongodb.com/) with [Mongoose](https://mongoosejs.com/)
- **State Management**: [TanStack Query v5](https://tanstack.com/query/latest)
- **AI**: [Google Gemini Pro](https://deepmind.google/technologies/gemini/)
- **Authentication**: Custom JWT with AniList OAuth support

---

## 🛠️ Getting Started

### Prerequisites

- Node.js (Latest LTS)
- MongoDB Cluster
- Gemini API Key
- AniList API Client ID/Secret

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/zadidsalman/kaisen.git
   cd kaisen
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Setup:**
   Create a `.env.local` file based on [.env.example](.env.example):
   ```env
   # Database
   MONGODB_URI=your_mongodb_uri

   # AI
   GEMINI_API_KEY=your_gemini_key

   # Auth
   JWT_SECRET=your_jwt_secret
   JWT_REFRESH_SECRET=your_refresh_secret

   # AniList OAuth
   ANILIST_CLIENT_ID=your_client_id
   ANILIST_CLIENT_SECRET=your_client_secret
   ANILIST_REDIRECT_URI=http://localhost:3000/api/auth/anilist/callback
   ```

4. **Run Development Server:**
   ```bash
   npm run dev
   ```

---

## 💾 Database Seeding

The project includes robust seeding scripts to populate anime and theme data:

- **Seed All Parts**: `npm run seed:all`
- **Seed Specific Year**: `npm run seed:year`
- **Generate Embeddings**: `npm run embed`

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.

---

<div align="center">
Built with ❤️ for the Anime Community.
</div>
