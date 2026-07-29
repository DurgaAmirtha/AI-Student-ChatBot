# AI Student Super Assistant 🚀

A complete, working full-stack student assistant built using **FastAPI**, **React**, **Tailwind CSS**, **SQLite (SQLAlchemy)**, **Google Gemini API**, and **PDF RAG (Retrieval-Augmented Generation)**.

Designed for technical, coding, and academic student placement preparation with strict user data isolation and modern UI aesthetics.

---

## 🌟 Key Features

### 1. 🔒 Secure Authentication & Data Isolation
- User registration with email validation and password confirmation.
- Secure password hashing using `bcrypt`.
- JWT token session management (`HS256`).
- Protected frontend routes and session persistence in `localStorage`.
- **Strict User Data Isolation**: Every database query guarantees that students can only access their own uploaded notes, chat history, quiz attempts, and weak topic analytics.

### 2. 📚 Saved Notes & PDF Chat using RAG (Retrieval-Augmented Generation)
- PDF upload with validation (up to 15MB limit).
- Files saved securely on disk with unique UUID filenames.
- Document status tracking (`processing`, `ready`, `failed`).
- PDF text extraction and chunking (~900 characters with 150-char overlap).
- **Gemini Embeddings + Cosine Similarity**: Vector search retrieves top relevant context chunks.
- Answers are strictly grounded in uploaded notes with source citations: `[Document: OS_Notes.pdf, Page 4]`.
- States clearly when an answer is not present in the uploaded notes.
- Note deletion removes the physical PDF file, text chunks, and database metadata after confirmation.

### 3. 💬 AI Study Chat
- Technical, coding, and academic doubt solving powered by Google Gemini.
- **Java Default**: Gemini is instructed to use **Java** as the default programming language for coding solutions and examples.
- **3 Specialized Modes**:
  - **Study Assistant**: Concept breakdowns, step-by-step academic explanations.
  - **Placement Preparation**: Data Structures & Algorithms in Java, Core CS fundamentals (OS, DBMS, CN, OOPs).
  - **Interview Practice**: Mock technical & HR questions, STAR method feedback.
- Conversation history saved per user in SQLite database.

### 4. 🧠 Smart Quiz Generator
- Generate multiple-choice practice quizzes (MCQs) from:
  - An uploaded PDF document notes.
  - Any target CS topic (e.g., "Java Collections", "Operating Systems", "SQL").
- Adjustable difficulty levels: **Easy**, **Medium**, **Hard**.
- Interactive solver with instant answer checking and detailed explanations for each question.
- Saved quiz attempt history and performance scoring.

### 5. 📈 Weak Topic Tracker & Analytics
- Automatically analyzes incorrect quiz answers.
- Identifies weak topics where accuracy falls below 75%.
- Displays accuracy progress bars and recommended revision topics on the student dashboard.

---

## 🏗️ Project Architecture

```
Student AI ChatBot/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI app, routers, CORS & static mounting
│   │   ├── config.py            # Environment configuration
│   │   ├── database.py          # SQLAlchemy engine & session setup
│   │   ├── models.py            # ORM Database Models (User, Document, Chunk, Chat, Quiz, WeakTopic)
│   │   ├── schemas.py           # Pydantic Request/Response schemas
│   │   ├── auth.py              # JWT authentication & Bcrypt password hashing
│   │   ├── gemini.py            # Google Gemini AI prompts & Quiz generator
│   │   ├── rag.py               # PyPDF text extraction, chunking & vector search
│   │   └── routes/
│   │       ├── auth.py          # /api/auth endpoints
│   │       ├── documents.py     # /api/documents endpoints (Upload, Delete, Rename, RAG Chat)
│   │       ├── chat.py          # /api/chat endpoints (Conversations, Messages)
│   │       ├── quiz.py          # /api/quiz endpoints (Generate, Submit, History)
│   │       └── analytics.py     # /api/analytics endpoints (Dashboard & Weak Topics)
│   ├── uploads/                 # Storage directory for uploaded PDF notes
│   └── test_backend.py          # Backend test suite
├── frontend/
│   ├── src/
│   │   ├── components/          # Sidebar, Navbar, ConfirmModal, LoadingSpinner, EmptyState
│   │   ├── context/             # AuthContext provider
│   │   ├── pages/               # Login, Signup, Dashboard, StudyChat, NotesChat, QuizPage, ProgressPage
│   │   ├── services/            # API client with JWT interceptor
│   │   ├── App.jsx              # React Router & protected routes
│   │   └── index.css            # Tailwind CSS design system
│   ├── package.json
│   └── vite.config.js
├── .env.example                 # Environment variables template
├── .gitignore
├── main.py                      # Root launcher script
├── requirements.txt             # Python backend dependencies
└── README.md
```

---

## ⚡ Quick Setup & Running Instructions

### 1. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in your Google Gemini API Key in `.env`:
```env
GEMINI_API_KEY=your_google_gemini_api_key_here
JWT_SECRET=super_secret_jwt_key_change_in_production_123456789
```

### 2. Backend Setup (Python)
Install dependencies:
```bash
pip install -r requirements.txt
```

Run backend tests:
```bash
python backend/test_backend.py
```

### 3. Frontend Setup (React & Vite)
Install npm dependencies:
```bash
cd frontend
npm install
npm run build
cd ..
```

### 4. Launching the Application
Run the root server:
```bash
python main.py
```
Open your browser and navigate to:
👉 **`http://127.0.0.1:8000`**

---

## 🛠️ Built With
- **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons, React Router
- **Backend**: FastAPI, Uvicorn, SQLAlchemy, Pydantic, Python-JOSE, Bcrypt
- **Database**: SQLite
- **AI & RAG**: Google Gemini API (`gemini-2.5-flash`), PyPDF, Scikit-Learn Cosine Similarity
