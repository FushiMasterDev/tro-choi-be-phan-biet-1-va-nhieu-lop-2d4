// Shared quiz engine. Each page sets window.GAME before loading this file:
//   questions: [{ q, answer, options: [3 names], show? }]   show = big picture above the answers
//   known:     { name: ... } every option must be a key (used by the self-check)
//   audioDir:  folder holding q1..q10.mp3 (made by gen_audio.py)
//   readOptions: read the 3 options aloud after the question
//   pics:      answers are pictures (3-column grid)
//   option(btn, name): fill one answer button
//   wrongText(q): message shown after a wrong pick
const G = window.GAME, QUESTIONS = G.questions;

// self-check: 10 questions, 3 known options each, exactly one correct
console.assert(QUESTIONS.length === 10, "need 10 questions");
QUESTIONS.forEach((x, i) => console.assert(
  x.options.length === 3 && x.options.filter(o => o === x.answer).length === 1 && x.options.every(o => o in G.known),
  `question ${i + 1} is malformed`));

const $ = id => document.getElementById(id);
let idx = 0, score = 0;

// Pre-recorded voice (gen_audio.py); browser TTS only if the file can't play.
let clip = new Audio();
function say(path, text) {
  clip.pause();
  window.speechSynthesis?.cancel();
  clip = new Audio(`${path}.mp3`);
  clip.play().catch(() => speak(text));
}
// keep in sync with gen_audio.py
const questionText = q => G.readOptions ? `${q.q} ${q.options.join(", ")}` : q.q;
const resultMessage = s => s === 10 ? "Tuyệt vời! Bé trả lời đúng hết rồi!" : s >= 6 ? "Bé làm tốt lắm! Chơi lại để được 10 điểm nhé!" : "Cố lên nào! Mình cùng chơi lại nhé!";

function speak(text) {
  if (!("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "vi-VN";
  viVoice ??= pickVoice();
  if (viVoice) u.voice = viVoice;
  speechSynthesis.speak(u);
}

// Chrome fills the voice list asynchronously; without a vi voice it reads Vietnamese with an English one.
let viVoice = null;
function pickVoice() {
  const vi = speechSynthesis.getVoices().filter(v => v.lang.toLowerCase().replace("_", "-").startsWith("vi"));
  return vi.find(v => /google/i.test(v.name)) || vi[0] || null;
}
if ("speechSynthesis" in window) speechSynthesis.addEventListener("voiceschanged", () => viVoice = pickVoice());

// ting/buzz are files (gen_sfx.py): Web Audio tones were too quiet/low for laptop speakers.
const sfx = { ting: new Audio("audio/ting.wav"), buzz: new Audio("audio/buzz.wav") };
const play = name => { const a = sfx[name]; a.currentTime = 0; a.play().catch(() => {}); };

function show(id) { ["start", "quiz", "result"].forEach(s => $(s).hidden = s !== id); }

function render() {
  const q = QUESTIONS[idx];
  $("count").textContent = `Câu ${idx + 1}/${QUESTIONS.length}`;
  $("points").textContent = `⭐ ${score}`;
  $("progress").style.width = `${idx / QUESTIONS.length * 100}%`;
  $("qText").textContent = q.q;
  $("feedback").textContent = ""; $("feedback").className = "feedback";
  const f = $("show");
  f.hidden = !q.show;
  f.textContent = q.show || "";
  f.style.animation = "none"; f.offsetWidth; f.style.animation = "";
  $("answers").className = "answers" + (G.pics ? " pics" : "");
  $("answers").replaceChildren(...q.options.map(name => {
    const b = document.createElement("button");
    b.className = "ans";
    G.option(b, name);
    b.onclick = () => answer(b, name);
    return b;
  }));
  say(`${G.audioDir}/q${idx + 1}`, questionText(q));
}

function answer(btn, name) {
  const q = QUESTIONS[idx], right = name === q.answer;
  $("answers").querySelectorAll("button").forEach(b => b.disabled = true);
  btn.classList.add(right ? "correct" : "wrong");
  if (right) { score++; play("ting"); $("feedback").textContent = "Đúng rồi! Bé giỏi quá!"; $("feedback").classList.add("ok"); }
  else {
    play("buzz");
    $("answers").children[q.options.indexOf(q.answer)].classList.add("correct");
    $("feedback").textContent = G.wrongText(q); $("feedback").classList.add("bad");
  }
  $("points").textContent = `⭐ ${score}`;
  clip.pause(); window.speechSynthesis?.cancel();
  setTimeout(() => { idx++; idx < QUESTIONS.length ? render() : finish(); }, 1800);
}

function finish() {
  $("progress").style.width = "100%";
  show("result");
  $("finalScore").textContent = `${score}/${QUESTIONS.length}`;
  const s = score >= 9 ? 3 : score >= 6 ? 2 : 1;
  $("stars").textContent = "★".repeat(s) + "☆".repeat(3 - s);
  const msg = resultMessage(score);
  $("resultMsg").textContent = msg;
  say(`audio/r${score}`, `Bé được ${score} điểm. ${msg}`);
  $("againBtn").focus();
}

function start() {
  idx = 0; score = 0;
  show("quiz"); render();
}

$("startBtn").onclick = start;
$("againBtn").onclick = start;
$("replayBtn").onclick = () => say(`${G.audioDir}/q${idx + 1}`, questionText(QUESTIONS[idx]));
window.speechSynthesis?.getVoices(); // warm up voice list
