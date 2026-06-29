# 🚀 CodePrep — LeetCode Company Tracker

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue?style=for-the-badge)
![Node](https://img.shields.io/badge/Node.js-%E2%89%A518.0-339933?style=for-the-badge&logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-4.x-000000?style=for-the-badge&logo=express&logoColor=white)
![Chrome](https://img.shields.io/badge/Chrome_Extension-MV3-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)
![License](https://img.shields.io/badge/license-ISC-green?style=for-the-badge)

**A full-stack DSA preparation platform that automatically detects LeetCode submissions, syncs accepted solutions to your GitHub repository, and tracks your progress across company-wise question banks, DSA patterns, and structured challenges — all in real time.**

[🌐 Live Demo](https://code-prep-three.vercel.app) · [🐛 Report Bug](../../issues) · [✨ Request Feature](../../issues)

</div>

---

## 📖 Table of Contents

- [About the Project](#-about-the-project)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Usage](#-usage)
- [Extension Setup](#-chrome-extension-setup)
- [API Reference](#-api-reference)
- [Screenshots](#-screenshots)
- [Contributing](#-contributing)
- [License](#-license)
- [Author](#-author)

---

## 🎯 About the Project

**CodePrep** is a three-part system:

| Part | Description |
|------|-------------|
| 🖥️ **Frontend** | React + Vite dashboard to browse company questions, DSA roadmaps, and challenge progress |
| ⚙️ **Backend** | Express + MongoDB REST API for auth, submissions, GitHub sync, and GV Challenge tracking |
| 🔌 **Chrome Extension** | MV3 content script that detects `Accepted` submissions on LeetCode and auto-syncs solutions to GitHub |

The three parts communicate in real time: solve a problem on LeetCode → extension detects acceptance → backend auto-pushes code to your GitHub → dashboard updates instantly via `BroadcastChannel`.

---

## ✨ Features

### 🏢 Company Question Tracker
- Browse LeetCode questions filtered by top tech companies (Google, Amazon, Meta, etc.)
- Track which questions you have solved per company context
- Submission history with timestamps and code snapshots

### 🗺️ DSA Pattern Roadmap
- Structured roadmap of DSA patterns (Arrays, Linked Lists, Trees, DP, Graphs, etc.)
- Per-pattern question lists with difficulty badges and acceptance rates
- Visual progress rings and completion percentages

### 🏆 G. Vishwanathan 86-Day Challenge
- Day-by-day structured 86-problem challenge
- Streak tracking, completion stats, and an animated hero card for today's problem
- "Already Solved" button for manual marking

### 🤖 Auto GitHub Sync
- Chrome extension auto-detects `Accepted` LeetCode submissions
- Context-aware routing: `gv_day1`, `company_google`, `pattern_two_pointers`, `general`
- Pushes solution files directly to your connected GitHub repo via the backend

### 👤 GitHub Profile Page
- Visual GitHub contribution graph
- Repository stats and linked solve history

### 🔐 Authentication
- JWT-based authentication with Firebase OAuth support
- Onboarding flow with GitHub account linking

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| React 18 + Vite | UI framework & dev server |
| React Router v6 | Client-side routing |
| Redux Toolkit | Global auth state |
| TanStack Query (React Query) | Server state & caching |
| Framer Motion | Animations & transitions |
| Tailwind CSS | Utility-first styling |
| Firebase SDK | Google OAuth |

### Backend
| Technology | Purpose |
|---|---|
| Node.js >= 18 | Runtime |
| Express.js 4 | REST API framework |
| MongoDB + Mongoose | Database & ODM |
| JWT + bcryptjs | Authentication |
| Firebase Admin SDK | Token verification |
| Socket.IO | Real-time events |
| node-cron | Scheduled jobs |
| axios | HTTP client for GitHub API |

### Chrome Extension
| Technology | Purpose |
|---|---|
| Manifest V3 | Extension platform |
| Content Scripts | LeetCode DOM monitoring |
| Service Worker (background.js) | Background sync |
| Chrome Storage API | Local problem metadata |
| BroadcastChannel API | Frontend sync bridge |

---

## 📁 Project Structure

```
CodePrep/
├── package.json              # Root — runs frontend + backend concurrently
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # Routes & BroadcastChannel sync listener
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   ├── Login.jsx / Register.jsx
│   │   │   ├── Onboarding.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── CompanyPage.jsx
│   │   │   ├── GitHubProfilePage.jsx
│   │   │   └── dashboard/
│   │   │       ├── DSAPractice.jsx
│   │   │       ├── GVChallenge.jsx       # 86-day challenge
│   │   │       ├── RoadmapList.jsx
│   │   │       ├── RoadmapPatternDetail.jsx
│   │   │       ├── TopicQuestions.jsx
│   │   │       └── History.jsx
│   │   ├── components/
│   │   ├── store/               # Redux (authSlice)
│   │   ├── api/                 # Axios client
│   │   └── firebase/            # Firebase config
│   └── vite.config.js
│
├── backend/
│   └── src/
│       ├── index.js             # Entry point
│       ├── routes/
│       │   ├── auth.js
│       │   ├── companies.js
│       │   ├── extension.js     # Auto-sync endpoint
│       │   ├── gvchallenge.js
│       │   ├── questions.js
│       │   ├── roadmap.js
│       │   ├── submissions.js
│       │   └── user.js
│       ├── models/
│       │   ├── User.js
│       │   ├── Question.js
│       │   ├── CompanyQuestion.js
│       │   ├── Submission.js
│       │   ├── ExtensionSubmission.js
│       │   ├── GVChallenge.js
│       │   └── RoadmapPattern.js
│       ├── controllers/
│       ├── middleware/
│       ├── services/            # GitHub sync service
│       └── config/
│
└── extension/
    ├── manifest.json            # MV3 manifest
    ├── content.js               # LeetCode page detector
    ├── background.js            # Service worker (GitHub sync)
    ├── contentCodePrep.js       # Dashboard sync bridge
    ├── config.js                # API base URL config
    ├── popup.html / popup.js    # Extension popup UI
    └── pageBridge.js
```

---

## ✅ Prerequisites

Make sure you have the following installed:

- **Node.js** >= 18.0.0 → [Download](https://nodejs.org/)
- **npm** >= 9 (comes with Node.js)
- **MongoDB** (local or [MongoDB Atlas](https://www.mongodb.com/atlas))
- **Google Chrome** (for the extension)
- A **GitHub account** + Personal Access Token with `repo` scope
- A **Firebase project** (for Google OAuth)

---

## ⚙️ Installation

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/codeprep.git
cd codeprep
```

### 2. Install All Dependencies

```bash
npm run install-all
```

This installs dependencies for both `backend/` and `frontend/` simultaneously.

### 3. Configure Backend Environment

Create a `.env` file inside the `backend/` folder:

```env
# Server
PORT=5000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/codeprep

# JWT
JWT_SECRET=your_super_secret_jwt_key

# Firebase Admin SDK
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your_project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# GitHub OAuth / API
GITHUB_CLIENT_ID=your_github_oauth_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_client_secret
```

### 4. Configure Frontend Environment

Create a `.env` file inside the `frontend/` folder:

```env
VITE_API_BASE_URL=http://localhost:5000
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 5. Seed the Database (Optional)

```bash
npm run seed
```

---

## 🚀 Usage

### Run Both Frontend & Backend Together

```bash
# From the project root
npm run dev
```

This starts:
- **Backend** at `http://localhost:5000`
- **Frontend** at `http://localhost:5173`

### Run Individually

```bash
# Backend only
cd backend && npm run dev

# Frontend only
cd frontend && npm run dev
```

### Open the App

1. Navigate to [http://localhost:5173](http://localhost:5173)
2. **Register** or **Login** (Google OAuth supported)
3. Complete **Onboarding** — link your GitHub account
4. Browse **Company Questions**, the **DSA Roadmap**, or the **GV 86-Day Challenge**
5. Install the **Chrome Extension** to enable auto-sync

---

## 🔌 Chrome Extension Setup

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer Mode** (toggle in top-right)
3. Click **Load Unpacked**
4. Select the `extension/` folder from this project
5. The **LeetCode Tracker Companion** will appear in your toolbar
6. Click the icon → **Log In** with your CodePrep credentials

Once set up, the extension will:
- 🟢 Detect accepted LeetCode submissions automatically
- 📝 Read context params from the URL (`?challenge=gv&day=1`, `?pattern=two_pointers`, etc.)
- 🔄 Push your solution to GitHub via the backend
- 📡 Notify the dashboard in real time via `BroadcastChannel`

---

## 📡 API Reference

All endpoints are prefixed with `/api`.

### 🔐 Auth — `/api/auth`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Login with email & password |
| `POST` | `/api/auth/firebase` | Login / register via Firebase token |
| `GET` | `/api/auth/me` | Get current user profile |
| `PUT` | `/api/auth/onboarding` | Complete onboarding |

### 🏢 Companies — `/api/companies`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/companies` | List all companies |
| `GET` | `/api/companies/:name` | Get questions for a company |

### 📚 Questions — `/api/questions`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/questions` | List all questions |
| `GET` | `/api/questions/topic/:topicName` | Questions by DSA topic/pattern |

### 🗺️ Roadmap — `/api/roadmap`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/roadmap` | List all roadmap patterns |
| `GET` | `/api/roadmap/patterns` | All patterns with metadata |
| `GET` | `/api/roadmap/patterns/:category/:pattern/questions` | Questions for a specific pattern |
| `GET` | `/api/roadmap/:patternId` | Pattern detail with solved flags |

### 🏆 GV Challenge — `/api/gvchallenge`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/gvchallenge/today` | Today's challenge question |
| `GET` | `/api/gvchallenge/progress` | User's progress & streak |
| `POST` | `/api/gvchallenge/mark-solved` | Mark a day as solved manually |

### 🤖 Extension Sync — `/api/extension`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/extension/sync` | Auto-sync accepted submission from extension |
| `GET` | `/api/extension/status/:problemKey` | Get sync status for a problem |

### 👤 User — `/api/user`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `PUT` | `/api/user/github` | Link / update GitHub account |
| `GET` | `/api/user/submissions` | Submission history |

---

## 📸 Screenshots

> Add screenshots by placing images in `docs/screenshots/` and updating the paths below.

| Page | Preview |
|------|---------|
| 🏠 Dashboard | `![Dashboard](docs/screenshots/dashboard.png)` |
| 🏆 GV Challenge | `![GV Challenge](docs/screenshots/gvchallenge.png)` |
| 🗺️ DSA Roadmap | `![Roadmap](docs/screenshots/roadmap.png)` |
| 🏢 Company Page | `![Company Page](docs/screenshots/company.png)` |
| 🔌 Extension Popup | `![Extension](docs/screenshots/extension.png)` |

---

## 🤝 Contributing

Contributions are welcome! Here is how to get started:

1. **Fork** the repository
2. **Create** your feature branch:
   ```bash
   git checkout -b feature/your-amazing-feature
   ```
3. **Commit** your changes:
   ```bash
   git commit -m "feat: add amazing feature"
   ```
4. **Push** to your branch:
   ```bash
   git push origin feature/your-amazing-feature
   ```
5. **Open a Pull Request** against the `main` branch

### Guidelines
- Follow existing code style
- Write clear, descriptive commit messages using [Conventional Commits](https://www.conventionalcommits.org/)
- Add comments for non-obvious logic
- Test your changes locally before submitting

### Reporting Bugs
Open an issue and include:
- Steps to reproduce
- Expected vs actual behaviour
- Browser/OS version
- Console logs or screenshots

---

## 📄 License

Distributed under the **ISC License**. See `LICENSE` for more information.

---

## 👤 Author

**Shubham Narayan**

- 🌐 GitHub: [@Shubhaam-code](https://github.com/Shubhaam-code)
- 💼 Live: [code-prep-three.vercel.app](https://code-prep-three.vercel.app)

---

<div align="center">

Made with ❤️ for DSA learners everywhere

⭐ **Star this repo** if CodePrep helped you crack your dream company interview!

</div>
