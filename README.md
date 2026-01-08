# LeetCode LinkedIn Prep

A specialized interview preparation platform focusing on high-frequency LinkedIn questions, built with a modern local-first stack.

## Features

- 🎯 **Targets 109 LinkedIn-Specific Questions**: Curated list from `linkedin-questions` repository.
- 💻 **Monaco Code Editor**: Full-featured code editor with syntax highlighting for Python and JavaScript.
- ⚖️ **Local Judge System**: Executes code securely using Piston (runs via Docker).
- 🧠 **Spaced Repetition System**: Tracks concept mastery and schedules reviews.
- 🤖 **AI Coach**: 
  - Context-aware chatbot (Qwen 2.5 Coder via OpenRouter).
  - Provides hints, explains solutions, and debugs code.
  - **Streaming Responses** for realtime interaction.
- 📚 **Solutions Tab**: Displays detailed solution explanations and reference code (Python).

## 🏗️ Project Architecture

This application follows a **Local-First, Privacy-Focused** architecture designed for low latency and offline-capability (where possible).

```mermaid
graph TD
    User[User] --> UI[Next.js Frontend]
    
    subgraph "Application Layer (Next.js)"
        UI --> API[API Routes]
        UI --> Editor[Monaco Editor]
        UI --> AIChat[AI Chat Interface]
    end
    
    subgraph "Data Layer"
        API --> Prisma[Prisma ORM]
        Prisma --> DB[(PostgreSQL)]
        ETL[ETL Script] -->|Seeds| DB
        RawData[Markdown Questions] -.->|Parsed by| ETL
    end
    
    subgraph "Services"
        API -->|Code Execution| Judge[Judge Service]
        Judge -->|Docker| Piston[Piston Engine]
        AIChat -->|Streaming| OpenRouter[OpenRouter API]
    end
```

### Data Flow & Key Components

1.  **Ingestion Pipeline (ETL)**
    -   **Source**: Raw Markdown files in `linkedin-questions/`.
    -   **Process**: The `seed-db` script parses these files, extracting metadata, problem descriptions, sample test cases, and **Reference Solutions** (Python).
    -   **Storage**: Structured data is stored in PostgreSQL via Prisma.

2.  **Code Execution Engine (The Judge)**
    -   When a user clicks "Run" or "Submit", code is sent to the backend `Judge Service`.
    -   The service wraps the user's code with a test runner (handling inputs/outputs).
    -   **Piston** (running in a Docker container) executes the code securely in an isolated environment.
    -   Results (Stdout/Stderr) are parsed and compared against expected outputs.

3.  **AI Coach (Context-Aware LLM)**
    -   **Context Injection**: The system captures the User's Code, the Problem Description, and the hidden Reference Solution.
    -   **Prompt Engineering**: A system prompt guides the AI to be a "Socratic Tutor"—providing hints rather than answers.
    -   **Streaming**: Responses are streamed via `ReadableStream` to the frontend for a realtime chat experience.

4.  **Study Loop (Spaced Repetition)**
    -   The system tracks "Confidence" scores for each problem.
    -   A "Study Plan" algorithm recommends problems based on past performance and time elapsed since last review.

## Tech Stack Details


### Prerequisites

- Node.js 18+ & pnpm
- Docker & Docker Compose

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/dhanujdev/leetcode-linkedin.git
    cd leetcode-linkedin/web
    ```

2.  **Start Infrastructure (Postgres + Piston):**
    ```bash
    docker-compose up -d
    ```

3.  **Install Dependencies:**
    ```bash
    pnpm install
    ```

4.  **Setup Environment:**
    - Create a `.env` file in `web/`:
      ```env
      DATABASE_URL="postgresql://postgres:password@localhost:5432/postgres"
      OPENROUTER_API_KEY="sk-or-your-key-here"
      ```

5.  **Initialize Database:**
    ```bash
    npx prisma migrate dev
    npx tsx scripts/seed-db.ts  # Seeding logic (ensure questions are properly loaded)
    ```

6.  **Run Development Server:**
    ```bash
    pnpm dev
    ```
    Open [http://localhost:3000](http://localhost:3000) (or 3001 if port taken).

## Project Structure

- `src/app`: Next.js App Router pages.
- `src/lib`: Utilities (DB, LLM client, Piston client).
- `scripts`: Maintenance and Seed scripts.
- `prisma`: Database schema and migrations.
- `linkedin-questions`: Source data for questions (Markdown files).
