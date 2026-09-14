# SkillBridge AI — From Beginner to Placement Ready

[![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.2-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-22+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.21-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![SQLite](https://img.shields.io/badge/SQLite-Embedded-003B57?logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)

**SkillBridge AI** is an intelligent, real-time career readiness, personalized skill assessment, and placement platform. It takes students on an end-to-end journey from baseline skill diagnostic evaluation to verified campus placement through adaptive AI evaluations, personalized roadmaps, safe coding sandboxes, multilingual communication trainers, AI mock interviews, live mentor support, and recruiter pipelines.

---

## 🌟 Core Features & Complete 18-Step Progression Flow

```
Register / Login
       ↓
AI Skill Assessment (Adaptive + Anti-Cheat Proctoring)
       ↓
AI Diagnostic Skill Report (Radar & Dimensional Breakdown)
       ↓
Skill Gap Analysis (Target Role Benchmark Delta)
       ↓
Personalized Dynamic Learning Roadmap
       ↓
Interactive Courses & Modular Lessons
       ↓
Lesson Mock Tests & Verification Checks
       ↓
Coding Arena (Safe Multi-language Execution Sandbox)
       ↓
Multilingual Communication Skills Trainer
       ↓
Internship, Events, Jobs & Hiring Marketplace
       ↓
AI Student-Opportunity Matching Engine
       ↓
AI Mock Interview Simulator (Conversational + Rubric Scoring)
       ↓
Mentor Support & 1:1 Live Guidance Sessions
       ↓
Recruiter Dashboard & Talent Pipeline
       ↓
College / TPO Department Readiness Analytics
       ↓
In-App Notifications & Persona Reports
       ↓
Containerized Deployment & Health Monitoring
```

### 👥 5-Tier Role-Based Access Control (RBAC)

1. **Student:** Self-assessment, skill gap diagnostics, personalized roadmaps, code challenges, communication practice, opportunity matching, AI mock interviews, and mentorship requests.
2. **Mentor:** Review assigned student requests, conduct 1-on-1 coaching sessions, inspect learning progress with granular privacy controls, and provide rubric-based evaluations.
3. **Recruiter:** Post verified campus drives and jobs, filter applicant cohorts, inspect candidate skill breakdown graphs, and schedule campus interviews.
4. **College / TPO:** Track institution-wide placement readiness across branches (CSE, IT, ECE), identify curriculum skill gaps, moderate opportunities, and generate accreditation dossiers.
5. **Platform Administrator:** Moderate company listings, verify partner accreditation, configure global roles, audit proctoring logs, and oversee platform health.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, TypeScript, Vite 8, React Router 7, Lucide Icons, Custom CSS Design System |
| **Backend** | Node.js (v22+), Express 4, TypeScript, tsx, JWT, Bcrypt.js, UUID |
| **Database** | SQLite with 31 relational tables, automated migrations, indexed foreign keys |
| **AI Engine** | Google Gemini Generative AI (Live AI evaluation with heuristic/deterministic fallbacks) |
| **Testing** | Modular Node.js test suites (136/136 automated assertions passing) |
| **DevOps** | Multi-stage Dockerfile, Docker Compose, Health Check API |

---

## 📁 Project Structure

```
skillbridge-ai/
├── client/                     # Frontend Application (React + Vite + TypeScript)
│   ├── public/                 # Static assets & icons
│   ├── src/
│   │   ├── api/                # API client services & interceptors
│   │   ├── components/         # Shared UI components, layout, modals, navigation
│   │   ├── context/            # AuthContext, ThemeContext, NotificationContext
│   │   ├── routes/             # App routing & RBAC ProtectedRoute guards
│   │   ├── types/              # TypeScript models and domain interfaces
│   │   ├── utils/              # Client helpers, formatting, storage
│   │   └── views/              # 77 role-based page views across 5 personas
│   ├── index.html              # HTML entry point
│   ├── package.json            # Frontend dependencies & scripts
│   ├── tsconfig.json           # Frontend TypeScript configuration
│   └── vite.config.ts          # Vite build & proxy configuration
│
├── server/                     # Backend API & AI Engine (Express + TypeScript)
│   ├── src/
│   │   ├── controllers/        # Request controllers
│   │   ├── db/                 # SQLite connection, 31 table schemas, seeding scripts
│   │   ├── middleware/         # JWT authentication, RBAC authorization, security headers
│   │   ├── routes/             # 18 modular API routers (auth, student, mentor, etc.)
│   │   ├── services/           # Business logic & AI engines (gemini.ts, matching.ts, etc.)
│   │   └── index.ts            # Express server initialization & lifecycle
│   ├── test-student-flow.mjs   # Student end-to-end integration test suite
│   ├── test-roles-workflow.mjs # 5-role RBAC & permission test suite
│   ├── test-security-audit.mjs # Security, tampering, and secret audit suite
│   ├── test-scoring-logic.mjs  # Scoring & rubric evaluation unit test suite
│   ├── package.json            # Backend dependencies & scripts
│   └── tsconfig.json           # Backend TypeScript configuration
│
├── Dockerfile                  # Production multi-stage Docker build
├── docker-compose.yml          # Container orchestration configuration
├── .env.example                # Environment variable template with placeholders
├── .gitignore                  # Git exclusions for dependencies, builds, and secrets
├── package.json                # Root workspace scripts (concurrent dev, builds)
└── README.md                   # Platform documentation
```

---

## ⚡ Prerequisites

Ensure you have the following installed on your local machine:

- **Node.js**: v20.x or higher (v22+ recommended)
- **npm**: v10.x or higher
- **Git**: v2.x or higher
- *(Optional)* **Docker & Docker Compose** for containerized deployments

---

## 🚀 Installation & Local Setup

### 1. Clone the Repository
```bash
git clone https://github.com/YOUR_USERNAME/skillbridge-ai.git
cd skillbridge-ai
```

### 2. Configure Environment Variables
Copy `.env.example` to create your local `.env` files:

```bash
# In the project root
cp .env.example .env

# In the server directory
cp .env.example server/.env
```

Edit `server/.env` with your preferred configuration:
```env
PORT=5000
NODE_ENV=development
JWT_SECRET=your_super_secret_jwt_key_here
CLIENT_URL=http://localhost:5173
DB_PATH=skillbridge.db

# Optional: Google OAuth 2.0 (for Google Sign-In)
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback

# Optional: Google Gemini AI Key (for live AI generation)
# Fallback heuristic engines will activate automatically if omitted
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: Administrative bootstrapping secret
ADMIN_SETUP_SECRET=your_admin_secret_key_here
```

### 3. Install Dependencies
Install all packages for root, client, and server:
```bash
# Install root orchestration tools
npm install

# Install server dependencies
cd server && npm install && cd ..

# Install client dependencies
cd client && npm install && cd ..
```

### 4. Seed Database (Optional Seed Data)
```bash
cd server
npm run seed
cd ..
```

---

## 💻 Running the Application

### Option A: Run Both Frontend & Backend Concurrently (Root)
```bash
npm run dev
```
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:5000

### Option B: Run Services Individually

**Terminal 1 — Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 — Frontend:**
```bash
cd client
npm run dev
```

---

## 🧪 Testing & Verification

The application includes 4 comprehensive automated test suites covering all 18 progression steps, role workflows, security rules, and scoring logic:

```bash
cd server

# 1. Complete Student End-to-End Journey (59 assertions)
node test-student-flow.mjs

# 2. Multi-Role RBAC & Workflows (37 assertions)
node test-roles-workflow.mjs

# 3. Security, Authorization & Secret Masking Audit (19 assertions)
node test-security-audit.mjs

# 4. Scoring, Anti-Cheat & Rubric Verification (21 assertions)
node test-scoring-logic.mjs
```

**Result:** 136/136 tests passing (100% success rate).

---

## 🐳 Docker Deployment

To build and run the entire ecosystem in a production-ready container:

```bash
# Build and run containers in detached mode
docker compose up -d --build

# Inspect container status
docker compose ps

# View container logs
docker compose logs -f
```

The unified container serves both the compiled React client and Express API on `http://localhost:5000`.

### Health Check Endpoint
```bash
curl http://localhost:5000/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "platform": "SkillBridge AI Career Readiness Ecosystem",
  "version": "1.0.0",
  "database": "connected",
  "activeEngines": [
    "Adaptive Assessment",
    "Skill Gap Analysis",
    "Roadmap Engine",
    "AI Opportunity Matcher",
    "AI Mock Interview",
    "Coding Sandbox"
  ]
}
```

---

## 🔒 Security & Privacy

- **Zero-Trust RBAC:** Every API endpoint is guarded by JWT authentication and strict role verification.
- **Credential Protection:** Passwords are encrypted with `bcryptjs` using 10 salt rounds; plaintext passwords are never stored.
- **Anti-Tampering:** Computed scores (assessment scores, readiness index) cannot be spoofed or self-assigned by clients.
- **Secret Masking:** Sensitive API keys (such as Google Gemini keys) are masked and never exposed in API responses.
- **Student Privacy:** Mentors and recruiters only see progress data that students have explicitly authorized.

---

## 📜 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

*SkillBridge AI — Empowering students with intelligent tools from first assessment to campus placement.*
