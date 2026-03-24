const exams = [
    { folder: 'Examen1', file: 'Examen1_Estructuras_DNA.txt', name: 'Examen 1 - Estructuras DNA' },
    { folder: 'Examen2', file: 'Examen2_Transc.txt', name: 'Examen 2 - Transcripción' }
];

// Mapeo para las imágenes que están divididas en varias
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
        btn.className = 'w-full p-6 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl hover:bg-blue-600 hover:text-white transition shadow-sm font-semibold text-lg text-left md:text-center';
        btn.textContent = exam.name;
        btn.onclick = () => loadExam(exam);
        examList.appendChild(btn);
    });
}

// Cargar y procesar el archivo de texto
async function loadExam(exam) {
    try {
        currentExamFolder = exam.folder;
        // Agregamos un timestamp para evitar problemas de caché al recargar la página
        const response = await fetch(`${exam.folder}/${exam.file}?t=${new Date().getTime()}`);
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
        alert('Error al cargar el examen. Asegúrate de estar corriendo tu servidor local o que GitHub Pages ya haya publicado los cambios.');
        console.error(error);
    }
}

// Nuevo Parseador: Lee línea por línea de forma inteligente
function parseExamData(text) {
    let questions = [];
    let currentQ = null;

    // Limpiar saltos de línea raros (Windows vs Linux)
    const lines = text.replace(/\r/g, '').split('\n');
    
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        if (!line) continue;

        // Detectar si la línea es una opción de respuesta (Ej: "1.1.a.", "1.1.a.*.", "1.1.b. Texto")
        const optRegex = /^\d+\.\d+\.[a-z]\.?(\*)?\.?\s*(.*)/;
        const optMatch = line.match(optRegex);

        if (optMatch) {
            if (currentQ) {
                currentQ.options.push({
                    text: optMatch[2],
                    // Validamos si tiene el asterisco en el grupo regex o en la línea completa
                    isCorrect: optMatch[1] === '*' || line.includes('*') 
                });
            }
        } else {
            // Detectar si es una nueva pregunta (Ej: "1.1. Pregunta...")
            const qStartRegex = /^(\d+\.\d+)\.\s*(.*)/;
            const qMatch = line.match(qStartRegex);

            if (qMatch) {
                // Si ya había una pregunta armándose, la guardamos
                if (currentQ && currentQ.options.length > 0) {
                    questions.push(currentQ);
                }
                currentQ = {
                    text: qMatch[2] || line.replace(/^(\d+\.\d+)\.\s*/, ''), 
                    images: [],
                    options: []
                };
            } else if (currentQ && currentQ.options.length === 0) {
                // Si aún no tiene opciones, es la continuación del texto de la pregunta principal
                currentQ.text += " " + line;
            } else if (currentQ && currentQ.options.length > 0) {
                // Si ya tiene opciones, probablemente sea una opción larga que brincó de renglón
                currentQ.options[currentQ.options.length - 1].text += " " + line;
            }
        }
    }
    
    // Guardar la última pregunta del documento
    if (currentQ && currentQ.options.length > 0) {
        questions.push(currentQ);
    }

    // Post-procesamiento: Extraer imágenes y limpiar todo el texto entre corchetes [...]
    questions.forEach(q => {
        // Buscar el nombre del archivo dentro de los corchetes
        const imgRegex = /\[.*?([a-zA-Z0-9_]+)\.(png|jpg).*?\]/gi;
        let match;
        while ((match = imgRegex.exec(q.text)) !== null) {
            let baseName = match[1]; // ej. "pentosas" o "terminacion_rho"
            if (imageMap[baseName]) {
                q.images.push(...imageMap[baseName]); // Si requiere varias imágenes
            } else {
                q.images.push(baseName + '.png'); // Forzamos .png porque así están en tu carpeta
            }
        }
        
        // Magia: Eliminar todo lo que esté entre corchetes [...] del texto final
        q.text = q.text.replace(/\[.*?\]/g, '').trim();
    });

    return questions;
}

// Mostrar pregunta actual
function showQuestion() {
    btnNext.classList.add('hidden');
    const q = currentQuestions[currentQuestionIndex];
    questionCounter.textContent = `Pregunta ${currentQuestionIndex + 1} / ${currentQuestions.length}`;
    
    // Renderizar imágenes (adaptables a celular gracias a Tailwind)
    let imagesHTML = '';
    if (q.images && q.images.length > 0) {
        imagesHTML = `<div class="flex flex-col md:flex-row flex-wrap gap-4 mb-6 justify-center">`;
        q.images.forEach(img => {
            imagesHTML += `<img src="${currentExamFolder}/${img}" alt="Imagen de soporte" class="w-full md:w-auto max-h-64 object-contain rounded-lg border shadow-md" onerror="this.style.display='none'">`;
        });
        imagesHTML += `</div>`;
    }

    questionBox.innerHTML = `${imagesHTML}<p class="text-xl md:text-2xl font-medium text-gray-800 leading-relaxed">${q.text}</p>`;
    
    optionsBox.innerHTML = '';
    q.options.forEach((opt, index) => {
        const btn = document.createElement('button');
        // Clases pensadas para que se vean bien y sean fáciles de tocar en celulares
        btn.className = 'w-full text-left p-4 md:p-5 border-2 rounded-xl hover:bg-gray-50 transition text-lg bg-white mb-3 shadow-sm active:scale-95';
        btn.textContent = opt.text;
        btn.onclick = () => selectOption(btn, opt.isCorrect);
        optionsBox.appendChild(btn);
    });
}

// Lógica al seleccionar una respuesta
function selectOption(selectedBtn, isCorrect) {
    const allBtns = optionsBox.querySelectorAll('button');
    
    // Deshabilitar todos los botones para que no seleccione otra vez
    allBtns.forEach(btn => btn.disabled = true);

    if (isCorrect) {
        selectedBtn.classList.remove('hover:bg-gray-50', 'bg-white', 'border-gray-200');
        selectedBtn.classList.add('bg-green-100', 'border-green-500', 'text-green-900', 'font-bold');
        score++;
    } else {
        selectedBtn.classList.remove('hover:bg-gray-50', 'bg-white', 'border-gray-200');
        selectedBtn.classList.add('bg-red-100', 'border-red-500', 'text-red-900', 'font-semibold');
        
        // Pintar la correcta de verde para que el usuario aprenda
        const q = currentQuestions[currentQuestionIndex];
        q.options.forEach((opt, idx) => {
            if(opt.isCorrect) {
                allBtns[idx].classList.remove('bg-white', 'border-gray-200');
                allBtns[idx].classList.add('bg-green-100', 'border-green-500', 'text-green-900', 'font-bold');
            }
        });
    }

    btnNext.classList.remove('hidden');
}

// Navegación
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

// Iniciar aplicación
initMenu();