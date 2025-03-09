        // Declarações globais
        const defaultFlashcards = [
            { front: "Qual é a capital do Brasil?", back: "Brasília", theme: "Geografia", interval: 1, nextReview: Date.now(), protected: true },
            { front: "Qual é o maior continente?", back: "Ásia", theme: "Geografia", interval: 1, nextReview: Date.now(), protected: true },
            { front: "Quem descobriu o Brasil?", back: "Pedro Álvares Cabral", theme: "História", interval: 1, nextReview: Date.now(), protected: true },
            { front: "O que faz display: flex?", back: "Ativa o Flexbox", theme: "Programação", interval: 1, nextReview: Date.now(), protected: true },
            { front: "Qual é a função principal dos rins?", back: "Filtrar o sangue", theme: "Nefrologia", interval: 1, nextReview: Date.now(), protected: true }
        ];

        let studyTime = parseInt(localStorage.getItem('studyTime')) || 0;
        let lastInteraction = null;
        let flashcards = JSON.parse(localStorage.getItem('flashcards')) || [...defaultFlashcards];
        let filteredFlashcards = [...flashcards];
        let currentCard = 0;
        let currentTheme = "all";
        let editIndex = null;
        

        let flashcardEl, front, back, themeSelect, statsEl, progressEl, modal, searchInput;

        const themeIcons = {
            "Geografia": "fa-globe",
            "História": "fa-landmark",
            "Programação": "fa-code",
            "Nefrologia": "fa-heartbeat",
            "all": "fa-book" // Ícone padrão para "Todos os Temas"
        };

        function updateCard() {
            console.log('Atualizando cartão...');
            console.log('Flashcards disponíveis:', filteredFlashcards);
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
                frontContent.textContent = "Nenhum cartão encontrado";
                backTheme.innerHTML = '';
                backContent.textContent = "Adicione ou ajuste a busca!";
                flashcardEl.classList.remove('flipped');
                flashcardEl.className = 'flashcard';
            } else {
                currentCard = Math.max(0, Math.min(currentCard, filteredFlashcards.length - 1));
                const card = filteredFlashcards[currentCard];
                const iconClass = themeIcons[card.theme] || themeIcons["all"];
                frontTheme.innerHTML = `<i class="fas ${iconClass}"></i> ${card.theme}`;
                frontContent.textContent = card.front;
                backTheme.innerHTML = `<i class="fas ${iconClass}"></i> ${card.theme}`;
                backContent.textContent = card.back;
                flashcardEl.className = 'flashcard theme-' + card.theme;
                flashcardEl.classList.remove('flipped');
            }
            updateProgress();
        }

        function flipCard() {
            flashcardEl.classList.toggle('flipped');
        }

        function nextCard() {
            if (filteredFlashcards.length === 0) return;
            flashcardEl.classList.remove('flipped');
            setTimeout(() => {
                currentCard = (currentCard + 1) % filteredFlashcards.length;
                sortFlashcards();
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

        function openAddModal() {
            editIndex = null;
            document.getElementById('modal-title').textContent = "Adicionar Cartão";
            document.getElementById('modal-front').value = '';
            document.getElementById('modal-back').value = '';
            document.getElementById('modal-theme').value = '';
            modal.style.display = 'flex';
        }

        function openEditModal(index) {
            editIndex = index;
            const card = flashcards[index];
            document.getElementById('modal-title').textContent = "Editar Cartão";
            document.getElementById('modal-front').value = card.front;
            document.getElementById('modal-back').value = card.back;
            document.getElementById('modal-theme').value = card.theme;
            modal.style.display = 'flex';
        }

        function closeModal() {
            modal.style.display = 'none';
        }

        function saveCardFromModal() {
            const newFront = document.getElementById('modal-front').value;
            const newBack = document.getElementById('modal-back').value;
            const newTheme = document.getElementById('modal-theme').value.trim();

            if (newFront && newBack && newTheme) {
                if (editIndex === null) {
                    flashcards.push({ front: newFront, back: newBack, theme: newTheme, interval: 1, nextReview: Date.now(), protected: false });
                } else {
                    flashcards[editIndex] = { ...flashcards[editIndex], front: newFront, back: newBack, theme: newTheme };
                }
                saveFlashcards();
                updateCardList();
                updateThemeOptions();
                changeTheme();
                closeModal();
            } else {
                alert("Preencha todos os campos!");
            }
        }

        function deleteCard(index) {
            if (flashcards[index].protected) {
                alert("Este cartão não pode ser excluído!");
                return;
            }
            flashcards.splice(index, 1);
            saveFlashcards();
            updateCardList();
            updateThemeOptions();
            changeTheme();
        }

        function rateDifficulty(difficulty) {
            if (filteredFlashcards.length === 0) return;
            const card = filteredFlashcards[currentCard];
            const now = Date.now();
            
            if (difficulty === 1) card.interval = 1;
            else if (difficulty === 2) card.interval = Math.min(card.interval * 2, 30);
            else if (difficulty === 3) card.interval = Math.min(card.interval * 4, 30);
            
            card.nextReview = now + card.interval * 24 * 60 * 60 * 1000;
            saveFlashcards();
            flashcardEl.classList.remove('flipped');
            setTimeout(nextCard, 200);
        }

        function nextCard() {
            if (filteredFlashcards.length === 0) return;
            flashcardEl.classList.remove('flipped');
            setTimeout(() => {
                currentCard = (currentCard + 1) % filteredFlashcards.length;
                sortFlashcards();
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
            filteredFlashcards.sort((a, b) => {
                const now = Date.now();
                const aDue = a.nextReview <= now ? -1 : 1;
                const bDue = b.nextReview <= now ? -1 : 1;
                return aDue - bDue || a.nextReview - b.nextReview;
            });
        }

        function saveFlashcards() {
            localStorage.setItem('flashcards', JSON.stringify(flashcards));
        }

        function updateCardList() {
            const cardList = document.getElementById('card-list');
            cardList.innerHTML = '';
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

        function updateThemeOptions() {
            if (!themeSelect) {
                console.error('Elemento theme-select não encontrado');
                return;
            }
            console.log('Atualizando opções de tema...');
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
                card.front.toLowerCase().includes(query) || card.back.toLowerCase().includes(query)
            );
            currentCard = 0;
            sortFlashcards();
            updateCard();
        }

        function updateStats() {
            const generalStats = document.getElementById('general-stats');
            const themeStats = document.getElementById('theme-stats');
            const timeStats = document.getElementById('time-stats');
        
            if (!generalStats || !themeStats || !timeStats) return; // Só atualiza se os elementos existirem
        
            // Estatísticas gerais
            const total = flashcards.length; // Usamos flashcards inteiros, não filtrados
            const difficult = flashcards.filter(c => c.interval <= 1).length;
            const medium = flashcards.filter(c => c.interval > 1 && c.interval <= 4).length;
            const easy = flashcards.filter(c => c.interval > 4).length;
            generalStats.textContent = `Total: ${total} | Difícil: ${difficult} | Médio: ${medium} | Fácil: ${easy}`;
        
            // Estatísticas por tema
            const themes = [...new Set(flashcards.map(card => card.theme))];
            let themeSummary = 'Progresso por tema:<br>';
            themes.forEach(theme => {
                const themeCards = flashcards.filter(c => c.theme === theme);
                const totalTheme = themeCards.length;
                const easyTheme = themeCards.filter(c => c.interval > 4).length;
                const progress = totalTheme > 0 ? Math.round((easyTheme / totalTheme) * 100) : 0;
                themeSummary += `${theme}: ${totalTheme} cartões, ${progress}% fácil<br>`;
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
        }

        function updateProgress() {
            const total = filteredFlashcards.length;
            const progress = total === 0 ? 0 : ((currentCard + 1) / total) * 100;
            progressEl.style.width = `${progress}%`;
        }

        function showTab(tabId) {
            document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
            document.querySelectorAll('nav a').forEach(a => a.classList.remove('active'));
            document.getElementById(tabId).classList.add('active');
            document.querySelector(`nav a[onclick="showTab('${tabId}'); return false;"]`).classList.add('active');
            if (tabId === 'study') {
                updateCard();
            } else if (tabId === 'stats') {
                updateStats(); // Atualiza apenas quando a aba Estatísticas é aberta
            }
        }

        function toggleTheme() {
            document.body.classList.toggle('light');
            document.body.classList.toggle('dark');
            localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
        }

        // Inicialização após o DOM estar carregado
        document.addEventListener('DOMContentLoaded', () => {
            flashcardEl = document.getElementById('flashcard');
            // Removemos front e back antigos
            themeSelect = document.getElementById('theme-select');
            statsEl = document.getElementById('stats');
            progressEl = document.getElementById('progress');
            modal = document.getElementById('modal');
            searchInput = document.getElementById('search');
        
            console.log('Iniciando app...');
            console.log('Flashcards carregados:', flashcards);
            if (localStorage.getItem('theme') === 'dark') {
                document.body.classList.remove('light');
                document.body.classList.add('dark');
            }
            updateThemeOptions();
            filteredFlashcards = [...flashcards];
            sortFlashcards();
            updateCardList();
            showTab('home'); // Exibe a aba Home por padrão
        });
