# 🎙️ INTRVW.AI — AI-Powered Interview Coach

> *Voice-first mock interviews for college students, powered by Gemini 2.5 Flash*

```
██╗███╗   ██╗████████╗██████╗ ██╗    ██╗    ██╗    █████╗ ██╗
██║████╗  ██║╚══██╔══╝██╔══██╗██║    ██║   ██╔╝   ██╔══██╗██║
██║██╔██╗ ██║   ██║   ██████╔╝██║ █╗ ██║  ██╔╝    ███████║██║
██║██║╚██╗██║   ██║   ██╔══██╗██║███╗██║ ██╔╝     ██╔══██║██║
██║██║ ╚████║   ██║   ██║  ██║╚███╔███╔╝██╔╝      ██║  ██║██║
╚═╝╚═╝  ╚═══╝   ╚═╝   ╚═╝  ╚═╝ ╚══╝╚══╝ ╚═╝       ╚═╝  ╚═╝╚═╝
```

---

## ✨ What is this?

**INTRVW.AI** is a fully voice-interactive mock interview web app for college students.  
You pick your interview type, the AI asks questions out loud, you answer with your voice,  
and at the end you get a detailed performance report — downloadable as a PDF. 🎯

---

## 🗂️ Project Structure

```
my_project/
│
├── 📁 frontend/
│   ├── 🌐 index.html       ← All pages (Landing, Setup, Interview, Results)
│   ├── 🎨 style.css        ← Dark/Light theme, full styling
│   ├── ⚙️  script.js        ← Voice recording, TTS, interview logic
│   └── 📄 report.js        ← PDF report generator (jsPDF)
│
└── 📁 backend/
    ├── 🐍 app.py           ← Flask API (question gen + evaluation)
    └── 🔑 .env             ← Your Gemini API key lives here
```

---

## 🚀 Getting Started

### 1. Clone / Download the project

```bash
git clone https://github.com/yourname/intrvw-ai.git
cd intrvw-ai
```

### 2. Set up your API key

Open `backend/.env` and add your key:

```env
GEMNI_API_KEY=your_gemini_api_key_here
```

> 🔑 Get your free key at → [aistudio.google.com](https://aistudio.google.com)

### 3. Install Python dependencies

```bash
pip install flask flask-cors google-generativeai python-dotenv
```

### 4. Start the backend

```bash
cd backend
python app.py
```

You should see:

```
🚀 INTRVW.AI Backend running on http://127.0.0.1:5000
```

### 5. Open the frontend

Just open `frontend/index.html` in your browser:

```bash
# Option A — double click index.html in file explorer
# Option B — open with Live Server in VS Code (recommended)
```

> ⚠️ Use **Chrome** or **Edge** — Safari doesn't fully support the Web Speech API.

---

## 🎤 How It Works

```
[ Student fills setup form ]
          ↓
[ Backend generates questions via Gemini AI ]
          ↓
[ AI speaks each question aloud (Text-to-Speech) ]
          ↓
[ Student answers using microphone (Speech-to-Text) ]
          ↓
[ All answers sent to Gemini for evaluation ]
          ↓
[ Score + Feedback + PDF Report generated ]
```

---

## 🧠 Interview Types

| Type | What it tests |
|------|--------------|
| 🧠 **HR / Behavioral** | Soft skills, teamwork, leadership, STAR scenarios |
| 💻 **Technical** | DSA, OOP, DBMS, OS, networking, problem solving |
| 📚 **Domain-Specific** | Deep questions on any subject you specify |
| ⚡ **General Aptitude** | Logical reasoning, quant, verbal, data interpretation |

---

## 📄 PDF Report Includes

```
Page 1 ── Cover
         • Candidate name, college, degree
         • Interview type & difficulty tags
         • Animated score circle (out of 100)
         • Overall grade (Excellent / Good / Fair / Needs Practice)

Page 2 ── Metrics & Feedback
         • 4 metric bars: Accuracy, Communication, Depth, Confidence
         • Full AI-written feedback paragraph
         • 6 personalized improvement tips

Page 3 ── Q&A Review
         • Every question + your answer
         • Individual score badge per question (color coded)
         • Summary strip at the bottom
```

---

## 🌗 Theme Support

Toggle between **Dark** 🌙 and **Light** ☀️ mode using the button in the top-right corner.  
Your preference is saved automatically in `localStorage`.

---

## 🛠️ Tech Stack

```
Frontend          Backend           AI
─────────         ───────           ──
HTML5             Python 3          Google Gemini 2.5 Flash
CSS3              Flask             Text-to-Speech (Web API)
Vanilla JS        Flask-CORS        Speech Recognition (Web API)
jsPDF             python-dotenv     
Web Speech API    
```

---

## 🔌 API Endpoints

```http
POST /generate-questions
Content-Type: application/json

{
  "interview_type": "hr",
  "difficulty": "medium",
  "num_questions": 5,
  "candidate_name": "Arjun",
  "degree": "B.Tech CS",
  "year": "3rd Year"
}
```

```http
POST /evaluate
Content-Type: application/json

{
  "interview_type": "technical",
  "difficulty": "hard",
  "candidate_name": "Arjun",
  "qa_pairs": [
    { "question": "...", "answer": "..." }
  ]
}
```

```http
GET /health
→ { "status": "ok", "model": "gemini-2.5-flash" }
```

---

## ⚡ Quick Tips

```
✅  Use Chrome or Edge for best voice support
✅  Allow microphone access when the browser asks
✅  Speak clearly and at a natural pace
✅  Click "Replay" if you missed a question
✅  Click "Skip" if you want to pass a question
✅  Download your PDF report after every session
```

---

## 🐛 Known Issues & Fixes

| Issue | Fix |
|-------|-----|
| AI speaks in wrong language | Fixed — `lang = 'en-US'` forced on utterance |
| PDF not downloading | Fixed — replaced `doc.circle()` with `doc.ellipse()` |
| Voice stops mid-sentence | Click replay, or refresh and retry |
| Backend not connecting | Make sure `app.py` is running on port 5000 |

---

## 📦 Dependencies

**Python**
```txt
flask
flask-cors
google-generativeai
python-dotenv
```

**JavaScript** *(loaded via CDN, no install needed)*
```
jsPDF v2.5.1     → PDF generation
Google Fonts     → Cormorant Garamond, DM Mono, Outfit
Web Speech API   → Built into Chrome/Edge (no install)
```

---

## 🙌 Made with

```
💚  Gemini 2.5 Flash API
🎨  Vanilla CSS (dark editorial aesthetic)
🎙️  Web Speech API (zero dependencies for voice!)
📄  jsPDF (client-side PDF, no backend needed)
☕  A lot of coffee
```

---

## 📜 License

```
MIT License — feel free to use, modify, and build on this!
```

---

<div align="center">

**Built for college students, by someone who hated bombing interviews. 🎓**

*Star ⭐ the repo if this helped you prep!*

</div>