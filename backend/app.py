"""
INTRVW.AI — Backend (app.py)
Flask + Gemini 2.5 Flash API
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
import os
import json
import re
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

# Configure Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")  # matches your .env key name
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY not found in .env file")

genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel("gemini-2.5-flash")


# ──────────────────────────────────────────────
#  QUESTION GENERATION
# ──────────────────────────────────────────────

INTERVIEW_CONTEXT = {
    "hr": "HR and Behavioral interview. Focus on soft skills, teamwork, leadership, conflict resolution, adaptability, communication, and STAR-method scenarios (Situation, Task, Action, Result).",
    "technical": "Technical interview for a Computer Science / Engineering student. Focus on data structures, algorithms, object-oriented programming, system design (basic), DBMS, OS concepts, networking basics, and coding problem solving.",
    "domain": "Domain-specific technical interview based on the student's specified subject. Ask deep, conceptual, and applied questions that test real understanding of the topic.",
    "aptitude": "General Aptitude interview. Include logical reasoning, quantitative aptitude (percentages, time-work, ratios), verbal reasoning, data interpretation, and analytical thinking questions.",
}

DIFFICULTY_GUIDE = {
    "easy": "beginner-friendly, conceptual, foundational questions suitable for first or second year students",
    "medium": "intermediate level questions requiring some depth, application of concepts, and basic problem solving",
    "hard": "advanced questions requiring strong understanding, edge cases, system-level thinking, and competitive exam level difficulty",
}


@app.route("/generate-questions", methods=["POST"])
def generate_questions():
    data = request.json
    interview_type = data.get("interview_type", "hr")
    difficulty = data.get("difficulty", "medium")
    domain = data.get("domain", "")
    num_questions = data.get("num_questions", 5)
    candidate_name = data.get("candidate_name", "the candidate")
    degree = data.get("degree", "")
    year = data.get("year", "")

    context = INTERVIEW_CONTEXT.get(interview_type, INTERVIEW_CONTEXT["hr"])
    if interview_type == "domain" and domain:
        context = f"Domain-specific interview on the subject: **{domain}**. {context}"

    diff_guide = DIFFICULTY_GUIDE.get(difficulty, DIFFICULTY_GUIDE["medium"])
    background = f"{degree} {year}".strip() if degree else "college student"

    prompt = f"""You are a professional interviewer conducting a {interview_type.upper()} interview for a college student.

Candidate Profile:
- Name: {candidate_name}
- Background: {background}
- Interview Type: {context}
- Difficulty: {diff_guide}

Generate exactly {num_questions} high-quality interview questions.

Requirements:
- Questions must be clear, specific, and directly relevant to the interview type
- Difficulty must match: {diff_guide}
- Questions should be varied — mix of conceptual, applied, and situational
- Do NOT number the questions
- Return ONLY a valid JSON array of strings (the questions), nothing else
- No preamble, no explanation, no markdown — just the raw JSON array

Example format:
["Question one here?", "Question two here?", "Question three here?"]
"""

    try:
        response = model.generate_content(prompt)
        raw = response.text.strip()

        # Clean markdown code blocks if present
        raw = re.sub(r"```(?:json)?", "", raw).strip().rstrip("`").strip()

        questions = json.loads(raw)
        if not isinstance(questions, list):
            raise ValueError("Response is not a list")
        questions = [str(q) for q in questions][:num_questions]

        return jsonify({"questions": questions, "count": len(questions)})

    except Exception as e:
        print(f"Error generating questions: {e}")
        # Fallback questions
        fallback = get_fallback_questions(interview_type, num_questions)
        return jsonify({"questions": fallback, "count": len(fallback)})


# ──────────────────────────────────────────────
#  EVALUATION
# ──────────────────────────────────────────────

@app.route("/evaluate", methods=["POST"])
def evaluate():
    data = request.json
    interview_type = data.get("interview_type", "hr")
    difficulty = data.get("difficulty", "medium")
    candidate_name = data.get("candidate_name", "the candidate")
    qa_pairs = data.get("qa_pairs", [])

    if not qa_pairs:
        return jsonify({"error": "No Q&A pairs provided"}), 400

    # Build Q&A text
    qa_text = ""
    for i, qa in enumerate(qa_pairs, 1):
        q = qa.get("question", "")
        a = qa.get("answer", "[No answer provided]")
        qa_text += f"Q{i}: {q}\nA{i}: {a}\n\n"

    prompt = f"""You are an expert interview evaluator. Evaluate the following interview responses.

Candidate: {candidate_name}
Interview Type: {interview_type.upper()}
Difficulty: {difficulty}

--- INTERVIEW TRANSCRIPT ---
{qa_text}
---

Evaluate comprehensively and return ONLY a valid JSON object (no markdown, no explanation) with this exact structure:

{{
  "overall_score": <integer 0-100>,
  "accuracy": <integer 1-10>,
  "communication": <integer 1-10>,
  "depth": <integer 1-10>,
  "confidence": <integer 1-10>,
  "feedback": "<multi-paragraph detailed feedback covering: strengths, areas for improvement, specific suggestions, and encouragement. Use plain text, no markdown.>",
  "question_scores": [<score 1-10 for each answer in order>]
}}

Scoring guide:
- accuracy: correctness and relevance of answers
- communication: clarity, structure, articulation
- depth: thoroughness, examples, elaboration
- confidence: tone, decisiveness, self-assurance
- overall_score: weighted composite (accuracy 35%, communication 25%, depth 25%, confidence 15%)

Be honest but constructive. Skipped questions score 0.
"""

    try:
        response = model.generate_content(prompt)
        raw = response.text.strip()
        raw = re.sub(r"```(?:json)?", "", raw).strip().rstrip("`").strip()
        result = json.loads(raw)
        return jsonify(result)

    except Exception as e:
        print(f"Error evaluating: {e}")
        return jsonify({
            "overall_score": 60,
            "accuracy": 6,
            "communication": 6,
            "depth": 6,
            "confidence": 6,
            "feedback": "Evaluation could not be completed due to a technical error. Please try again.",
            "question_scores": [6] * len(qa_pairs),
        })


# ──────────────────────────────────────────────
#  FALLBACK QUESTIONS
# ──────────────────────────────────────────────

def get_fallback_questions(interview_type, n):
    banks = {
        "hr": [
            "Tell me about yourself and your academic background.",
            "Describe a time when you worked in a team to solve a difficult problem. What was your role?",
            "What is your greatest strength, and how has it helped you in college?",
            "Tell me about a situation where you had to meet a tight deadline. How did you handle it?",
            "Where do you see yourself professionally five years from now?",
            "Describe a time you received critical feedback. How did you respond?",
            "What motivates you to perform your best?",
            "Tell me about a failure you experienced and what you learned from it.",
        ],
        "technical": [
            "Explain the difference between a stack and a queue with real-world examples.",
            "What is time complexity? Explain O(n log n) with an example.",
            "What is object-oriented programming? Explain the four pillars.",
            "What is a primary key vs foreign key in a relational database?",
            "Explain the concept of deadlock in operating systems.",
            "What is the difference between TCP and UDP?",
            "Explain binary search and its time complexity.",
            "What is a hash table and how does collision handling work?",
        ],
        "domain": [
            "What is the core concept you consider most fundamental in your subject?",
            "Explain a real-world application of what you have studied in this domain.",
            "What is the most challenging topic in your subject and how have you approached it?",
            "How do theoretical concepts in your subject translate to practical scenarios?",
            "What recent developments or trends are happening in this domain?",
        ],
        "aptitude": [
            "If a train travels 120 km in 2 hours, what is its average speed? Can it cover 300 km in 5 hours at the same speed?",
            "What comes next in the series: 2, 6, 12, 20, 30, ?",
            "A is older than B. B is older than C. C is younger than D. Who is the oldest if A is older than D?",
            "If 15 workers can build a wall in 10 days, how many workers are needed to build it in 6 days?",
            "Find the odd one out: Cat, Dog, Fish, Parrot, Stone",
        ],
    }
    pool = banks.get(interview_type, banks["hr"])
    return pool[:n]


# ──────────────────────────────────────────────
#  HEALTH CHECK
# ──────────────────────────────────────────────

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "model": "gemini-2.5-flash"})


if __name__ == "__main__":
    print("🚀 INTRVW.AI Backend running on http://127.0.0.1:5000")
    app.run(debug=True, host="0.0.0.0", port=5000)