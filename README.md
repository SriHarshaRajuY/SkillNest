# SkillNest 🚀

SkillNest is a high-performance, AI-powered recruitment platform designed to bridge the gap between recruiters and candidates. It features real-time messaging, automated resume matching using Google Gemini AI, and a robust recruitment pipeline.

## ✨ Features

- **AI-Powered Evaluation**: Automated resume matching and job description audits using Google Gemini.
- **Real-time Pipeline**: Kanban-style recruitment dashboard with real-time status updates via WebSockets.
- **Secure Messaging**: Integrated in-app chat for seamless candidate-recruiter communication.
- **Smart Filtering**: Automatic candidate screening based on skill matching and assessment scores.
- **Security First**: Implementation of rate limiting, secure headers (Helmet), and JWT authentication.

## 🛠 Tech Stack

- **Frontend**: React, Vite, Tailwind CSS, Sentry.
- **Backend**: Node.js, Express, MongoDB (Mongoose), Socket.io.
- **AI Integration**: Google Generative AI (Gemini).
- **Authentication**: Clerk & Custom JWT.
- **Cloud Storage**: Cloudinary (for resumes and images).

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- MongoDB Atlas account
- Clerk account
- Cloudinary account
- Google Gemini API Key

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/SriHarshaRajuY/SkillNest.git
   cd SkillNest
   ```

2. Install dependencies:
   ```bash
   # Install server deps
   cd server && npm install
   
   # Install client deps
   cd ../client && npm install
   ```

3. Setup environment variables:
   Create a `.env` file in both `server/` and `client/` directories based on the `.env.example` (to be created).

4. Start the application:
   ```bash
   # Start server
   cd server && npm run dev
   
   # Start client
   cd client && npm run dev
   ```

## 🧪 Testing

```bash
# Run server tests
cd server && npm test

# Run client tests
cd client && npm run test
```

## 📐 Architecture

SkillNest follows a modular architecture:
- **Controllers**: Handle request logic.
- **Services**: Business logic and external integrations (AI, Matching).
- **Models**: Database schemas.
- **Realtime**: WebSocket event handling.

---

Built with ❤️ for a production-ready recruitment experience.
