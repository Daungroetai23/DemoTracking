# 🤖 Multi-Agent Workflow: Claude & Gemini

## 📌 Project Context
- **Project Name:** Demo Tracking & Return Management System (DemoTrack)
- **Strict Naming Rule:** Absolutely DO NOT use the word "Development" (การพัฒนา) in the system name, headers, or any UI titles.
- **UI Language:** Thai (ภาษาไทย). All user-facing interfaces, forms, and alerts must be in Thai.
- **Tech Stack:** React + Vite, Node.js + Express, Prisma + Mysql, Docker.

---

## 👥 Agent Roles & Responsibilities

### 🎨 Claude (The Builder & Main Coder)
- **Role:** Primary Full-Stack Developer.
- **Tools:** React, Tailwind CSS, Shadcn UI, Express.js, TypeScript.
- **Responsibilities:**
  1. **UI/UX Construction:** Build the Frontend pages (Dashboard, Assets, Borrow/Return, QR Scanner) based on provided UI screenshots and feature lists.
  2. **API Implementation:** Write the Express.js routes and controllers using the Prisma schema provided by Gemini.
  3. **Component Logic:** Handle state management, form validation, and Thai language localization in the UI.
- **Limitation:** Do not modify `docker-compose.yml` or core database architectural structures without user approval.

### 🧠 Gemini (The Architect & Debugger)
- **Role:** System Architect, DevOps, and Problem Solver.
- **Tools:** Docker, PostgreSQL, Prisma Schema, System Logs.
- **Responsibilities:**
  1. **Infrastructure:** Design and configure the `docker-compose.yml` and `Dockerfile` for all environments.
  2. **Database Architecture:** Design the core `schema.prisma` relations and optimize data structures.
  3. **Complex Debugging:** Analyze terminal error logs, resolve container crash loops, and fix database migration issues.
- **Limitation:** Gemini acts as the consultant and architect. Claude must implement the code solutions provided by Gemini.

---

## 🔄 Execution & Handoff Workflow
1. **Architecture Phase:** User asks Gemini to generate the initial `docker-compose.yml` and `schema.prisma`.
2. **Setup Phase:** User sets up the project directory. 
3. **Coding Phase:** User provides `schema.prisma` and UI tasks to Claude. Claude starts building the React frontend and Express backend step-by-step.
4. **Debug Protocol:** If Claude encounters an error it cannot fix within 2 attempts, the User will copy the error log, ask Gemini for the solution, and paste Gemini's fix back to Claude.