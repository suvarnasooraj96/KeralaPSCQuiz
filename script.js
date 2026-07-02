/**
 * Kerala PSC Quiz Application State Machine
 */
class QuizApp {
    constructor() {
        this.totalParts = 20; 
        this.currentPart = null;
        this.currentMode = null;
        this.questionsPool = [];
        this.quizSessionQuestions = [];
        this.currentIndex = 0;
        this.selectedAnswer = null;
        
        // Session Analytics Tracker
        this.sessionHistory = []; 
        this.viewStack = ['view-home'];

        // LocalStorage Cache Enclaves
        this.storageKeys = {
            favorites: 'kpsc_ph_favs',
            progress: 'kpsc_ph_progress_v1',
            theme: 'kpsc_ph_theme'
        };

        this.init();
    }

    init() {
        this.renderPartsGrid();
        this.initTheme();
        this.setupGlobalListeners();
        // Setup direct search typing processing
        document.getElementById('search-input').addEventListener('input', () => this.executeSearch());
    }

    // View Navigation Control Stack Engine
    switchView(targetViewId, saveToStack = true) {
        document.querySelectorAll('.view').forEach(view => view.classList.add('hidden'));
        document.getElementById(targetViewId).classList.remove('hidden');

        if (saveToStack && this.viewStack[this.viewStack.length - 1] !== targetViewId) {
            this.viewStack.push(targetViewId);
        }

        const backBtn = document.getElementById('global-back-btn');
        if (this.viewStack.length > 1) {
            backBtn.classList.remove('hidden');
        } else {
            backBtn.classList.add('hidden');
        }
        
        // Clean routing initializations 
        if (targetViewId === 'view-favorites') this.renderFavorites();
        if (targetViewId === 'view-progress') this.renderProgressReport();
    }

    navigateBack() {
        if (this.viewStack.length <= 1) return;
        this.viewStack.pop(); // Remove present view
        const targetView = this.viewStack[this.viewStack.length - 1];
        this.switchView(targetView, false);
    }

    renderPartsGrid() {
        const grid = document.getElementById('parts-grid');
        grid.innerHTML = '';
        for (let i = 1; i <= this.totalParts; i++) {
            const tile = document.createElement('div');
            tile.className = 'part-tile';
            tile.innerHTML = `<span>📚</span><div style="margin-top:8px;">Part ${i}</div>`;
            tile.onclick = () => this.selectPart(i);
            grid.appendChild(tile);
        }
    }

    async selectPart(partNum) {
        this.currentPart = partNum;
        document.getElementById('selected-part-title').innerText = `Part ${partNum} Practice`;
        this.switchView('view-modes');
        
        // Dynamic loading wrapper for chunks
        await this.loadPartData(partNum);
    }

    loadPartData(partNum) {
        return new Promise((resolve, reject) => {
            const varName = `quizPart${partNum}`;
            if (window[varName]) {
                this.questionsPool = window[varName];
                resolve();
                return;
            }
            // Dynamic script lazy-loading injection
            const script = document.createElement('script');
            script.src = `questions/part${partNum}.js`;
            script.onload = () => {
                if (window[varName]) {
                    this.questionsPool = window[varName];
                    resolve();
                } else {
                    reject(new Error(`Namespace execution injection fault inside Part: ${partNum}`));
                }
            };
            script.onerror = () => reject(new Error(`Offline resource path missing for part ${partNum}`));
            document.head.appendChild(script);
        });
    }

    startQuiz(mode) {
        this.currentMode = mode;
        this.currentIndex = 0;
        this.sessionHistory = [];

        // Clone context configuration pool safely
        let rawPool = [...this.questionsPool];

        if (mode === 'quick') {
            this.quizSessionQuestions = this.shuffleArray(rawPool).slice(0, 10);
        } else if (mode === 'standard') {
            this.quizSessionQuestions = this.shuffleArray(rawPool).slice(0, 25);
        } else if (mode === 'mock') {
            this.quizSessionQuestions = this.shuffleArray(rawPool).slice(0, 50);
        } else {
            // Practice All Configuration
            this.quizSessionQuestions = rawPool; 
        }

        this.switchView('view-quiz');
        this.renderQuestionWorkspace();
    }

    renderQuestionWorkspace() {
        this.selectedAnswer = null;
        const qData = this.quizSessionQuestions[this.currentIndex];
        
        // Update Metadata trackers
        document.getElementById('quiz-q-counter').innerText = `Question ${this.currentIndex + 1} / ${this.quizSessionQuestions.length}`;
        const fillPercent = ((this.currentIndex) / this.quizSessionQuestions.length) * 100;
        document.getElementById('quiz-progress-fill').style.width = `${fillPercent}%`;
        
        // Question Injection
        document.getElementById('quiz-question-text').innerText = qData.question;
        
        // Star bookmark system visual update
        const favBtn = document.getElementById('fav-toggle-btn');
        favBtn.innerText = this.isBookmarked(qData.id) ? '⭐ Bookmarked' : '☆ Bookmark';
        favBtn.onclick = () => this.toggleBookmark(qData);

        // Process Options rendering
        const container = document.getElementById('quiz-options-container');
        container.innerHTML = '';
        
        document.getElementById('quiz-feedback-box').classList.add('hidden');
        
        // Optional shuffling array calculation logic for variant alternatives
        const keys = ['A', 'B', 'C', 'D'];
        
        keys.forEach(key => {
            const btn = document.createElement('button');
            btn.className = 'option-node';
            btn.innerHTML = `<strong>${key}:</strong> &nbsp; ${qData.options[key]}`;
            btn.onclick = () => this.handleOptionSelection(key, btn);
            container.appendChild(btn);
        });

        // Toggle visibility on Nav layout elements
        document.getElementById('quiz-prev-btn').style.visibility = this.currentIndex > 0 ? 'visible' : 'hidden';
        document.getElementById('quiz-next-btn').innerText = this.currentIndex === (this.quizSessionQuestions.length - 1) ? 'Finish Evaluation' : 'Next Question';
    }

    handleOptionSelection(selectedKey, selectedBtnElement) {
        const qData = this.quizSessionQuestions[this.currentIndex];
        if (this.selectedAnswer !== null) return; // Block double-clicks

        this.selectedAnswer = selectedKey;
        const container = document.getElementById('quiz-options-container');
        const optionsButtons = container.querySelectorAll('.option-node');
        
        // Deactivate full element sets
        optionsButtons.forEach(btn => btn.setAttribute('disabled', 'true'));

        const feedbackBox = document.getElementById('quiz-feedback-box');
        const feedbackTitle = document.getElementById('feedback-title');
        
        const isCorrect = selectedKey === qData.answer;
        this.sessionHistory.push({
            questionId: qData.id,
            questionText: qData.question,
            explanation: qData.explanation,
            userChoice: selectedKey,
            correctChoice: qData.answer,
            passed: isCorrect
        });

        if (isCorrect) {
            selectedBtnElement.classList.add('correct-state');
            feedbackBox.className = "card feedback-card correct";
            feedbackTitle.innerText = "✨ Correct Answer";
        } else {
            selectedBtnElement.classList.add('wrong-state');
            feedbackBox.className = "card feedback-card incorrect";
            feedbackTitle.innerText = "❌ Incorrect Selection";
            
            // Highlight the correct solution mapping explicitly
            const correctIndex = ['A','B','C','D'].indexOf(qData.answer);
            if(correctIndex !== -1) {
                optionsButtons[correctIndex].classList.add('correct-state');
            }
        }

        document.getElementById('quiz-explanation-text').innerText = qData.explanation || "No extension feedback profile given for this segment question.";
        feedbackBox.classList.remove('hidden');
    }

    nextQuestion() {
        if (this.selectedAnswer === null) {
            alert('Please pick an answer configuration option to proceed.');
            return;
        }

        if (this.currentIndex < this.quizSessionQuestions.length - 1) {
            this.currentIndex++;
            this.renderQuestionWorkspace();
        } else {
            this.processAndShowResults();
        }
    }

    prevQuestion() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this.renderQuestionWorkspace();
            // Pull historic options state if necessary, or let practice loop allow clear overwrite updates
        }
    }

    processAndShowResults() {
        const total = this.quizSessionQuestions.length;
        const correctCount = this.sessionHistory.filter(item => item.passed).length;
        const wrongCount = total - correctCount;
        const percentage = total > 0 ? Math.round((correctCount / total) * 100) : 0;

        document.getElementById('res-percentage').innerText = `${percentage}%`;
        document.getElementById('res-score-ratio').innerText = `Score: ${correctCount} / ${total}`;
        document.getElementById('res-correct-count').innerText = correctCount;
        document.getElementById('res-wrong-count').innerText = wrongCount;

        const errorReviewBtn = document.getElementById('review-errors-btn');
        if (wrongCount === 0) {
            errorReviewBtn.classList.add('hidden');
        } else {
            errorReviewBtn.classList.remove('hidden');
        }

        this.persistProgressMetrics(percentage);
        this.switchView('view-results');
    }

    retryCurrentQuiz() {
        this.startQuiz(this.currentMode);
    }

    startErrorReview() {
        const errors = this.sessionHistory.filter(item => !item.passed);
        if(errors.length === 0) return;

        // Repurpose target container data models instantly to view stack configuration arrays
        this.quizSessionQuestions = errors.map(err => ({
            id: err.questionId,
            question: err.questionText,
            options: this.quizSessionQuestions.find(q => q.id === err.questionId).options,
            answer: err.correctChoice,
            explanation: err.explanation
        }));

        this.currentMode = 'error_review';
        this.currentIndex = 0;
        this.sessionHistory = [];
        this.switchView('view-quiz');
        this.renderQuestionWorkspace();
    }

    // Bookmarks Domain Logic Modules
    getFavorites() {
        return JSON.parse(localStorage.getItem(this.storageKeys.favorites)) || [];
    }

    isBookmarked(id) {
        return this.getFavorites().some(item => item.id === id);
    }

    toggleBookmark(questionObj) {
        let favs = this.getFavorites();
        if (this.isBookmarked(questionObj.id)) {
            favs = favs.filter(item => item.id !== questionObj.id);
        } else {
            favs.push(questionObj);
        }
        localStorage.setItem(this.storageKeys.favorites, JSON.stringify(favs));
        
        // Live state rendering update on execution view elements
        const favBtn = document.getElementById('fav-toggle-btn');
        if(favBtn) favBtn.innerText = this.isBookmarked(questionObj.id) ? '⭐ Bookmarked' : '☆ Bookmark';
    }

    renderFavorites() {
        const container = document.getElementById('favorites-list');
        container.innerHTML = '';
        const favs = this.getFavorites();

        if (favs.length === 0) {
            container.innerHTML = `<p style="text-align:center;color:var(--text-muted);padding:20px;">No bookmarked items found.</p>`;
            return;
        }

        favs.forEach(q => {
            const div = document.createElement('div');
            div.className = 'card inline-q-item';
            div.innerHTML = `
                <h4>${q.question}</h4>
                <p style="color:var(--success); font-weight:600; margin-bottom:4px;">Ans: Choice ${q.answer} - ${q.options[q.answer]}</p>
                <p><em>Expl: ${q.explanation}</em></p>
                <button class="fav-star-btn" style="margin-top:10px; display:block;" onclick="app.removeFavoriteDirect('${q.id}')">🗑️ Remove</button>
            `;
            container.appendChild(div);
        });
    }

    removeFavoriteDirect(id) {
        let favs = this.getFavorites().filter(item => item.id !== id);
        localStorage.setItem(this.storageKeys.favorites, JSON.stringify(favs));
        this.renderFavorites();
    }

    // Comprehensive Async Substring Search Mechanics Over Global Array Part Elements
    async executeSearch() {
        const query = document.getElementById('search-input').value.toLowerCase().strip();
        const output = document.getElementById('search-results-output');
        output.innerHTML = '';

        if (query.length < 3) {
            output.innerHTML = `<p style="color:var(--text-muted); text-align:center;">Type at least 3 characters to execute query scanning...</p>`;
            return;
        }

        output.innerHTML = `<p style="color:var(--text-muted); text-align:center;">Scanning master sheets...</p>`;

        let results = [];
        // Cycle parts iteration checking dynamically safely
        for (let i = 1; i <= this.totalParts; i++) {
            await this.loadPartData(i);
            const matches = window[`quizPart${i}`].filter(q => q.question.toLowerCase().includes(query));
            results.push(...matches);
            if (results.length > 40) break; // Optimization limit threshold cap for DOM responsiveness
        }

        output.innerHTML = '';
        if (results.length === 0) {
            output.innerHTML = `<p style="color:var(--text-muted); text-align:center;">No match criteria fits your input definition.</p>`;
            return;
        }

        results.forEach(q => {
            const div = document.createElement('div');
            div.className = 'card inline-q-item';
            div.innerHTML = `
                <h4>${q.question}</h4>
                <p style="color:var(--accent); font-weight:500;">Correct Variant Option Choice: ${q.answer}</p>
            `;
            output.appendChild(div);
        });
    }

    // Persistance Optimization metrics Layer Engine
    persistProgressMetrics(lastPercentage) {
        let progress = JSON.parse(localStorage.getItem(this.storageKeys.progress)) || {};
        const pKey = `part_${this.currentPart}`;

        if (!progress[pKey]) {
            progress[pKey] = { attempts: 0, highestScore: 0 };
        }

        progress[pKey].attempts += 1;
        if (lastPercentage > progress[pKey].highestScore) {
            progress[pKey].highestScore = lastPercentage;
        }
        progress[pKey].lastAttemptTimestamp = new Date().toLocaleDateString();

        localStorage.setItem(this.storageKeys.progress, JSON.stringify(progress));
    }

    renderProgressReport() {
        const progress = JSON.parse(localStorage.getItem(this.storageKeys.progress)) || {};
        const trackedKeys = Object.keys(progress);
        const totalTouched = trackedKeys.length;

        document.getElementById('metrics-parts-touched').innerText = `${totalTouched} / ${this.totalParts}`;
        
        let maxScore = 0;
        trackedKeys.forEach(k => {
            if (progress[k].highestScore > maxScore) maxScore = progress[k].highestScore;
        });
        document.getElementById('metrics-max-score').innerText = `${maxScore}%`;

        const listContainer = document.getElementById('progress-parts-breakdown');
        listContainer.innerHTML = '';

        for (let i = 1; i <= this.totalParts; i++) {
            const targetKey = `part_${i}`;
            const data = progress[targetKey];
            const item = document.createElement('div');
            item.className = 'card';
            item.style.padding = '12px 18px';
            item.style.display = 'flex';
            item.style.justifyContent = 'space-between';
            item.style.alignItems = 'center';

            if (data) {
                item.innerHTML = `
                    <div><strong>Part ${i}</strong><br><small style="color:var(--text-muted);">Last Touch: ${data.lastAttemptTimestamp}</small></div>
                    <div style="text-align:right;"><span style="color:var(--success);font-weight:700;">${data.highestScore}%</span><br><small style="color:var(--text-muted);">${data.attempts} runs</small></div>
                `;
            } else {
                item.innerHTML = `
                    <div><strong>Part ${i}</strong></div>
                    <div style="color:var(--text-muted); font-size:0.85rem;">Unattempted</div>
                `;
            }
            listContainer.appendChild(item);
        }
    }

    // Shuffling Helper Mechanics 
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // Styling & Custom Theme Configuration Hook Management
    initTheme() {
        const cached = localStorage.getItem(this.storageKeys.theme) || 'light';
        document.documentElement.setAttribute('data-theme', cached);
        document.getElementById('theme-toggle').innerText = cached === 'dark' ? '☀️' : '🌙';
    }

    toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme');
        const target = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', target);
        localStorage.setItem(this.storageKeys.theme, target);
        document.getElementById('theme-toggle').innerText = target === 'dark' ? '☀️' : '🌙';
    }

    setupGlobalListeners() {
        // Intercept hardware Android touch back key setups or browser commands
        window.addEventListener('popstate', () => this.navigateBack());
    }
}

// Global initialization setup entry trigger
document.addEventListener('DOMContentLoaded', () => {
    window.app = new QuizApp();
});