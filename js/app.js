'use strict';

const API_BASE = 'https://api.enem.dev/v1';
const PAGE_SIZE = 10;

const STORAGE = {
    favorites: 'estudarMaisFavoritesV2',
    essays: 'estudarMaisEssaysV2',
    answered: 'estudarMaisAnsweredV2'
};

const SUBJECTS = {
    matematica: ['matematica', 'matemática', 'mathematics'],
    linguagens: ['linguagens', 'languages'],
    humanas: ['ciencias-humanas', 'ciências humanas', 'human-sciences', 'humanas'],
    natureza: ['ciencias-natureza', 'ciências da natureza', 'natural-sciences', 'natureza']
};

const ESSAY_THEMES = [
    [2024, 'Desafios para a valorização da herança africana no Brasil'],
    [2023, 'Desafios para o enfrentamento da invisibilidade do trabalho de cuidado realizado pela mulher no Brasil'],
    [2022, 'Desafios para a valorização de comunidades e povos tradicionais no Brasil'],
    [2021, 'Invisibilidade e registro civil: garantia de acesso à cidadania no Brasil'],
    [2020, 'O estigma associado às doenças mentais na sociedade brasileira'],
    [2019, 'Democratização do acesso ao cinema no Brasil'],
    [2018, 'Manipulação do comportamento do usuário pelo controle de dados na internet'],
    [2017, 'Desafios para a formação educacional de surdos no Brasil'],
    [2016, 'Caminhos para combater a intolerância religiosa no Brasil'],
    [2015, 'A persistência da violência contra a mulher na sociedade brasileira'],
    [2014, 'Publicidade infantil em questão no Brasil'],
    [2013, 'Efeitos da implantação da Lei Seca no Brasil'],
    [2012, 'O movimento imigratório para o Brasil no século XXI'],
    [2011, 'Viver em rede no século XXI: os limites entre o público e o privado'],
    [2010, 'O trabalho na construção da dignidade humana'],
    [2009, 'O indivíduo frente à ética nacional'],
    [2008, 'Como preservar a floresta Amazônica'],
    [2007, 'O desafio de se conviver com as diferenças'],
    [2006, 'O poder de transformação da leitura'],
    [2005, 'O trabalho infantil na sociedade brasileira'],
    [2004, 'Como garantir a liberdade de informação e evitar abusos nos meios de comunicação'],
    [2003, 'A violência na sociedade brasileira: como mudar as regras desse jogo'],
    [2002, 'O direito de votar: como fazer dessa conquista um meio para promover as transformações sociais de que o Brasil necessita'],
    [2001, 'Desenvolvimento e preservação ambiental: como conciliar os interesses em conflito'],
    [2000, 'Direitos da criança e do adolescente: como enfrentar esse desafio nacional'],
    [1999, 'Cidadania e participação social'],
    [1998, 'Viver e aprender']
];

let loadedQuestions = [];
let visiblePage = 1;
let favorites = readStorage(STORAGE.favorites, []);
let essays = readStorage(STORAGE.essays, []);
let answered = readStorage(STORAGE.answered, {});
let toastTimer;

const $ = id => document.getElementById(id);

function readStorage(key, fallback) {
    try {
        const value = JSON.parse(localStorage.getItem(key));
        return value ?? fallback;
    } catch {
        return fallback;
    }
}

function saveStorage() {
    localStorage.setItem(STORAGE.favorites, JSON.stringify(favorites));
    localStorage.setItem(STORAGE.essays, JSON.stringify(essays));
    localStorage.setItem(STORAGE.answered, JSON.stringify(answered));
    updateStats();
}

function showToast(message) {
    const toast = $('toast');
    toast.textContent = message;
    toast.classList.add('show');

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[char]);
}

function normalizeText(value) {
    if (Array.isArray(value)) {
        return value.map(item => typeof item === 'string' ? item : '').join(' ');
    }

    return typeof value === 'string' ? value : '';
}

function getQuestionId(question) {
    return `${question.year || ''}-${question.index || ''}-${question.language || ''}-${String(question.title || '').slice(0, 40)}`;
}

function questionMatchesSubject(question, subject) {
    const discipline = String(question.discipline || question.area || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

    const aliases = SUBJECTS[subject] || [];

    return aliases.some(alias =>
        discipline.includes(alias.normalize('NFD').replace(/[\u0300-\u036f]/g, ''))
    );
}

function updateStats() {
    $('favoriteCount').textContent = favorites.length;
    $('homeFavoriteCount').textContent = favorites.length;
    $('essayCount').textContent = `${essays.length} textos`;
    $('homeEssayCount').textContent = essays.length;
    $('answeredCount').textContent = Object.keys(answered).length;
}

function showPage(page) {
    document.querySelectorAll('.page').forEach(section => {
        section.classList.toggle('active', section.id === `page-${page}`);
    });

    document.querySelectorAll('.nav-link').forEach(button => {
        button.classList.toggle('active', button.dataset.page === page);
    });

    const titles = {
        inicio: 'Bom dia! Vamos estudar? ✦',
        questoes: 'Seu momento de praticar. ✦',
        redacao: 'Suas ideias merecem espaço. ✦',
        favoritas: 'Vamos revisar? ✦'
    };

    $('pageTitle').textContent = titles[page] || titles.inicio;

    if (page === 'favoritas') {
        renderFavorites();
    }
}

function populateYears() {
    const select = $('year');

    for (let year = 2023; year >= 2009; year--) {
        const option = document.createElement('option');
        option.value = String(year);
        option.textContent = year;
        select.appendChild(option);
    }
}

function renderQuestion(question, index, favoriteView = false) {
    const id = getQuestionId(question);
    const saved = favorites.some(item => item.id === id);

    const alternatives = Array.isArray(question.alternatives)
        ? question.alternatives
        : [];

    const context = normalizeText(question.context);
    const title = normalizeText(question.title);
    const intro = normalizeText(question.alternativesIntroduction);
    const files = Array.isArray(question.files) ? question.files : [];

    const userAnswer = answered[id];
    const correct = question.correctAlternative;

    const images = files.map(url =>
        `<img src="${escapeHtml(url)}" alt="Imagem de apoio da questão" loading="lazy">`
    ).join('');

    const alternativeHtml = alternatives.map((alternative, alternativeIndex) => {
        const letter = alternative.letter || String.fromCharCode(65 + alternativeIndex);

        const isCorrect = Boolean(userAnswer) && letter === correct;
        const isWrong = Boolean(userAnswer) && userAnswer === letter && userAnswer !== correct;

        const image = alternative.file
            ? `<img src="${escapeHtml(alternative.file)}" alt="Imagem da alternativa ${escapeHtml(letter)}" loading="lazy">`
            : '';

        return `
            <button
                type="button"
                class="alternative ${isCorrect ? 'correct' : ''} ${isWrong ? 'wrong' : ''}"
                data-answer="${escapeHtml(letter)}"
                data-question-id="${escapeHtml(id)}"
                ${userAnswer ? 'disabled' : ''}
            >
                <b>${escapeHtml(letter)}.</b>
                <span>
                    ${escapeHtml(alternative.text || alternative.description || '')}
                    ${image}
                </span>
            </button>
        `;
    }).join('');

    let feedback = '';

    if (userAnswer) {
        feedback = userAnswer === correct
            ? '<div class="answer-feedback correct-feedback">✓ Muito bem! Você acertou!</div>'
            : `<div class="answer-feedback wrong-feedback">✕ Não foi dessa vez! A alternativa correta é ${escapeHtml(correct || 'não informada')}.</div>`;
    }

    return `
        <article class="question-card" data-question-id="${escapeHtml(id)}">

            <div class="question-top">
                <span class="tag">
                    ENEM ${escapeHtml(question.year || $('year').value)}
                    · QUESTÃO ${escapeHtml(question.index || index + 1)}
                </span>

                <button
                    class="save-button"
                    data-save="${escapeHtml(id)}"
                    title="${saved ? 'Remover dos favoritos' : 'Salvar nos favoritos'}"
                >
                    ${saved ? '♥' : '♡'}
                </button>
            </div>

            <div class="question-context">
                ${context ? escapeHtml(context).replace(/\n/g, '<br>') : ''}
                ${images}
                <div class="question-title">${escapeHtml(title)}</div>
                ${escapeHtml(intro)}
            </div>

            <div class="alternatives">
                ${alternativeHtml || '<p class="hint">Alternativas não disponíveis para esta questão.</p>'}
            </div>

            <div class="question-actions">
                ${feedback}
            </div>

        </article>
    `;
}

async function fetchAllQuestions(year, subject, language) {
    let offset = 0;
    let total = Infinity;

    const results = [];
    const maxPages = 20;

    for (let page = 0; page < maxPages && offset < total; page++) {
        const params = new URLSearchParams({
            limit: '50',
            offset: String(offset)
        });

        if (subject === 'linguagens' && language) {
            params.set('language', language);
        }

        const url = `${API_BASE}/exams/${encodeURIComponent(year)}/questions?${params.toString()}`;

        const response = await fetch(url, {
            headers: { Accept: 'application/json' }
        });

        const body = await response.json().catch(() => null);

        if (!response.ok) {
            const message = body?.error?.message
                || body?.message
                || `A API respondeu com status ${response.status}.`;

            throw new Error(message);
        }

        const pageQuestions = Array.isArray(body?.questions)
            ? body.questions
            : Array.isArray(body)
                ? body
                : [];

        results.push(...pageQuestions);

        const metadata = body?.metadata || {};

        total = Number.isFinite(Number(metadata.total))
            ? Number(metadata.total)
            : (metadata.hasMore
                ? offset + pageQuestions.length + 1
                : offset + pageQuestions.length);

        const hasMore = metadata.hasMore === true;

        offset += pageQuestions.length;

        if (!hasMore || pageQuestions.length === 0) {
            break;
        }
    }

    return results.filter(question => questionMatchesSubject(question, subject));
}

async function loadQuestions() {
    const subject = $('subject').value;
    const year = $('year').value;
    const language = $('language').value;

    const button = $('loadQuestions');

    button.disabled = true;
    button.textContent = 'Carregando...';

    $('questions').innerHTML = `
        <div class="empty-state">
            <span>◌</span>
            <strong>Buscando questões...</strong>
            <p>Estamos consultando as provas anteriores.</p>
        </div>
    `;

    $('questionHint').textContent = 'Aguarde enquanto consultamos a API.';
    $('questionPagination').innerHTML = '';
    $('resultCount').textContent = 'Carregando';

    try {
        loadedQuestions = await fetchAllQuestions(year, subject, language);

        loadedQuestions = loadedQuestions.map(question => ({
            ...question,
            year: question.year || Number(year)
        }));

        visiblePage = 1;

        $('resultCount').textContent = `${loadedQuestions.length} questões`;

        if (!loadedQuestions.length) {
            $('questionHint').textContent = 'A API respondeu, mas não retornou questões para essa área e ano. Tente outro ano.';

            $('questions').innerHTML = `
                <div class="empty-state">
                    <span>✧</span>
                    <strong>Nenhuma questão encontrada</strong>
                    <p>Experimente outro ano ou confira a conexão.</p>
                </div>
            `;

            return;
        }

        $('questionHint').textContent = `${loadedQuestions.length} questões encontradas. Clique em uma alternativa para responder.`;

        renderQuestionPage();

    } catch (error) {
        console.error('Erro ao carregar questões:', error);

        $('questionHint').textContent = error.message || 'Não foi possível consultar a API.';
        $('resultCount').textContent = 'Indisponível';

        $('questions').innerHTML = `
            <div class="empty-state">
                <span>!</span>
                <strong>Não foi possível carregar as questões</strong>
                <p>Verifique sua internet e tente novamente em instantes.</p>
            </div>
        `;

    } finally {
        button.disabled = false;
        button.innerHTML = 'Buscar questões <span>→</span>';
    }
}

function renderQuestionPage() {
    const start = (visiblePage - 1) * PAGE_SIZE;
    const pageItems = loadedQuestions.slice(start, start + PAGE_SIZE);

    $('questions').innerHTML = pageItems
        .map((question, index) => renderQuestion(question, start + index))
        .join('');

    renderPagination();
}

function renderPagination() {
    const totalPages = Math.ceil(loadedQuestions.length / PAGE_SIZE);

    if (totalPages <= 1) {
        $('questionPagination').innerHTML = '';
        return;
    }

    const buttons = [];
    const first = Math.max(1, visiblePage - 2);
    const last = Math.min(totalPages, visiblePage + 2);

    buttons.push(`
        <button data-page-number="${visiblePage - 1}" ${visiblePage === 1 ? 'disabled' : ''}>
            ←
        </button>
    `);

    for (let page = first; page <= last; page++) {
        buttons.push(`
            <button
                data-page-number="${page}"
                class="${page === visiblePage ? 'active' : ''}"
            >
                ${page}
            </button>
        `);
    }

    buttons.push(`
        <button data-page-number="${visiblePage + 1}" ${visiblePage === totalPages ? 'disabled' : ''}>
            →
        </button>
    `);

    $('questionPagination').innerHTML = buttons.join('');
}

function toggleFavorite(id) {
    const existing = favorites.findIndex(item => item.id === id);

    if (existing >= 0) {
        favorites.splice(existing, 1);
    } else {
        const question = loadedQuestions.find(item => getQuestionId(item) === id);

        if (question) {
            favorites.unshift({ ...question, id });
        }
    }

    saveStorage();
    renderQuestionPage();
    renderFavorites();

    showToast(existing >= 0
        ? 'Questão removida das favoritas.'
        : 'Questão salva nas favoritas!');
}

function renderFavorites() {
    if (!favorites.length) {
        $('favorites').innerHTML = `
            <div class="empty-state">
                <span>♡</span>
                <strong>Nenhuma questão salva ainda</strong>
                <p>Use o coração nas questões para guardá-las aqui.</p>
            </div>
        `;

        return;
    }

    $('favorites').innerHTML = favorites
        .map((question, index) => renderQuestion(question, index, true))
        .join('');
}

/* Corrige a resposta assim que a pessoa clica */
function chooseAnswer(id, selectedLetter) {
    if (answered[id]) {
        return;
    }

    const question = loadedQuestions.find(item => getQuestionId(item) === id)
        || favorites.find(item => item.id === id);

    if (!question) {
        return;
    }

    answered[id] = selectedLetter;

    saveStorage();

    const card = document.querySelector(
        `[data-question-id="${CSS.escape(id)}"]`
    );

    if (card) {
        const questionIndex = loadedQuestions.findIndex(
            item => getQuestionId(item) === id
        );

        card.outerHTML = renderQuestion(
            question,
            questionIndex >= 0 ? questionIndex : 0,
            questionIndex < 0
        );
    }
}

function renderEssayThemes() {
    $('essayThemes').innerHTML = ESSAY_THEMES
        .map(([year, theme]) => `
            <button class="theme-item" data-theme="${escapeHtml(theme)}">
                <strong>ENEM ${year}</strong>
                <span>${escapeHtml(theme)}</span>
            </button>
        `)
        .join('');
}

function updateWordCount() {
    const text = $('essayText').value.trim();
    const count = text ? text.split(/\s+/).length : 0;

    $('wordCount').textContent = `${count} ${count === 1 ? 'palavra' : 'palavras'}`;
}

function saveEssay() {
    const theme = $('essayTheme').value.trim();
    const text = $('essayText').value.trim();

    if (!theme || !text) {
        showToast('Preencha o tema e escreva sua redação antes de salvar.');
        return;
    }

    essays.unshift({
        id: Date.now(),
        theme,
        text,
        date: new Date().toLocaleDateString('pt-BR')
    });

    saveStorage();
    renderEssays();

    $('essayTheme').value = '';
    $('essayText').value = '';

    updateWordCount();
    showToast('Sua redação foi salva neste navegador!');
}

function renderEssays() {
    if (!essays.length) {
        $('savedEssays').innerHTML = `
            <div class="empty-inline">
                Você ainda não salvou nenhuma redação.
            </div>
        `;

        return;
    }

    $('savedEssays').innerHTML = essays.map(essay => `
        <div class="saved-essay">
            <div>
                <strong>${escapeHtml(essay.theme)}</strong>
                <small>
                    Salva em ${escapeHtml(essay.date)}
                    · ${essay.text.trim().split(/\s+/).length} palavras
                </small>
            </div>

            <button data-delete-essay="${essay.id}">
                Excluir
            </button>
        </div>
    `).join('');
}

/* Inicialização do site */
function init() {
    populateYears();
    renderEssayThemes();
    renderFavorites();
    renderEssays();
    updateStats();
    updateWordCount();

    $('todayDate').textContent = new Date().toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });

    document.querySelectorAll('[data-page]').forEach(button => {
        button.addEventListener('click', () => showPage(button.dataset.page));
    });

    document.querySelectorAll('[data-go]').forEach(button => {
        button.addEventListener('click', () => showPage(button.dataset.go));
    });

    $('loadQuestions').addEventListener('click', loadQuestions);

    $('subject').addEventListener('change', () => {
        $('languageField').classList.toggle(
            'hidden',
            $('subject').value !== 'linguagens'
        );
    });

    /* Cliques nas questões */
    $('questions').addEventListener('click', event => {
        const saveButton = event.target.closest('[data-save]');
        const answerButton = event.target.closest('[data-answer]');

        if (saveButton) {
            toggleFavorite(saveButton.dataset.save);
            return;
        }

        if (answerButton) {
            chooseAnswer(
                answerButton.dataset.questionId,
                answerButton.dataset.answer
            );
        }
    });

    /* Cliques nas questões favoritas */
    $('favorites').addEventListener('click', event => {
        const saveButton = event.target.closest('[data-save]');
        const answerButton = event.target.closest('[data-answer]');

        if (saveButton) {
            toggleFavorite(saveButton.dataset.save);
            return;
        }

        if (answerButton) {
            chooseAnswer(
                answerButton.dataset.questionId,
                answerButton.dataset.answer
            );
        }
    });

    $('questionPagination').addEventListener('click', event => {
        const button = event.target.closest('[data-page-number]');

        if (!button || button.disabled) {
            return;
        }

        visiblePage = Number(button.dataset.pageNumber);

        renderQuestionPage();

        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });

    $('essayThemes').addEventListener('click', event => {
        const button = event.target.closest('[data-theme]');

        if (!button) {
            return;
        }

        $('essayTheme').value = button.dataset.theme;
        $('essayText').focus();

        showToast('Tema selecionado!');
    });

    $('essayText').addEventListener('input', updateWordCount);
    $('saveEssay').addEventListener('click', saveEssay);

    $('savedEssays').addEventListener('click', event => {
        const button = event.target.closest('[data-delete-essay]');

        if (!button) {
            return;
        }

        essays = essays.filter(
            essay => String(essay.id) !== button.dataset.deleteEssay
        );

        saveStorage();
        renderEssays();

        showToast('Redação excluída.');
    });
}

document.addEventListener('DOMContentLoaded', init);