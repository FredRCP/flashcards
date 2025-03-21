document.addEventListener('keydown', (e) => {
    if (modal.style.display === 'flex') return;
    if (e.key === 'ArrowLeft') prevCard();
    if (e.key === 'ArrowRight') nextCard();
    if (e.key === '1') rateDifficulty(1);
    if (e.key === '2') rateDifficulty(2);
    if (e.key === '3') rateDifficulty(3);
});

// Declarações globais
const defaultFlashcards = [
    { front: "Qual é a capital do Brasil?", back: "Brasília", theme: "Geografia", interval: 1, nextReview: Date.now(), protected: true },
    { front: "Qual é o maior continente?", back: "Ásia", theme: "Geografia", interval: 1, nextReview: Date.now(), protected: true },
    { front: "Quem descobriu o Brasil?", back: "Pedro Álvares Cabral", theme: "História", interval: 1, nextReview: Date.now(), protected: true },
    { front: "O que faz display: flex?", back: "Ativa o Flexbox", theme: "Programação", interval: 1, nextReview: Date.now(), protected: true },
    { front: "Qual é a função principal dos rins?", back: "Filtrar o sangue", theme: "Nefrologia", interval: 1, nextReview: Date.now(), protected: true }
];

let flashcards = JSON.parse(localStorage.getItem('flashcards')) || [...defaultFlashcards];
let filteredFlashcards = [...flashcards];
let currentCard = 0;
let currentTheme = "all";
let editIndex = null;
let studyTime = parseInt(localStorage.getItem('studyTime')) || 0;
let lastInteraction = null;

let flashcardEl, themeSelect, statsEl, progressEl, modal, searchInput;

const themeIcons = {
    "Geografia": "fa-globe",
    "História": "fa-landmark",
    "Programação": "fa-code",
    "Nefrologia": "fa-heartbeat",
    "all": "fa-book"
};

// Função debounce
function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

function updateCard() {
    const frontTheme = document.getElementById('front-theme');
    const backTheme = document.getElementById('back-theme');
    const frontContent = document.getElementById('front-content');
    const backContent = document.getElementById('back-content');

    if (!frontContent || !backContent || !frontTheme || !backTheme) {
        console.error('Elementos do flashcard não encontrados');
        return;
    }

    if (filteredFlashcards.length === 0) {
        frontTheme.innerHTML = '';
        frontContent.textContent = "Nenhum cartão devido encontrado";
        backTheme.innerHTML = '';
        backContent.textContent = "Adicione ou ajuste a busca!";
        flashcardEl.classList.remove('flipped');
        flashcardEl.className = 'flashcard';
    } else {
        currentCard = Math.max(0, Math.min(currentCard, filteredFlashcards.length - 1));
        const card = filteredFlashcards[currentCard];
        const iconClass = themeIcons[card.theme] || themeIcons["all"];
        frontTheme.innerHTML = `<i class="fas ${iconClass}"></i> ${card.theme}`;
        frontContent.innerHTML = card.front;
        backTheme.innerHTML = `<i class="fas ${iconClass}"></i> ${card.theme}`;
        
        if (card.image) {
            backContent.innerHTML = `<img src="${card.image}" alt="Flashcard Image" style="max-width: 100%; max-height: 80%;">`;
        } else {
            backContent.innerHTML = card.back;
        }
        
        flashcardEl.className = 'flashcard theme-' + card.theme;
        flashcardEl.classList.remove('flipped');

        if (typeof MathJax !== 'undefined' && !card.image) {
            MathJax.typesetPromise([backContent]).catch(err => {
                console.error('Erro ao renderizar MathJax:', err);
                backContent.textContent += " (Erro na fórmula)";
            });
        }
    }
    updateProgress();
}

function flipCard() {
    flashcardEl.classList.toggle('flipped');
}

function openAddModal() {
    editIndex = null;
    document.getElementById('modal-title').textContent = "Adicionar Cartão";
    document.getElementById('modal-front').value = '';
    document.getElementById('modal-back').value = '';
    document.getElementById('modal-theme').value = '';
    modal.style.display = 'flex';
    document.getElementById('modal-front').focus();
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.style.display === 'flex') closeModal();
});

function openEditModal(index) {
    editIndex = index;
    const card = flashcards[index];
    document.getElementById('modal-title').textContent = "Editar Cartão";
    document.getElementById('modal-front').value = card.front;
    document.getElementById('modal-back').value = card.back;
    document.getElementById('modal-theme').value = card.theme;
    modal.style.display = 'flex';
    
    const cardList = document.getElementById('card-list');
    const toggleBtn = document.getElementById('toggle-card-list');
    if (cardList && toggleBtn) {
        console.log('Abrindo modal de edição, mostrando lista');
        updateCardList();
        cardList.style.display = 'block';
        toggleBtn.innerHTML = '<i class="fas fa-list"></i> Esconder Lista de Cartões';
    }
}

function closeModal() {
    modal.style.display = 'none';
}

function saveCardFromModal() {
    const frontInput = document.getElementById('modal-front');
    const backInput = document.getElementById('modal-back');
    const themeInput = document.getElementById('modal-theme');
    const fileInput = document.getElementById('modal-image');
    let imageData = '';

    frontInput.classList.remove('error');
    backInput.classList.remove('error');
    themeInput.classList.remove('error');

    let hasError = false;
    if (!frontInput.value.trim()) {
        frontInput.classList.add('error');
        hasError = true;
    }
    if (!backInput.value.trim() && !fileInput.files[0]) {
        backInput.classList.add('error');
        hasError = true;
    }
    if (!themeInput.value.trim()) {
        themeInput.classList.add('error');
        hasError = true;
    }

    if (hasError) {
        alert('Por favor, preencha a frente e o tema, e pelo menos o verso ou uma imagem!');
        return;
    }

    if (fileInput.files[0]) {
        const file = fileInput.files[0];
        if (file.size > 1024 * 1024) {
            alert("A imagem é muito grande! Limite: 1MB.");
            return;
        }
        const reader = new FileReader();
        reader.onload = function(e) {
            imageData = e.target.result;
            saveCard(frontInput.value, backInput.value, themeInput.value, imageData);
        };
        reader.readAsDataURL(file);
    } else {
        saveCard(frontInput.value, backInput.value, themeInput.value, imageData);
    }
}

function saveCard(front, back, theme, image) {
    if (front && (back || image) && theme) {
        const card = {
            front,
            back: back || '',
            image: image || '',
            theme,
            interval: 1,
            nextReview: Date.now(),
            protected: false
        };
        if (editIndex === null) {
            flashcards.push(card);
        } else {
            flashcards[editIndex] = { ...flashcards[editIndex], ...card };
        }
        saveFlashcards();
        updateCardList();
        updateThemeOptions();
        changeTheme();
        closeModal();
        document.getElementById('modal-image').value = '';
        document.getElementById('image-preview').style.display = 'none';
    }
}

function deleteCard(index) {
    if (flashcards[index].protected) {
        alert("Este cartão não pode ser excluído!");
        return;
    }
    if (confirm("Tem certeza que deseja excluir este cartão?")) {
        flashcards.splice(index, 1);
        saveFlashcards();
        updateCardList();
        updateThemeOptions();
        changeTheme();
    }
}

function rateDifficulty(difficulty) {
    if (filteredFlashcards.length === 0) return;
    const card = filteredFlashcards[currentCard];
    const now = Date.now();
    card.ease = card.ease || 2.5; // Fator inicial

    if (difficulty === 1) {
        card.interval = 1;
        card.ease = Math.max(1.3, card.ease - 0.8);
    } else if (difficulty === 2) {
        card.interval = card.interval * card.ease;
        card.ease -= 0.1;
    } else if (difficulty === 3) {
        card.interval = card.interval * card.ease;
        card.ease += 0.1;
    }

    card.interval = Math.min(card.interval, 30); // Limite máximo
    card.nextReview = now + card.interval * 24 * 60 * 60 * 1000;
    saveFlashcards();
    nextCard();
}

function nextCard() {
    if (filteredFlashcards.length === 0) return;
    flashcardEl.classList.remove('flipped');
    setTimeout(() => {
        currentCard = (currentCard + 1) % filteredFlashcards.length;
        updateCard();
    }, 300);
}

function prevCard() {
    if (filteredFlashcards.length === 0) return;
    flashcardEl.classList.remove('flipped');
    setTimeout(() => {
        currentCard = (currentCard - 1 + filteredFlashcards.length) % filteredFlashcards.length;
        updateCard();
    }, 300);
}

function sortFlashcards() {
    filteredFlashcards.sort((a, b) => a.nextReview - b.nextReview);
}

function saveFlashcards() {
    localStorage.setItem('flashcards', JSON.stringify(flashcards));
}

function updateCardList() {
    const cardList = document.getElementById('card-list');
    if (!cardList) {
        console.error('Elemento #card-list não encontrado!');
        return;
    }
    console.log('Preenchendo card-list com', flashcards.length, 'cartões');
    cardList.innerHTML = '';
    if (flashcards.length === 0) {
        cardList.innerHTML = '<p>Nenhum cartão disponível.</p>';
    } else {
        flashcards.forEach((card, index) => {
            const div = document.createElement('div');
            div.className = 'card-item';
            div.innerHTML = `
                <span>${card.theme}: ${card.front} - ${card.back}</span>
                <div>
                    <button class="edit-btn" onclick="openEditModal(${index})"><i class="fas fa-edit"></i> Editar</button>
                    ${card.protected ? '' : `<button onclick="deleteCard(${index})"><i class="fas fa-trash"></i> Excluir</button>`}
                </div>
            `;
            cardList.appendChild(div);
        });
    }
}

function updateThemeOptions() {
    if (!themeSelect) return;
    const themes = [...new Set(flashcards.map(card => card.theme))];
    themeSelect.innerHTML = '<option value="all">Todos os Temas</option>';
    themes.forEach(theme => {
        const option = document.createElement('option');
        option.value = theme;
        option.textContent = theme;
        themeSelect.appendChild(option);
    });
    themeSelect.value = currentTheme;
}

function changeTheme() {
    currentTheme = themeSelect.value;
    searchFlashcards();
}

function searchFlashcards() {
    const query = searchInput.value.toLowerCase();
    let baseFlashcards = currentTheme === "all" ? flashcards : flashcards.filter(card => card.theme === currentTheme);
    filteredFlashcards = baseFlashcards.filter(card => 
        (card.front.toLowerCase().includes(query) || card.back.toLowerCase().includes(query)) &&
        card.nextReview <= Date.now()
    );
    currentCard = 0;
    sortFlashcards();
    updateCard();
}

function updateStats() {
    const generalStats = document.getElementById('general-stats');
    const themeStats = document.getElementById('theme-stats');
    const timeStats = document.getElementById('time-stats');

    if (!generalStats || !themeStats || !timeStats) return;

    // Estatísticas gerais
    const total = flashcards.length;
    const difficult = flashcards.filter(c => c.interval <= 1).length;
    const medium = flashcards.filter(c => c.interval > 1 && c.interval <= 4).length;
    const easy = flashcards.filter(c => c.interval > 4).length;
    generalStats.innerHTML = `Total: ${total} | Difícil: ${difficult} | Médio: ${medium} | Fácil: ${easy}`;

    // Preparar dados por tema
    const themes = [...new Set(flashcards.map(card => card.theme))];
    let themeSummary = 'Progresso por tema:<br>';
    const themeData = {
        themes: themes,
        difficult: [],
        medium: [],
        easy: []
    };

    themes.forEach(theme => {
        const themeCards = flashcards.filter(c => c.theme === theme);
        const totalTheme = themeCards.length;
        const difficultTheme = themeCards.filter(c => c.interval <= 1).length;
        const mediumTheme = themeCards.filter(c => c.interval > 1 && c.interval <= 4).length;
        const easyTheme = themeCards.filter(c => c.interval > 4).length;

        themeSummary += `${theme}: ${totalTheme} cartões (Difícil: ${difficultTheme}, Médio: ${mediumTheme}, Fácil: ${easyTheme})<br>`;
        themeData.difficult.push(difficultTheme);
        themeData.medium.push(mediumTheme);
        themeData.easy.push(easyTheme);
    });
    themeStats.innerHTML = themeSummary;

    // Tempo de estudo
    if (lastInteraction) {
        const now = Date.now();
        studyTime += Math.floor((now - lastInteraction) / 1000);
        localStorage.setItem('studyTime', studyTime);
    }
    lastInteraction = Date.now();
    const minutes = Math.floor(studyTime / 60);
    const seconds = studyTime % 60;
    timeStats.textContent = `Tempo de estudo: ${minutes}m ${seconds}s`;

    // Criar gráfico
    const existingCanvas = themeStats.querySelector('canvas');
    if (existingCanvas) existingCanvas.remove(); // Remove gráfico antigo

    const ctx = document.createElement('canvas');
    themeStats.appendChild(ctx);
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: themeData.themes,
            datasets: [
                {
                    label: 'Fácil',
                    data: themeData.easy,
                    backgroundColor: 'rgba(75, 192, 192, 0.7)', // Verde
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Médio',
                    data: themeData.medium,
                    backgroundColor: 'rgba(255, 206, 86, 0.7)', // Amarelo
                    borderColor: 'rgba(255, 206, 86, 1)',
                    borderWidth: 1
                }, 
                {
                    label: 'Difícil',
                    data: themeData.difficult,
                    backgroundColor: 'rgba(255, 99, 132, 0.7)', // Vermelho
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                }               
            ]
        },
        options: {
            scales: {
                y: { beginAtZero: true, title: { display: true, text: 'Número de Cartões' } },
                x: { title: { display: true, text: 'Temas' } }
            },
            plugins: {
                legend: { display: true, position: 'top' }
            }
        }
    });
}

function updateProgress() {
    const total = filteredFlashcards.length;
    const progress = total === 0 ? 0 : ((currentCard + 1) / total) * 100;
    progressEl.style.width = `${progress}%`;
    progressEl.textContent = total === 0 ? "0/0" : `${currentCard + 1}/${total}`;
}

let studyInterval = null;

function startStudyTimer() {
    if (!studyInterval) {
        lastInteraction = Date.now();
        studyInterval = setInterval(() => {
            const now = Date.now();
            studyTime += Math.floor((now - lastInteraction) / 1000);
            lastInteraction = now;
            localStorage.setItem('studyTime', studyTime);
        }, 1000);
    }
}

function stopStudyTimer() {
    if (studyInterval) {
        clearInterval(studyInterval);
        studyInterval = null;
    }
}

function showTab(tabId) {
    const currentActive = document.querySelector('.tab-content.active');
    if (currentActive) {
        currentActive.classList.remove('active');
        setTimeout(() => {
            currentActive.style.display = 'none'; // Esconde após a transição
        }, 300); // Tempo igual à duração da transição no CSS
    }

    document.querySelectorAll('nav a').forEach(a => a.classList.remove('active'));
    
    const newTab = document.getElementById(tabId);
    newTab.style.display = 'block'; // Mostra imediatamente
    setTimeout(() => newTab.classList.add('active'), 10); // Adiciona 'active' com delay mínimo para disparar a transição
    
    document.querySelector(`nav a[onclick="showTab('${tabId}'); return false;"]`).classList.add('active');
    
    if (tabId === 'study') {
        updateCard();
        startStudyTimer();
    } else {
        stopStudyTimer();
        if (tabId === 'stats') {
            updateStats();
        }
    }
}

function toggleTheme() {
    document.body.classList.toggle('light');
    document.body.classList.toggle('dark');
    localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
}

function exportFlashcards() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(flashcards));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "flashcards.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

function importFlashcards(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const imported = JSON.parse(e.target.result);
            flashcards = imported.map(card => ({
                ...card,
                nextReview: card.nextReview || Date.now(),
                interval: card.interval || 1,
                protected: card.protected || false
            }));
            saveFlashcards();
            updateCardList();
            updateThemeOptions();
            changeTheme();
            alert("Flashcards importados com sucesso!");
        } catch (err) {
            alert("Erro ao importar flashcards: " + err.message);
        }
    };
    reader.readAsText(file);
}

let currentTextareaId = null;

function insertFormula(textareaId) {
    currentTextareaId = textareaId;
    document.getElementById('formula-modal').style.display = 'flex';
    document.getElementById('formula-input').value = '';
    updateFormulaPreview();
}

function closeFormulaModal() {
    document.getElementById('formula-modal').style.display = 'none';
}

function saveFormula() {
    const formula = document.getElementById('formula-input').value;
    if (formula) {
        const textarea = document.getElementById(currentTextareaId);
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const formattedFormula = `\( ${formula} \)`;
        textarea.value = text.substring(0, start) + formattedFormula + text.substring(end);
    }
    closeFormulaModal();
}

function updateFormulaPreview() {
    const input = document.getElementById('formula-input');
    const preview = document.getElementById('formula-preview');
    preview.innerHTML = `\( ${input.value || 'Pré-visualização'} \}`;
    if (typeof MathJax !== 'undefined') {
        MathJax.typesetPromise([preview]).catch(err => console.error('Erro ao renderizar MathJax:', err));
    }
}

function previewImage() {
    const fileInput = document.getElementById('modal-image');
    const preview = document.getElementById('image-preview');
    const file = fileInput.files[0];

    if (file) {
        if (file.size > 1024 * 1024) {
            alert("A imagem é muito grande! Limite: 1MB.");
            fileInput.value = '';
            preview.style.display = 'none';
            return;
        }
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    } else {
        preview.innerHTML = '';
        preview.style.display = 'none';
    }
}

function initializeFlashcards() {
    flashcards = JSON.parse(localStorage.getItem('flashcards')) || [...defaultFlashcards];
    filteredFlashcards = [...flashcards];
    sortFlashcards();
    updateCardList();
    updateThemeOptions();
    updateCard();
    const cardList = document.getElementById('card-list');
    if (cardList) {
        console.log('Inicializando: ocultando card-list');
        cardList.style.display = 'none';
    } else {
        console.error('Elemento #card-list não encontrado na inicialização!');
    }
}

function toggleCardList() {
    const cardList = document.getElementById('card-list');
    const toggleBtn = document.getElementById('toggle-card-list');
    if (!cardList || !toggleBtn) {
        console.error('Elementos #card-list ou #toggle-card-list não encontrados!');
        return;
    }
    console.log('Alternando visibilidade da lista');
    updateCardList();
    if (cardList.style.display === 'none' || cardList.style.display === '') {
        cardList.style.display = 'block';
        toggleBtn.innerHTML = '<i class="fas fa-list"></i> Esconder Lista de Cartões';
        console.log('Lista agora visível');
    } else {
        cardList.style.display = 'none';
        toggleBtn.innerHTML = '<i class="fas fa-list"></i> Ver Lista de Cartões';
        console.log('Lista agora oculta');
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    flashcardEl = document.getElementById('flashcard');
    themeSelect = document.getElementById('theme-select');
    statsEl = document.getElementById('stats');
    progressEl = document.getElementById('progress');
    modal = document.getElementById('modal');
    searchInput = document.getElementById('search');

    if (!flashcardEl || !themeSelect || !statsEl || !progressEl || !modal || !searchInput) {
        console.error('Um ou mais elementos essenciais não foram encontrados no DOM!');
        return;
    }

    flashcardEl.addEventListener('click', flipCard);
    searchInput.addEventListener('keyup', debounce(searchFlashcards, 300));
    document.getElementById('formula-input')?.addEventListener('input', updateFormulaPreview);

    initializeFlashcards();
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.remove('light');
        document.body.classList.add('dark');
    }
    showTab('home');
});