// ===========================
//  INTRVW.AI — REPORT.JS
//  PDF Report Generator
// ===========================

async function downloadReport() {
  const btn = document.getElementById('btn-download-report');
  try {
    if (btn) { btn.disabled = true; btn.innerHTML = '⏳ Generating PDF...'; }

    // Load jsPDF
    if (!window.jspdf) {
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    }
    if (!window.jspdf) throw new Error('jsPDF failed to load');

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = 210, H = 297;
    const results = state.results || {};
    const score   = results.overall_score || 0;
    const answers = state.answers || [];

    // ── COLOR PALETTE ──
    const C = {
      bg:      [10, 10, 20],
      surface: [22, 22, 38],
      card:    [32, 32, 52],
      accent:  [140, 200, 0],
      white:   [245, 245, 252],
      muted:   [110, 110, 145],
      dim:     [55, 55, 80],
      green:   [0, 195, 135],
      yellow:  [255, 195, 50],
      red:     [220, 65, 85],
      blue:    [75, 155, 255],
    };

    // ── HELPERS ──
    const sf  = (c) => doc.setFillColor(...c);
    const st  = (c) => doc.setTextColor(...c);
    const fn  = (w, s) => { doc.setFont('helvetica', w); doc.setFontSize(s); };
    const tx  = (s, x, y, o) => doc.text(String(s ?? ''), x, y, o || {});
    const box = (x, y, w, h) => doc.rect(x, y, w, h, 'F');

    function rbox(x, y, w, h, r) {
      r = r || 3;
      doc.roundedRect(x, y, w, h, r, r, 'F');
    }

    function scoreCol(v, max) {
      max = max || 10;
      const pct = v / max;
      if (pct >= 0.75) return C.green;
      if (pct >= 0.50) return C.yellow;
      return C.red;
    }

    function gradeStr(s) {
      if (s >= 85) return 'EXCELLENT';
      if (s >= 70) return 'GOOD';
      if (s >= 55) return 'FAIR';
      return 'NEEDS PRACTICE';
    }

    // ── DRAW SCORE CIRCLE ON CANVAS → PNG ──
    function makeScoreCircle(score, px) {
      px = px || 240;
      const cv  = document.createElement('canvas');
      cv.width  = px; cv.height = px;
      const ctx = cv.getContext('2d');
      const cx  = px / 2, cy = px / 2, r = px * 0.38;
      const lw  = px * 0.10;

      // BG ring
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(50,50,80,1)';
      ctx.lineWidth   = lw;
      ctx.stroke();

      // Filled arc
      if (score > 0) {
        const start = -Math.PI / 2;
        const end   = start + (score / 100) * Math.PI * 2;
        const g     = ctx.createLinearGradient(cx - r, cy, cx + r, cy);
        g.addColorStop(0, '#8CC800');
        g.addColorStop(1, '#C8FF00');
        ctx.beginPath();
        ctx.arc(cx, cy, r, start, end);
        ctx.strokeStyle = g;
        ctx.lineWidth   = lw;
        ctx.lineCap     = 'round';
        ctx.stroke();
      }

      // Score number
      ctx.fillStyle    = '#F0F0F8';
      ctx.font         = 'bold ' + Math.round(px * 0.26) + 'px Helvetica';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(score), cx, cy - px * 0.04);

      ctx.fillStyle = 'rgba(140,140,175,1)';
      ctx.font      = Math.round(px * 0.09) + 'px Helvetica';
      ctx.fillText('/100', cx, cy + px * 0.18);

      return cv.toDataURL('image/png');
    }

    // ── DRAW BAR → PNG ──
    function makeBar(val, max, col) {
      const cv  = document.createElement('canvas');
      cv.width  = 320; cv.height = 24;
      const ctx = cv.getContext('2d');
      ctx.fillStyle = 'rgba(50,50,80,1)';
      ctx.fillRect(0, 6, 320, 12);
      const fw = Math.max(0, (val / max) * 320);
      if (fw > 0) {
        ctx.fillStyle = 'rgb(' + col[0] + ',' + col[1] + ',' + col[2] + ')';
        ctx.fillRect(0, 6, fw, 12);
      }
      return cv.toDataURL('image/png');
    }

    // ── PAGE HEADER ──
    function pageHeader(subtitle) {
      sf(C.surface); box(0, 0, W, 20);
      sf(C.accent);  box(0, 0, W, 1.5);
      fn('bold', 8); st(C.white);
      tx('INTRVW.AI', 16, 13);
      fn('normal', 7); st(C.muted);
      tx(subtitle, W / 2, 13, { align: 'center' });
      tx(state.name || 'Candidate', W - 16, 13, { align: 'right' });
    }

    // ── PAGE FOOTER ──
    function pageFooter(pageNum, total) {
      sf(C.surface); box(0, H - 14, W, 14);
      fn('normal', 6.5); st(C.muted);
      const now2 = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      tx('INTRVW.AI  \u2022  Confidential Interview Report  \u2022  ' + now2 + '  \u2022  Page ' + pageNum + ' of 3', W / 2, H - 5.5, { align: 'center' });
    }

    var typeMap = { hr: 'HR / Behavioral', technical: 'Technical', domain: 'Domain - ' + (state.domain || ''), aptitude: 'General Aptitude' };
    var typeLbl = typeMap[state.interviewType] || 'Interview';
    var now     = new Date();
    var dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

    // ══════════════════════════════════════
    //  PAGE 1 — COVER
    // ══════════════════════════════════════
    sf(C.bg); box(0, 0, W, H);
    sf(C.accent); box(0, 0, W, 2);
    sf(C.surface); box(0, 2, W, 70);

    // Decorative ellipses (jsPDF has ellipse, NOT circle)
    sf([20, 20, 36]);
    doc.ellipse(W + 12, -12, 68, 68, 'F');
    sf([16, 16, 30]);
    doc.ellipse(W - 5, 50, 38, 38, 'F');

    // Logo
    fn('bold', 13); st(C.white);
    tx('INTRVW', 18, 24);
    st(C.accent);
    tx('.AI', 18 + doc.getTextWidth('INTRVW') + 1, 24);
    fn('normal', 7); st(C.muted);
    tx('COLLEGE EDITION  \u2022  INTERVIEW PERFORMANCE REPORT', 18, 31);

    fn('normal', 8); st(C.muted);
    tx(dateStr, W - 18, 24, { align: 'right' });

    // Big title
    fn('bold', 50); st(C.white);
    tx('INTERVIEW', 18, 74);
    fn('bold', 50); st(C.accent);
    tx('REPORT', 18, 94);
    sf(C.accent); box(18, 98, 72, 1.8);

    // Candidate card
    sf(C.card); box(18, 112, W - 36, 52);
    sf(C.accent); box(18, 112, 3.5, 52);

    fn('bold', 20); st(C.white);
    tx(state.name || 'Candidate', 30, 127);
    fn('normal', 9.5); st(C.muted);
    tx(state.college || '', 30, 136);
    if (state.degree) { fn('normal', 8.5); st(C.muted); tx(state.degree + '  \u2022  ' + (state.year || ''), 30, 144); }

    // Tags
    var tagX = 30;
    var tags = [typeLbl, (state.difficulty || 'medium').toUpperCase(), (state.questions ? state.questions.length : 0) + ' QUESTIONS'];
    tags.forEach(function(tag) {
      fn('bold', 7); st(C.accent);
      var tw = doc.getTextWidth(tag) + 8;
      sf(C.surface); box(tagX, 149, tw, 9);
      tx(tag, tagX + 4, 155.5);
      tagX += tw + 5;
    });

    // Score circle
    var circImg = makeScoreCircle(score, 280);
    var circSz  = 58;
    doc.addImage(circImg, 'PNG', W / 2 - circSz / 2, 176, circSz, circSz);

    fn('bold', 13); st(scoreCol(score, 100));
    tx(gradeStr(score), W / 2, 243, { align: 'center' });
    fn('normal', 8); st(C.muted);
    tx('Overall Performance Score', W / 2, 251, { align: 'center' });

    var dur = (document.getElementById('session-timer') && document.getElementById('session-timer').textContent) || 'N/A';
    fn('normal', 8); st(C.dim);
    tx('Session Duration: ' + dur, W / 2, 262, { align: 'center' });

    pageFooter(1, 3);

    // ══════════════════════════════════════
    //  PAGE 2 — METRICS + FEEDBACK + TIPS
    // ══════════════════════════════════════
    doc.addPage();
    sf(C.bg); box(0, 0, W, H);
    pageHeader('Performance Metrics & Feedback');

    var y = 28;

    fn('bold', 11); st(C.white);
    tx('Performance Metrics', 18, y); y += 3;
    sf(C.accent); box(18, y, 40, 1); y += 8;

    var metrics = [
      { label: 'Accuracy',      val: results.accuracy      || 0, col: C.blue   },
      { label: 'Communication', val: results.communication || 0, col: C.green  },
      { label: 'Depth',         val: results.depth         || 0, col: C.yellow },
      { label: 'Confidence',    val: results.confidence    || 0, col: C.accent },
    ];

    metrics.forEach(function(m, i) {
      var col = i % 2;
      var row = Math.floor(i / 2);
      var mx  = 18 + col * 90;
      var my  = y + row * 28;

      sf(C.card); box(mx, my, 84, 22);
      fn('bold', 8); st(C.white);
      tx(m.label, mx + 7, my + 9);
      fn('bold', 13); st(m.col);
      tx(String(m.val), mx + 7, my + 18);
      fn('normal', 7); st(C.muted);
      tx('/10', mx + 7 + doc.getTextWidth(String(m.val)) + 1, my + 18);
      var barImg = makeBar(m.val, 10, m.col);
      doc.addImage(barImg, 'PNG', mx + 32, my + 12, 46, 7);
    });

    y += 64;

    // AI Feedback
    fn('bold', 11); st(C.white);
    tx('AI Feedback', 18, y); y += 3;
    sf(C.accent); box(18, y, 24, 1); y += 8;

    var feedbackTxt = results.feedback || 'No feedback available.';
    var fLines      = doc.splitTextToSize(feedbackTxt, W - 52);
    var fShow       = fLines.slice(0, 9);
    var fBoxH       = fShow.length * 6.5 + 14;

    sf(C.card); box(18, y, W - 36, fBoxH);
    sf(C.accent); box(18, y, 3, fBoxH);
    fn('normal', 8); st(C.white);
    fShow.forEach(function(line, i) { tx(line, 28, y + 9 + i * 6.5); });
    y += fBoxH + 8;

    // Tips
    fn('bold', 11); st(C.white);
    tx('Tips to Improve', 18, y); y += 3;
    sf(C.green); box(18, y, 32, 1); y += 8;

    var tips = buildTips(results, state.interviewType);
    tips.forEach(function(tip, i) {
      var tLines = doc.splitTextToSize(tip, W - 58);
      var tH     = tLines.length * 5.5 + 12;
      if (y + tH > H - 18) return;
      sf(C.card); box(18, y, W - 36, tH);
      sf(C.accent); box(20, y + (tH - 8) / 2, 8, 8);
      fn('bold', 6.5); st(C.bg);
      tx(String(i + 1), 24, y + (tH - 8) / 2 + 5.5, { align: 'center' });
      fn('normal', 7.5); st(C.white);
      tLines.forEach(function(line, j) { tx(line, 34, y + 8 + j * 5.5); });
      y += tH + 4;
    });

    pageFooter(2, 3);

    // ══════════════════════════════════════
    //  PAGE 3 — Q&A REVIEW
    // ══════════════════════════════════════
    doc.addPage();
    sf(C.bg); box(0, 0, W, H);
    pageHeader('Question & Answer Review');

    y = 28;
    fn('bold', 11); st(C.white);
    tx('Answer Review', 18, y); y += 3;
    sf(C.accent); box(18, y, 28, 1); y += 9;

    var qScores = results.question_scores || [];

    answers.forEach(function(qa, i) {
      var qScore = (qScores[i] !== undefined) ? qScores[i] : 0;
      var qCol   = scoreCol(qScore, 10);
      var qTxt   = qa.question || '';
      var aTxt   = qa.answer   || '[No answer]';

      var qLines = doc.splitTextToSize(qTxt, W - 60);
      var aLines = doc.splitTextToSize(aTxt, W - 60);
      var aShow  = aLines.slice(0, 3);
      var bH     = qLines.length * 5.5 + aShow.length * 5 + 20;

      if (y + bH > H - 18) {
        pageFooter(3, 3);
        doc.addPage();
        sf(C.bg); box(0, 0, W, H);
        pageHeader('Q&A Review (cont.)');
        sf(C.accent); box(0, 0, W, 1.5);
        y = 26;
      }

      sf(C.card); box(18, y, W - 36, bH);
      sf(qCol); box(18, y, 12, bH);
      fn('bold', 7); st(C.bg);
      tx('Q' + (i + 1), 24, y + bH / 2 + 2.5, { align: 'center' });

      sf(C.surface); box(W - 40, y + 4, 18, 8);
      fn('bold', 7); st(qCol);
      tx(qScore + '/10', W - 31, y + 9.5, { align: 'center' });

      var ty = y + 9;
      fn('bold', 8.5); st(C.white);
      qLines.forEach(function(l) { tx(l, 36, ty); ty += 5.5; });

      sf(C.dim); box(34, ty, W - 56, 0.4); ty += 4;

      fn('normal', 7.5); st(C.muted);
      aShow.forEach(function(l) { tx(l, 36, ty); ty += 5; });
      if (aLines.length > 3) { st(C.dim); tx('\u2026', 36, ty); }

      y += bH + 4;
    });

    // Summary strip
    var summaryY = Math.max(y + 4, H - 34);
    if (summaryY < H - 18) {
      sf(C.surface); box(18, summaryY, W - 36, 16);
      sf(C.accent); box(18, summaryY, 3, 16);
      fn('bold', 8); st(C.white);
      tx('Interview Summary', 26, summaryY + 7);
      fn('normal', 7); st(C.muted);
      tx(answers.length + ' Questions  \u2022  Score: ' + score + '/100  \u2022  Grade: ' + gradeStr(score) + '  \u2022  ' + typeLbl + '  \u2022  ' + dateStr, 26, summaryY + 13);
    }

    pageFooter(3, 3);

    // ── SAVE ──
    var safeName = (state.name || 'Candidate').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
    var datePart = now.getFullYear() + '' + String(now.getMonth()+1).padStart(2,'0') + '' + String(now.getDate()).padStart(2,'0');
    doc.save('INTRVW_AI_Report_' + safeName + '_' + datePart + '.pdf');

    if (btn) { btn.disabled = false; btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Download PDF Report'; }

  } catch (err) {
    console.error('PDF generation error:', err);
    alert('PDF Error: ' + err.message + '\n\nOpen browser console (F12) for details.');
    if (btn) { btn.disabled = false; btn.innerHTML = '⬇️ Download Report'; }
  }
}

// ── Improvement Tips ──
function buildTips(results, type) {
  var tips = [];
  var a = results.accuracy      || 5;
  var c = results.communication || 5;
  var d = results.depth         || 5;
  var f = results.confidence    || 5;

  if (a < 7) tips.push('Strengthen accuracy: Study core concepts and back every answer with specific facts, definitions, or real examples rather than vague statements.');
  if (c < 7) tips.push('Improve communication: Use the STAR method (Situation, Task, Action, Result). Speak in clear short sentences and pause before answering complex questions.');
  if (d < 7) tips.push('Add more depth: Go beyond surface answers. Explain the "why", provide edge cases, and connect concepts to real-world use cases or your own project experience.');
  if (f < 7) tips.push('Build confidence: Record yourself answering mock questions daily and review your tone. Confidence compounds with consistent practice — aim for 3 sessions per week.');

  if (type === 'hr') {
    tips.push('Prepare 5 to 7 compelling stories from your college experience. Cover: leadership, teamwork, handling failure, conflict resolution, and your proudest achievement.');
    tips.push('Practice HR classics aloud: "Tell me about yourself", "Greatest weakness", "5-year plan". Keep answers polished, honest, and under 90 seconds.');
  } else if (type === 'technical') {
    tips.push('Revise DSA daily: Arrays, Linked Lists, Trees, Graphs, Sorting, and Dynamic Programming. Always explain time and space complexity when solving problems.');
    tips.push('Solve 2 LeetCode problems per day (Easy to Medium). Focus on: Two Pointers, Sliding Window, Binary Search, BFS/DFS, and DP patterns.');
  } else if (type === 'domain') {
    tips.push('Build a mind-map of your subject covering core concepts, applications, recent trends, and common misconceptions. Review and expand it every week.');
    tips.push('Read 1 to 2 recent articles or research papers in your domain per week. Citing current developments in answers sets you apart from other candidates.');
  } else if (type === 'aptitude') {
    tips.push('Practice 20 to 30 aptitude questions daily across: Percentages, Ratios, Time and Work, Speed and Distance, Series, Syllogisms, and Data Interpretation.');
    tips.push('Master mental math shortcuts for fast percentage, multiplication, and division calculations — these are essential for finishing aptitude tests within the time limit.');
  }

  tips.push('Stay consistent: 30 minutes of focused daily practice beats 3-hour weekend cramming. Track your weak areas and schedule targeted revision each week.');
  return tips.slice(0, 6);
}

// ── Script loader ──
function loadScript(src) {
  return new Promise(function(resolve, reject) {
    if (document.querySelector('script[src="' + src + '"]')) { resolve(); return; }
    var s    = document.createElement('script');
    s.src      = src;
    s.onload   = resolve;
    s.onerror  = function() { reject(new Error('Failed to load: ' + src)); };
    document.head.appendChild(s);
  });
}