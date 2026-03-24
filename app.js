const exams = [
    { folder: 'Examen1', file: 'Examen1_Estructuras_DNA.txt', name: 'Examen 1 - Estructuras DNA' },
    { folder: 'Examen2', file: 'Examen2_Transc.txt', name: 'Examen 2 - Transcripción' }
];

// Mapeo manual para las imágenes que están divididas en varias (ej. terminacion_rho1, 2, 3)
const imageMap = {
    'segregacion_procariota': ['segregacion_procariota1.png', 'segregacion_procariota2.png'],
    'elongacion_esquema': ['elongacion_esquema1.png', 'elongacion_esquema2.png'],
    'terminacion_rho': ['terminacion_rho1.png', 'terminacion_rho2.png', 'terminacion_rho3.png']
};

let currentQuestions = [];
let currentQuestionIndex = 0;
let score = 0;
let currentExamFolder = '';

const menu = document.getElementById('menu');
const examList = document.getElementById('exam-list');
const quizContainer = document.getElementById('quiz-container');
const resultsContainer = document.getElementById('results-container');
const questionBox = document.getElementById('question-box');
const optionsBox = document.getElementById('options-box');
const btnNext = document.getElementById('btn-next');
const btnMenu = document.getElementById('btn-menu');
const questionCounter = document.getElementById('question-counter');

// Iniciar menú
function initMenu() {
    examList.innerHTML = '';
    exams.forEach(exam => {
        const btn = document.createElement('button');
        btn.className = 'p-6 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl hover:bg-blue-600 hover:text-white transition shadow-sm font-semibold text-lg';
        btn.textContent = exam.name;
        btn.onclick = () => loadExam(exam);
        examList.appendChild(btn);
    });
}

// Cargar y procesar el archivo de texto
async function loadExam(exam) {
    try {
        currentExamFolder = exam.folder;
        const response = await fetch(`${exam.folder}/${exam.file}`);
        const text = await response.text();
        
        currentQuestions = parseExamData(text);
        if(currentQuestions.length === 0) throw new Error("No se encontraron preguntas.");

        currentQuestionIndex = 0;
        score = 0;
        document.getElementById('exam-title').textContent = exam.name;
        
        menu.classList.add('hidden');
        resultsContainer.classList.add('hidden');
        quizContainer.classList.remove('hidden');
        
        showQuestion();
    } catch (error) {
        alert('Error al cargar el examen. Asegúrate de estar ejecutando esto en un servidor local (Live Server) para que la petición Fetch funcione.');
        console.error(error);
    }
}

// Parsear el TXT
function parseExamData(text) {
    // Dividir por números de pregunta al inicio de la línea (ej. "1.1. ")
    const blocks = text.split(/(?=\n\d+\.\d+\.)/); 
    const questions = [];

    blocks.forEach(block => {
        if (!block.trim()) return;

        // Extraer imágenes
        const imageRegex = /\[Requiere imagen:\s*([^\s]+)\s*-.*\]/g;
        let images = [];
        let match;
        while ((match = imageRegex.exec(block)) !== null) {
            let baseName = match[1].replace('.jpg', '').replace('.png', '');
            if(imageMap[baseName]) {
                images = images.concat(imageMap[baseName]);
            } else {
                images.push(baseName + '.png');
            }
        }

        // Limpiar el texto de la pregunta (quitar las etiquetas de imagen)
        let qText = block.replace(/\[Requiere imagen:.*?\]/g, '').trim();
        
        // Separar la pregunta de las opciones
        const lines = qText.split('\n');
        let questionString = "";
        let options = [];

        lines.forEach(line => {
            const optMatch = line.match(/^\d+\.\d+\.[a-z]\.(\*)?\.\s*(.*)/) || line.match(/^\d+\.\d+\.[a-z]\.(\*)?\s*(.*)/);
            if (optMatch) {
                options.push({
                    text: optMatch[2],
                    isCorrect: optMatch[1] === '*'
                });
            } else {
                questionString += line + " ";
            }
        });

        if (options.length > 0) {
            questions.push({ text: questionString.trim(), images, options });
        }
    });
    return questions;
}

// Mostrar pregunta actual
function showQuestion() {
    btnNext.classList.add('hidden');
    const q = currentQuestions[currentQuestionIndex];
    questionCounter.textContent = `Pregunta ${currentQuestionIndex + 1} / ${currentQuestions.length}`;
    
    // Renderizar imágenes si las hay
    let imagesHTML = '';
    if (q.images && q.images.length > 0) {
        imagesHTML = `<div class="flex flex-wrap gap-4 mb-4 justify-center">`;
        q.images.forEach(img => {
            imagesHTML += `<img src="${currentExamFolder}/${img}" alt="Imagen de soporte" class="max-h-64 object-contain rounded border shadow-sm" onerror="this.style.display='none'">`;
        });
        imagesHTML += `</div>`;
    }

    questionBox.innerHTML = `${imagesHTML}<p class="text-xl font-medium text-gray-800 leading-relaxed">${q.text}</p>`;
    
    optionsBox.innerHTML = '';
    q.options.forEach((opt, index) => {
        const btn = document.createElement('button');
        btn.className = 'w-full text-left p-4 border rounded-lg hover:bg-gray-50 transition text-lg bg-white';
        btn.textContent = opt.text;
        btn.onclick = () => selectOption(btn, opt.isCorrect);
        optionsBox.appendChild(btn);
    });
}

// Lógica al seleccionar una respuesta
function selectOption(selectedBtn, isCorrect) {
    const allBtns = optionsBox.querySelectorAll('button');
    
    // Deshabilitar todos
    allBtns.forEach(btn => btn.disabled = true);

    if (isCorrect) {
        selectedBtn.classList.remove('hover:bg-gray-50', 'bg-white', 'border-gray-200');
        selectedBtn.classList.add('bg-green-100', 'border-green-500', 'text-green-800', 'font-bold');
        score++;
    } else {
        selectedBtn.classList.remove('hover:bg-gray-50', 'bg-white', 'border-gray-200');
        selectedBtn.classList.add('bg-red-100', 'border-red-500', 'text-red-800');
        
        // Pintar la correcta de verde
        const q = currentQuestions[currentQuestionIndex];
        q.options.forEach((opt, idx) => {
            if(opt.isCorrect) {
                allBtns[idx].classList.remove('bg-white', 'border-gray-200');
                allBtns[idx].classList.add('bg-green-100', 'border-green-500', 'text-green-800', 'font-bold');
            }
        });
    }

    btnNext.classList.remove('hidden');
}

// Botones de navegación
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
    menu.classList.remove('hidden');
};

function showResults() {
    quizContainer.classList.add('hidden');
    resultsContainer.classList.remove('hidden');
    
    const percentage = Math.round((score / currentQuestions.length) * 100);
    const scoreDisplay = document.getElementById('score-display');
    scoreDisplay.textContent = `${score} / ${currentQuestions.length} (${percentage}%)`;
    
    if(percentage >= 80) scoreDisplay.className = "text-5xl font-extrabold text-green-500 mb-6";
    else if(percentage >= 60) scoreDisplay.className = "text-5xl font-extrabold text-yellow-500 mb-6";
    else scoreDisplay.className = "text-5xl font-extrabold text-red-500 mb-6";
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
    menu.classList.remove('hidden');
};

// Iniciar
initMenu();