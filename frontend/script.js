// ===========================
//  INTRVW.AI — SCRIPT.JS
// ===========================

// ===== THEME TOGGLE =====
(function initTheme() {
  const saved = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  // Update button icon after DOM loads
  window.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('theme-toggle-btn');
    if (btn) btn.textContent = saved === 'dark' ? '☀️' : '🌙';
  });
})();

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  const btn = document.getElementById('theme-toggle-btn');
  if (btn) btn.textContent = next === 'dark' ? '☀️' : '🌙';
}

const API_BASE = 'http://127.0.0.1:5000';

// ===== STATE =====
const state = {
  name: '', college: '', degree: '', year: '',
  interviewType: '', difficulty: 'easy', domain: '',
  numQuestions: 5,
  questions: [],
  currentQ: 0,
  answers: [],
  isRecording: false,
  isSpeaking: false,
  sessionStart: null,
  timerInterval: null,
  recognition: null,
  currentTranscript: '',
  results: null,
};

// ===== PAGE NAVIGATION =====
function goTo(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(pageId).classList.add('active');
  window.scrollTo(0, 0);
}

function goToSetup() { goTo('page-setup'); }

// ===== STEP NAVIGATION =====
function nextStep(num) {
  if (num === 2 && !validateStep1()) return;
  if (num === 3 && !validateStep2()) return;
  if (num === 3) buildReview();

  document.querySelectorAll('.setup-step').forEach(s => s.classList.remove('active'));
  document.getElementById(`setup-step-${num}`).classList.add('active');

  document.querySelectorAll('.step').forEach((s, i) => {
    s.classList.remove('active', 'done');
    if (i + 1 < num) s.classList.add('done');
    if (i + 1 === num) s.classList.add('active');
  });
}

function validateStep1() {
  const name = document.getElementById('input-name').value.trim();
  const college = document.getElementById('input-college').value.trim();
  if (!name) { alert('Please enter your name.'); return false; }
  if (!college) { alert('Please enter your college.'); return false; }
  state.name = name;
  state.college = college;
  state.degree = document.getElementById('input-degree').value.trim();
  state.year = document.getElementById('input-year').value;
  return true;
}

function validateStep2() {
  if (!state.interviewType) { alert('Please select an interview type.'); return false; }
  if (state.interviewType === 'domain') {
    const domain = document.getElementById('input-domain').value.trim();
    if (!domain) { alert('Please specify your domain/subject.'); return false; }
    state.domain = domain;
  }
  return true;
}

// ===== TYPE / DIFFICULTY / Q SELECTION =====
function selectType(el) {
  document.querySelectorAll('.type-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  state.interviewType = el.dataset.type;
  const domainField = document.getElementById('domain-field');
  domainField.style.display = state.interviewType === 'domain' ? 'block' : 'none';
}

function selectDiff(el) {
  document.querySelectorAll('.diff-btn[data-diff]').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  state.difficulty = el.dataset.diff;
}

function selectQ(el) {
  document.querySelectorAll('.diff-btn[data-q]').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  state.numQuestions = parseInt(el.dataset.q);
}

// ===== REVIEW =====
function buildReview() {
  const typeLabels = {
    hr: 'HR / Behavioral',
    technical: 'Technical',
    domain: `Domain-Specific (${state.domain})`,
    aptitude: 'General Aptitude'
  };

  const html = `
    <div class="review-item"><span class="review-key">Name</span><span class="review-val">${state.name}</span></div>
    <div class="review-item"><span class="review-key">College</span><span class="review-val">${state.college}</span></div>
    ${state.degree ? `<div class="review-item"><span class="review-key">Degree</span><span class="review-val">${state.degree} ${state.year}</span></div>` : ''}
    <div class="review-item"><span class="review-key">Interview Type</span><span class="review-val">${typeLabels[state.interviewType]}</span></div>
    <div class="review-item"><span class="review-key">Difficulty</span><span class="review-val" style="text-transform:capitalize">${state.difficulty}</span></div>
    <div class="review-item"><span class="review-key">Questions</span><span class="review-val">${state.numQuestions} Questions</span></div>
  `;
  document.getElementById('review-summary').innerHTML = html;
}

// ===== START INTERVIEW =====
async function startInterview() {
  goTo('page-interview');

  // Set candidate display
  const initials = state.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  document.getElementById('user-avatar-initials').textContent = initials;
  document.getElementById('candidate-name-display').textContent = state.name;

  const typeLabels = { hr: 'HR Interview', technical: 'Technical Interview', domain: `${state.domain} Interview`, aptitude: 'Aptitude Interview' };
  document.getElementById('candidate-type-display').textContent = typeLabels[state.interviewType];

  // Start session timer
  state.sessionStart = Date.now();
  state.timerInterval = setInterval(updateTimer, 1000);

  // Fetch questions from backend
  setInterviewerStatus('Generating questions...', 'yellow');
  try {
    const res = await fetch(`${API_BASE}/generate-questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        interview_type: state.interviewType,
        difficulty: state.difficulty,
        domain: state.domain,
        num_questions: state.numQuestions,
        candidate_name: state.name,
        degree: state.degree,
        year: state.year
      })
    });
    const data = await res.json();
    state.questions = data.questions;
    state.currentQ = 0;
    state.answers = [];
    presentQuestion(0);
  } catch (err) {
    console.error(err);
    alert('Failed to connect to backend. Make sure app.py is running on port 5000.');
  }
}

function updateTimer() {
  const elapsed = Math.floor((Date.now() - state.sessionStart) / 1000);
  const m = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const s = String(elapsed % 60).padStart(2, '0');
  document.getElementById('session-timer').textContent = `${m}:${s}`;
}

// ===== PRESENT QUESTION =====
function presentQuestion(index) {
  if (index >= state.questions.length) {
    finishInterview();
    return;
  }

  state.currentQ = index;
  const q = state.questions[index];
  const total = state.questions.length;

  document.getElementById('q-number').textContent = `Q${index + 1}`;
  document.getElementById('q-text').textContent = q;
  document.getElementById('q-counter').textContent = `${index + 1} / ${total}`;
  document.getElementById('progress-fill').style.width = `${((index + 1) / total) * 100}%`;

  // Clear answer
  state.currentTranscript = '';
  document.getElementById('transcript-text').textContent = '';
  document.getElementById('transcript-placeholder').style.display = 'block';

  // Speak the question
  speakQuestion(q);
}

// ===== TEXT TO SPEECH =====
function cleanTextForSpeech(text) {
  // Fix "Q1", "Q2" etc being read in wrong language — spell them out
  text = text.replace(/\bQ(\d+)\b/g, (_, n) => `Question ${n}`);
  // Fix numbered lists like "1." "2." at start of sentences
  text = text.replace(/^\s*(\d+)\.\s*/gm, (_, n) => `${numberToWord(parseInt(n))}. `);
  // Remove markdown symbols that confuse TTS
  text = text.replace(/[*_`#]/g, '');
  return text;
}

function numberToWord(n) {
  const words = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
  return words[n] || String(n);
}

function getBestEnglishVoice() {
  const voices = window.speechSynthesis.getVoices();
  // Priority order: Google US English > Microsoft voices > any en-US > any en
  return (
    voices.find(v => v.name === 'Google US English') ||
    voices.find(v => v.name.includes('Microsoft') && v.lang === 'en-US') ||
    voices.find(v => v.lang === 'en-US') ||
    voices.find(v => v.lang.startsWith('en')) ||
    null
  );
}

function speakQuestion(text) {
  if (!('speechSynthesis' in window)) return;

  window.speechSynthesis.cancel();

  // Small delay to let cancel() fully clear on some browsers
  setTimeout(() => {
    const cleanText = cleanTextForSpeech(text);
    const utterance = new SpeechSynthesisUtterance(cleanText);

    // CRITICAL: always force English locale on the utterance itself
    utterance.lang = 'en-US';

    const voice = getBestEnglishVoice();
    if (voice) utterance.voice = voice;

    utterance.rate = 0.90;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onstart = () => {
      state.isSpeaking = true;
      document.getElementById('ai-avatar').classList.add('speaking');
      setInterviewerStatus('Speaking...', 'green');
    };
    utterance.onend = () => {
      state.isSpeaking = false;
      document.getElementById('ai-avatar').classList.remove('speaking');
      setInterviewerStatus('Listening — tap mic to answer', 'blue');
    };
    utterance.onerror = (e) => {
      console.warn('TTS error:', e.error);
      state.isSpeaking = false;
      document.getElementById('ai-avatar').classList.remove('speaking');
      setInterviewerStatus('Ready', 'green');
    };

    window.speechSynthesis.speak(utterance);
  }, 150);
}

function replayQuestion() {
  if (state.questions[state.currentQ]) {
    speakQuestion(state.questions[state.currentQ]);
  }
}

function skipQuestion() {
  window.speechSynthesis.cancel();
  state.answers.push({ question: state.questions[state.currentQ], answer: '[Skipped]' });
  presentQuestion(state.currentQ + 1);
}

// ===== VOICE RECORDING =====
function toggleRecording() {
  if (state.isSpeaking) {
    window.speechSynthesis.cancel();
    state.isSpeaking = false;
    document.getElementById('ai-avatar').classList.remove('speaking');
  }
  if (!state.isRecording) startRecording();
  else stopRecording();
}

function startRecording() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
    return;
  }

  state.recognition = new SpeechRecognition();
  state.recognition.continuous = true;
  state.recognition.interimResults = true;
  state.recognition.lang = 'en-US';

  state.recognition.onstart = () => {
    state.isRecording = true;
    document.getElementById('mic-btn').classList.add('recording');
    document.getElementById('mic-label').textContent = 'Recording... Tap to Stop';
    document.getElementById('transcript-placeholder').style.display = 'none';
    setInterviewerStatus('Recording answer...', 'red');
    startWaveformVisualization();
  };

  state.recognition.onresult = (event) => {
    let interim = '';
    let final = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const t = event.results[i][0].transcript;
      if (event.results[i].isFinal) final += t + ' ';
      else interim += t;
    }
    state.currentTranscript += final;
    document.getElementById('transcript-text').textContent =
      state.currentTranscript + (interim ? interim : '');
  };

  state.recognition.onerror = (e) => {
    console.error('Speech error:', e.error);
    stopRecording();
  };

  state.recognition.onend = () => {
    if (state.isRecording) state.recognition.start(); // keep going
  };

  state.recognition.start();
}

function stopRecording() {
  state.isRecording = false;
  if (state.recognition) {
    state.recognition.onend = null;
    state.recognition.stop();
    state.recognition = null;
  }
  document.getElementById('mic-btn').classList.remove('recording');
  document.getElementById('mic-label').textContent = 'Tap to Answer';
  setInterviewerStatus('Ready', 'green');
  stopWaveformVisualization();
}

// ===== WAVEFORM =====
let waveAnimId = null;
let analyser = null, micStream = null;

async function startWaveformVisualization() {
  const canvas = document.getElementById('waveform-canvas');
  const ctx = canvas.getContext('2d');

  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    const source = audioCtx.createMediaStreamSource(micStream);
    source.connect(analyser);
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    function draw() {
      if (!state.isRecording) { ctx.clearRect(0, 0, canvas.width, canvas.height); return; }
      waveAnimId = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const barH = (dataArray[i] / 255) * canvas.height;
        const alpha = 0.4 + (dataArray[i] / 255) * 0.6;
        ctx.fillStyle = `rgba(200, 255, 0, ${alpha})`;
        ctx.fillRect(x, canvas.height - barH, barWidth, barH);
        x += barWidth + 1;
      }
    }
    draw();
  } catch(e) {
    // No mic access, just draw static
    drawStaticWave();
  }
}

function drawStaticWave() {
  const canvas = document.getElementById('waveform-canvas');
  const ctx = canvas.getContext('2d');
  let frame = 0;
  function draw() {
    if (!state.isRecording) { ctx.clearRect(0, 0, canvas.width, canvas.height); return; }
    waveAnimId = requestAnimationFrame(draw);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < 30; i++) {
      const h = Math.abs(Math.sin((i + frame * 0.05) * 0.5)) * 40 + 4;
      const x = i * 10 + 5;
      ctx.fillStyle = `rgba(200, 255, 0, 0.6)`;
      ctx.fillRect(x, (canvas.height - h) / 2, 6, h);
    }
    frame++;
  }
  draw();
}

function stopWaveformVisualization() {
  if (waveAnimId) cancelAnimationFrame(waveAnimId);
  if (micStream) { micStream.getTracks().forEach(t => t.stop()); micStream = null; }
  const canvas = document.getElementById('waveform-canvas');
  canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
}

// ===== SUBMIT ANSWER =====
async function submitAnswer() {
  if (state.isRecording) stopRecording();
  const answer = state.currentTranscript.trim();
  if (!answer) { alert('Please record an answer before submitting.'); return; }

  state.answers.push({
    question: state.questions[state.currentQ],
    answer: answer
  });

  // Show processing
  document.getElementById('processing-indicator').style.display = 'flex';
  document.getElementById('btn-submit').disabled = true;
  setInterviewerStatus('Evaluating...', 'yellow');

  // Brief pause for natural feel
  await sleep(1200);
  document.getElementById('processing-indicator').style.display = 'none';
  document.getElementById('btn-submit').disabled = false;

  // Move to next question
  const nextIdx = state.currentQ + 1;
  if (nextIdx >= state.questions.length) {
    finishInterview();
  } else {
    presentQuestion(nextIdx);
  }
}

function clearAnswer() {
  if (state.isRecording) stopRecording();
  state.currentTranscript = '';
  document.getElementById('transcript-text').textContent = '';
  document.getElementById('transcript-placeholder').style.display = 'block';
}

// ===== FINISH INTERVIEW =====
async function finishInterview() {
  window.speechSynthesis.cancel();
  if (state.isRecording) stopRecording();
  clearInterval(state.timerInterval);

  goTo('page-results');
  document.getElementById('score-num') && (document.getElementById('overall-score').textContent = '...');

  try {
    const res = await fetch(`${API_BASE}/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        interview_type: state.interviewType,
        difficulty: state.difficulty,
        candidate_name: state.name,
        qa_pairs: state.answers
      })
    });
    const data = await res.json();
    state.results = data;
    displayResults(data);
  } catch(err) {
    console.error(err);
    document.getElementById('feedback-content').textContent = 'Could not fetch evaluation. Please check your backend.';
  }
}

function displayResults(data) {
  const score = data.overall_score || 0;
  document.getElementById('overall-score').textContent = score;

  // Animate score ring
  const circumference = 326;
  const offset = circumference - (score / 100) * circumference;
  setTimeout(() => {
    document.getElementById('score-circle').style.strokeDashoffset = offset;
  }, 200);

  // Grade
  let grade = 'Needs Practice';
  if (score >= 85) grade = 'Excellent 🌟';
  else if (score >= 70) grade = 'Good Performance 👍';
  else if (score >= 55) grade = 'Fair — Keep Going 💪';
  document.getElementById('score-grade').textContent = grade;

  // Metrics
  document.getElementById('metric-accuracy').textContent = `${data.accuracy || '--'}/10`;
  document.getElementById('metric-communication').textContent = `${data.communication || '--'}/10`;
  document.getElementById('metric-depth').textContent = `${data.depth || '--'}/10`;
  document.getElementById('metric-confidence').textContent = `${data.confidence || '--'}/10`;

  // Feedback
  document.getElementById('feedback-content').textContent = data.feedback || 'No feedback available.';

  // Q&A List
  const qaList = document.getElementById('qa-list');
  qaList.innerHTML = '';
  (state.answers || []).forEach((qa, i) => {
    const item = document.createElement('div');
    item.className = 'qa-item';
    const qScore = data.question_scores ? data.question_scores[i] : null;
    item.innerHTML = `
      <div class="qa-q">Q${i+1}: ${qa.question}</div>
      <div class="qa-a">${qa.answer || '[No answer]'}</div>
      ${qScore ? `<div class="qa-score">Score: ${qScore}/10</div>` : ''}
    `;
    qaList.appendChild(item);
  });
}

function retryInterview() {
  state.answers = [];
  state.currentQ = 0;
  startInterview();
}

// ===== HELPERS =====
function setInterviewerStatus(text, color) {
  const el = document.getElementById('interviewer-status');
  const colors = { green: '#00e5a0', yellow: '#ffd060', red: '#ff4d6d', blue: '#4d9fff' };
  el.innerHTML = `<span class="status-dot" style="background:${colors[color] || '#00e5a0'}"></span> ${text}`;
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

// Pre-load voices — must be called early so they're ready when needed
if ('speechSynthesis' in window) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices(); // cache them in browser
  };
}