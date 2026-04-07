# 🏎️ CodePrix: The Apex Code Arena

[![React](https://img.shields.io/badge/React-18.x-blue?style=for-the-badge&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-Backend-green?style=for-the-badge&logo=nodedotjs)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Database-green?style=for-the-badge&logo=mongodb)](https://www.mongodb.com/)
[![Docker](https://img.shields.io/badge/Docker-Sandboxing-blue?style=for-the-badge&logo=docker)](https://www.docker.com/)

> **Code like you're racing for pole position!** 🏁  
> CodePrix is a high-octane, racing-themed competitive programming platform. It features live coding contests, an isolated remote code execution engine, real-time leaderboards, and an AI assistant to help you debug perfectly through the chicanes.

---

## ✨ Key Features

* 🏁 **Live Contests (Races):** Participate in timed, multiplayer coding competitions with real-time WebSocket leaderboards.
* 🤖 **Pit Crew AI:** A context-aware AI assistant (powered by Groq) that sees your code and gives you hints without spoiling the solution.
* ⚡ **AlgoForge Judge Engine:** A secure, robust, Dockerized execution engine supporting **C++, Python, Java, and JavaScript**. Features generic test harnesses and limits for Time/Memory configurations.
* 🏎️ **Telemetry Dashboard:** Track your performance with visual gauges, submission heatmaps, and target goals.
* 🎨 **Immersive Racing UI:** A beautiful, neo-brutalist theme built using React, Tailwind CSS, shadcn-ui, and Framer Motion. 

---

## 🏗️ Project Architecture

CodePrix is built using a microservice-oriented architecture to ensure scalability and reliability during intense coding races:

* `client/apex-code-arena/`: The React+Vite frontend SPA.
* `server/`: The main Express API gateway handling user auth, problems, and submission proxying.
* `judge-main/` *(AlgoForge Judge)*: The core code execution engine utilizing Docker and BullMQ for secure, queued, sandboxed evaluations.
* `leaderboard-main/`: A dedicated WebSocket service managing live rank lists during active contests.

---

## 💻 Tech Stack

**Frontend:**
* React (Vite)
* TypeScript
* Tailwind CSS
* Framer Motion (Animations)
* shadcn/ui

**Backend & Microservices:**
* Node.js & Express
* MongoDB & Mongoose
* Socket.io (Real-time leaderboards)
* BullMQ & Redis (Job queues for code execution)
* Docker & Dockerode (Sandboxing unsafe code limit environments)
* Groq LLM API (Pit Crew AI)

---

## 🚀 Getting Started

### Prerequisites
* **Node.js** (v18+)
* **MongoDB** (Local or Atlas URL)
* **Docker** (Must be running for the Judge container sandboxing)
* **Redis** (For BullMQ Judge Queue)

### 1. Clone the repository
```bash
git clone https://github.com/4bdu114h/CodePrix.git
cd CodePrix
```

### 2. Environment Setup

You need to set up `.env` files in multiple directories.

**Main Server (`server/.env`):**
```env
PORT=8000
MONGO_URI=mongodb://localhost:27017/codeprix
JWT_SECRET=your_super_secret_jwt_key
LEADERBOARD_URL=http://localhost:5001
JUDGE_URL=http://localhost:3000
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=admin_password
```

**Judge Service (`judge-main/.env`):**
```env
PORT=3000
REDIS_URL=redis://localhost:6379
```

**Client (`client/apex-code-arena/.env.local`):**
```env
VITE_GROQ_API_KEY=your_groq_api_key
```

*(Note: Never commit your real `.env` files to the repository)*

### 3. Install Dependencies & Start Services

You will need multiple terminal windows (or you can use PM2).

**Start the Main Server:**
```bash
cd server
npm install
npm run seed:problems # Optional: Seeds the database with mock racing problems
npm start
```

**Start the Judge Service:**
```bash
cd judge-main
npm install
npm run dev
```

**Start the Leaderboard Service:**
```bash
cd leaderboard-main
npm install
npm start
```

**Start the Client:**
```bash
cd client/apex-code-arena
npm install
npm run dev
```

---

## 🚦 Usage

1. Open your browser and navigate to `http://localhost:8080` (or whichever port Vite assigned).
2. Create an account and sign in.
3. Head to the **Problems** section or join an upcoming **Contest**.
4. Write your solution in the code editor, test it with **Run**, and hit **Submit** to send it to the AlgoForge Judge.
5. If you hit a roadblock, click the **Pit Crew AI** button for debugging assistance!

---

## 📄 License

This project is licensed under the ISC License. See the [LICENSE](LICENSE) file for more details.

---
*Created with ❤️ by the CodePrix Team.*