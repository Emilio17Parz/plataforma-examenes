const exams = [
  { folder: 'ExamenZscalerIntro', file: 'Examen_Zscaler_Intro.txt', name: 'Zscaler EDU-200 - Introducción Zero Trust' },
  { folder: 'Examen1', file: 'Examen1_Estructuras_DNA.txt', name: 'Examen 1 - Estructuras DNA' }
];

let currentQuestions = [];
let currentQuestionIndex = 0;
let score = 0;
let currentExam = null;

const menu = document.getElementById('menu');
const examList = document.getElementById('exam-list');
const quizContainer = document.getElementById('quiz-container');
const resultsContainer = document.getElementById('results-container');
const questionBox = document.getElementById('question-box');
const optionsBox = document.getElementById('options-box');
const btnNext = document.getElementById('btn-next');
const btnMenu = document.getElementById('btn-menu');
const questionCounter = document.getElementById('question-counter');

function initMenu() {
  examList.innerHTML = '';

  exams.forEach(exam => {
    const btn = document.createElement('button');
    btn.className = `
      w-full p-6 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl
      hover:bg-blue-600 hover:text-white transition shadow-sm font-semibold
      text-lg text-left md:text-center
    `;
    btn.textContent = exam.name;
    btn.onclick = () => loadExam(exam);
    examList.appendChild(btn);
  });
}

async function loadExam(exam) {
  try {
    currentExam = exam;
    const response = await fetch(`${exam.folder}/${exam.file}?t=${new Date().getTime()}`);

    if (!response.ok) {
      throw new Error(`No se pudo cargar el archivo: ${exam.file}`);
    }

    const text = await response.text();
    currentQuestions = parseExamData(text, exam.folder);

    if (currentQuestions.length === 0) {
      throw new Error('No se encontraron preguntas en el archivo.');
    }

    currentQuestionIndex = 0;
    score = 0;

    document.getElementById('exam-title').textContent = exam.name;
    menu.classList.add('hidden');
    resultsContainer.classList.add('hidden');
    quizContainer.classList.remove('hidden');

    showQuestion();
  } catch (error) {
    alert('Error al cargar el examen. Revisa que el archivo exista y que estés usando un servidor local o GitHub Pages.');
    console.error(error);
  }
}

function parseExamData(text, folder) {
  const questions = [];
  let currentQ = null;
  const lines = text.replace(/\r/g, '').split('\n');

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();
    if (!line) continue;

    const imageMatch = line.match(/^\[\s*(?:Imagen|Image)\s*:\s*(.*?)\s*\]$/i);
    if (imageMatch && currentQ) {
      currentQ.image = resolveImagePath(imageMatch[1], folder);
      continue;
    }

    const optRegex = /^\d+\.\d+\.[a-z]\.?\s*(\*)?\.?\s*(.*)/i;
    const optMatch = line.match(optRegex);

    if (optMatch) {
      if (currentQ) {
        currentQ.options.push({
          text: cleanText(optMatch[2]),
          isCorrect: optMatch[1] === '*' || line.includes('*')
        });
      }
      continue;
    }

    const qStartRegex = /^(\d+\.\d+)\.\s*(.*)/;
    const qMatch = line.match(qStartRegex);

    if (qMatch) {
      if (currentQ && currentQ.options.length > 0) {
        questions.push(currentQ);
      }
      currentQ = {
        text: cleanText(qMatch[2] || line.replace(/^(\d+\.\d+)\.\s*/, '')),
        image: null,
        options: []
      };
      continue;
    }

    if (currentQ && currentQ.options.length === 0) {
      currentQ.text += ' ' + cleanText(line);
    } else if (currentQ && currentQ.options.length > 0) {
      currentQ.options[currentQ.options.length - 1].text += ' ' + cleanText(line);
    }
  }

  if (currentQ && currentQ.options.length > 0) {
    questions.push(currentQ);
  }

  return questions;
}

function resolveImagePath(path, folder) {
  if (/^(https?:)?\/\//i.test(path) || path.startsWith('/') || path.startsWith('../')) {
    return path;
  }
  if (path.startsWith('img/')) {
    return path;
  }
  return `${folder}/${path}`;
}

function cleanText(text) {
  return text
    .replace(/\[\s*(?:Requiere imagen|Imagen|Image)\s*:.*?\]/gi, '')
    .replace(/\[.*?\]/g, '')
    .replace(/\*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeHTML(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showQuestion() {
  btnNext.classList.add('hidden');
  const q = currentQuestions[currentQuestionIndex];
  questionCounter.textContent = `Pregunta ${currentQuestionIndex + 1} / ${currentQuestions.length}`;

  const imageHTML = q.image
    ? `<img class="question-image" src="${escapeHTML(q.image)}" alt="Imagen de apoyo para la pregunta">`
    : '';

  questionBox.innerHTML = `
    ${imageHTML}
    <p class="text-xl md:text-2xl font-medium text-gray-800 leading-relaxed">
      ${escapeHTML(q.text)}
    </p>
  `;

  optionsBox.innerHTML = '';

  q.options.forEach((opt, index) => {
    const btn = document.createElement('button');
    const letter = String.fromCharCode(65 + index);

    btn.className = `
      w-full text-left p-4 md:p-5 border-2 border-gray-200 rounded-xl
      hover:bg-gray-50 transition text-lg bg-white mb-3 shadow-sm active:scale-95
    `;
    btn.innerHTML = `<span class="option-letter">${letter}</span>${escapeHTML(opt.text)}`;
    btn.onclick = () => selectOption(btn, opt.isCorrect);
    optionsBox.appendChild(btn);
  });
}

function selectOption(selectedBtn, isCorrect) {
  const allBtns = optionsBox.querySelectorAll('button');
  allBtns.forEach(btn => { btn.disabled = true; });

  if (isCorrect) {
    selectedBtn.classList.remove('hover:bg-gray-50', 'bg-white', 'border-gray-200');
    selectedBtn.classList.add('bg-green-100', 'border-green-500', 'text-green-900', 'font-bold');
    score++;
  } else {
    selectedBtn.classList.remove('hover:bg-gray-50', 'bg-white', 'border-gray-200');
    selectedBtn.classList.add('bg-red-100', 'border-red-500', 'text-red-900', 'font-semibold');

    const q = currentQuestions[currentQuestionIndex];
    q.options.forEach((opt, idx) => {
      if (opt.isCorrect) {
        allBtns[idx].classList.remove('bg-white', 'border-gray-200');
        allBtns[idx].classList.add('bg-green-100', 'border-green-500', 'text-green-900', 'font-bold');
      }
    });
  }

  btnNext.classList.remove('hidden');
}

btnNext.onclick = () => {
  currentQuestionIndex++;
  if (currentQuestionIndex < currentQuestions.length) {
    showQuestion();
  } else {
    showResults();
  }
};

btnMenu.onclick = () => {
  quizContainer.classList.add('hidden');
  resultsContainer.classList.add('hidden');
  menu.classList.remove('hidden');
};

function showResults() {
  quizContainer.classList.add('hidden');
  resultsContainer.classList.remove('hidden');

  const percentage = Math.round((score / currentQuestions.length) * 100);
  const scoreDisplay = document.getElementById('score-display');
  scoreDisplay.textContent = `${score} / ${currentQuestions.length} (${percentage}%)`;

  if (percentage >= 80) {
    scoreDisplay.className = 'text-5xl font-extrabold text-green-500 mb-6';
  } else if (percentage >= 60) {
    scoreDisplay.className = 'text-5xl font-extrabold text-yellow-500 mb-6';
  } else {
    scoreDisplay.className = 'text-5xl font-extrabold text-red-500 mb-6';
  }
}

document.getElementById('btn-retry').onclick = () => {
  currentQuestionIndex = 0;
  score = 0;
  resultsContainer.classList.add('hidden');
  quizContainer.classList.remove('hidden');
  showQuestion();
};

document.getElementById('btn-home').onclick = () => {
  resultsContainer.classList.add('hidden');
  quizContainer.classList.add('hidden');
  menu.classList.remove('hidden');
};

initMenu();
