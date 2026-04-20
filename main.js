let activeSlot = 1;
let column = 1;
const guessLetters = ['', '', '', '', ''];
let wordOfTheDay;
let paintedLetters = 0;
let alreadyRunning = false;
const colors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6'];

const loadingDiv = document.querySelector('.loading');
const help = document.querySelector('.help-image');
const dialogHelp = document.querySelector('.help-dialog');
const closeDialog = document.querySelector('.close-dialog');
const wordURL = 'https://words.dev-apis.com/word-of-the-day';
const validatorURL = 'https://words.dev-apis.com/validate-word';
const mobileKbInput = document.getElementById('mobile-keyboard-capture');
const toastEl = document.getElementById('toast');
const LANG_STORAGE_KEY = 'wordle-lang';

let toastHideTimer;
let ignoreCaptureInputEvent = false;
let currentLang = 'en';
let ptSolutions = [];
let ptValidGuessSet = null;
let ptWordsLoadPromise = null;

function prefersTouchKeyboard() {
  return window.matchMedia('(hover: none) and (pointer: coarse)').matches;
}

function getSavedLanguage() {
  try {
    const v = localStorage.getItem(LANG_STORAGE_KEY);
    if (v === 'en' || v === 'pt') {
      return v;
    }
  } catch (e) {
    /* ignore */
  }
  return 'en';
}

function saveLanguage(lang) {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch (e) {
    /* ignore */
  }
}

function syncCaptureFromGuessState() {
  if (!mobileKbInput) {
    return;
  }
  ignoreCaptureInputEvent = true;
  mobileKbInput.value = getGuessWord();
  ignoreCaptureInputEvent = false;
}

function ingestCaptureFieldValue() {
  if (!mobileKbInput) {
    return;
  }
  const raw = mobileKbInput.value.replace(/[^a-zA-Z]/g, '').toLowerCase().slice(0, 5);
  for (let i = 0; i < 5; i++) {
    guessLetters[i] = raw[i] || '';
  }
  if (raw.length === 0) {
    activeSlot = 1;
  } else if (raw.length >= 5) {
    activeSlot = 5;
  } else {
    activeSlot = raw.length + 1;
  }
  mobileKbInput.value = raw;
  syncGuessToDOM();
}

function isOtherFormField(el) {
  if (!el || el.id === 'mobile-keyboard-capture' || el.classList.contains('lang-toggle')) {
    return false;
  }
  const tag = el.tagName;
  if (tag === 'TEXTAREA' || el.isContentEditable) {
    return true;
  }
  if (tag === 'INPUT') {
    return true;
  }
  return false;
}

function showToast(message) {
  if (!toastEl) {
    return;
  }
  clearTimeout(toastHideTimer);
  toastEl.textContent = message;
  toastEl.classList.add('toast--visible');
  toastHideTimer = setTimeout(function () {
    toastEl.classList.remove('toast--visible');
  }, 2800);
}

function getSaoPauloDateKey() {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = fmt.formatToParts(new Date());
  const y = parts.find(function (p) {
    return p.type === 'year';
  }).value;
  const m = parts.find(function (p) {
    return p.type === 'month';
  }).value;
  const d = parts.find(function (p) {
    return p.type === 'day';
  }).value;
  return y + '-' + m + '-' + d;
}

function hashStringToUint(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pickPtWordOfTheDay() {
  if (!ptSolutions.length) {
    return '';
  }
  const key = getSaoPauloDateKey();
  const idx = hashStringToUint(key) % ptSolutions.length;
  return ptSolutions[idx];
}

function applyPtWordData(data) {
  const solutions = Array.isArray(data.solutions) ? data.solutions : [];
  const guesses = Array.isArray(data.guesses) ? data.guesses : [];
  ptSolutions = solutions.map(function (w) {
    return String(w).toLowerCase();
  });
  const valid = new Set();
  solutions.forEach(function (w) {
    valid.add(String(w).toLowerCase());
  });
  guesses.forEach(function (w) {
    valid.add(String(w).toLowerCase());
  });
  ptValidGuessSet = valid;
}

function loadPtWordBank() {
  if (ptWordsLoadPromise) {
    return ptWordsLoadPromise;
  }
  const embedded =
    typeof window !== 'undefined' && window.__PT_WORDS__ && typeof window.__PT_WORDS__ === 'object'
      ? window.__PT_WORDS__
      : null;
  if (embedded && (Array.isArray(embedded.solutions) || Array.isArray(embedded.guesses))) {
    try {
      applyPtWordData(embedded);
      ptWordsLoadPromise = Promise.resolve(true);
      return ptWordsLoadPromise;
    } catch (e) {
      ptWordsLoadPromise = null;
      return Promise.reject(e);
    }
  }
  ptWordsLoadPromise = Promise.reject(new Error('Dicionário PT ausente: inclua data/pt-words.js antes de main.js'));
  return ptWordsLoadPromise;
}

function fallbackFromPtToEn() {
  showToast('Não foi possível carregar o modo português. Voltando para inglês.');
  currentLang = 'en';
  saveLanguage('en');
  updateLangButtons();
  resetGameState();
  return fetch(wordURL)
    .then(function (response) {
      if (!response.ok) {
        throw new Error('Rede');
      }
      return response.json();
    })
    .then(function (processedResponse) {
      wordOfTheDay = processedResponse.word;
    })
    .catch(function () {
      wordOfTheDay = '';
      showToast('Não foi possível carregar a palavra em inglês. Tente de novo.');
    });
}

function loadDailyWord(lang) {
  loadingDiv.style.display = 'block';
  if (lang === 'en') {
    return fetch(wordURL)
      .then(function (response) {
        if (!response.ok) {
          throw new Error('Rede');
        }
        return response.json();
      })
      .then(function (processedResponse) {
        wordOfTheDay = processedResponse.word;
      })
      .catch(function () {
        wordOfTheDay = '';
        showToast('Não foi possível carregar a palavra em inglês. Tente de novo.');
      })
      .finally(function () {
        loadingDiv.style.display = 'none';
      });
  }
  return loadPtWordBank()
    .then(function () {
      wordOfTheDay = pickPtWordOfTheDay();
      if (!wordOfTheDay) {
        throw new Error('Lista vazia');
      }
    })
    .catch(function () {
      wordOfTheDay = '';
      return fallbackFromPtToEn();
    })
    .finally(function () {
      loadingDiv.style.display = 'none';
    });
}

function resetBoardVisual() {
  for (let r = 1; r < 7; r++) {
    for (let c = 1; c < 6; c++) {
      const el = document.querySelector('.square-' + r + '-' + c);
      el.innerText = '';
      el.style.backgroundColor = '#ffffff';
      el.style.border = '0px';
    }
  }
  drawBorder(1);
}

function resetGameState() {
  activeSlot = 1;
  column = 1;
  for (let i = 0; i < 5; i++) {
    guessLetters[i] = '';
  }
  alreadyRunning = false;
  resetBoardVisual();
  syncGuessToDOM();
}

function setLanguage(lang) {
  if (lang !== 'en' && lang !== 'pt') {
    return;
  }
  if (lang === currentLang && wordOfTheDay && String(wordOfTheDay).length === 5) {
    return;
  }
  currentLang = lang;
  saveLanguage(lang);
  updateLangButtons();
  wordOfTheDay = '';
  resetGameState();
  loadDailyWord(lang);
}

function updateLangButtons() {
  document.querySelectorAll('.lang-toggle').forEach(function (btn) {
    const isOn = btn.getAttribute('data-lang') === currentLang;
    btn.setAttribute('aria-pressed', isOn ? 'true' : 'false');
    btn.classList.toggle('lang-toggle--active', isOn);
  });
}

function initLanguageSelector() {
  document.querySelectorAll('.lang-toggle').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const lang = btn.getAttribute('data-lang');
      setLanguage(lang);
    });
  });
  currentLang = getSavedLanguage();
  updateLangButtons();
}

function createBoard() {
  const container = document.querySelector('.square__container');
  for (let linhas = 1; linhas < 7; linhas++) {
    for (let colunas = 1; colunas < 6; colunas++) {
      const square = document.createElement('div');
      square.classList.add('square');
      square.classList.add('square-' + linhas + '-' + colunas);
      square.dataset.line = String(linhas);
      square.dataset.col = String(colunas);
      container.appendChild(square);
    }
  }
  drawBorder(1);
  syncGuessToDOM();
}

function getGuessWord() {
  return guessLetters.join('').toLowerCase();
}

function isGuessComplete() {
  return guessLetters.every(function (ch) {
    return ch.length === 1;
  });
}

function syncGuessToDOM() {
  if (column < 7) {
    for (let j = 1; j <= 5; j++) {
      const el = document.querySelector('.square-' + column + '-' + j);
      const ch = guessLetters[j - 1];
      el.innerText = ch ? ch.toUpperCase() : '';
    }
  }
  syncCaptureFromGuessState();
  setFocusedSquare();
}

function clearSlotFocus() {
  for (let linhas = 1; linhas < 7; linhas++) {
    for (let j = 1; j < 6; j++) {
      document.querySelector('.square-' + linhas + '-' + j).classList.remove('square--focused');
    }
  }
}

function setFocusedSquare() {
  clearSlotFocus();
  if (column < 7) {
    document.querySelector('.square-' + column + '-' + activeSlot).classList.add('square--focused');
  }
}

function countLettersInAnswer() {
  const counts = {};
  for (let i = 0; i < wordOfTheDay.length; i++) {
    const letter = wordOfTheDay[i];
    counts[letter] = (counts[letter] || 0) + 1;
  }
  return counts;
}

function isLetter(value) {
  return /^[a-zA-Z]$/.test(value);
}

function drawBorder(number) {
  if (number === 7) {
    return;
  }
  for (let i = 1; i < 6; i++) {
    const squareElement = document.querySelector('.square-' + number + '-' + i);
    squareElement.style.border = '3px solid black';
  }
}

function removeBorder(number) {
  for (let i = 1; i < 6; i++) {
    const squareElement = document.querySelector('.square-' + (number - 1) + '-' + i);
    squareElement.style.border = '0px';
  }
}

function handleGameKeydown(event) {
  if (dialogHelp.open) {
    return;
  }

  if (
    event.key === 'Enter' &&
    isGuessComplete() &&
    alreadyRunning === false &&
    column < 7
  ) {
    event.preventDefault();
    alreadyRunning = true;
    verifyIfWordExists();
    return;
  }

  if (column >= 7 || alreadyRunning) {
    return;
  }

  if (isOtherFormField(event.target)) {
    return;
  }

  if (event.key === 'ArrowLeft' && activeSlot > 1) {
    event.preventDefault();
    activeSlot--;
    syncGuessToDOM();
    return;
  }

  if (event.key === 'ArrowRight' && activeSlot < 5) {
    event.preventDefault();
    activeSlot++;
    syncGuessToDOM();
    return;
  }

  if (event.key === 'Backspace') {
    event.preventDefault();
    if (guessLetters[activeSlot - 1]) {
      guessLetters[activeSlot - 1] = '';
    } else if (activeSlot > 1) {
      activeSlot--;
      guessLetters[activeSlot - 1] = '';
    }
    syncGuessToDOM();
    return;
  }

  if (isLetter(event.key)) {
    event.preventDefault();
    guessLetters[activeSlot - 1] = event.key.toLowerCase();
    if (activeSlot < 5) {
      activeSlot++;
    }
    syncGuessToDOM();
  }
}

document.addEventListener('keydown', handleGameKeydown);

if (mobileKbInput) {
  mobileKbInput.addEventListener('input', function () {
    if (
      ignoreCaptureInputEvent ||
      !prefersTouchKeyboard() ||
      dialogHelp.open ||
      column >= 7 ||
      alreadyRunning
    ) {
      return;
    }
    ingestCaptureFieldValue();
  });
}

function focusMobileKeyboardIfNeeded() {
  if (!mobileKbInput || !prefersTouchKeyboard()) {
    return;
  }
  mobileKbInput.focus({ preventScroll: true });
}

document.querySelector('.square__container').addEventListener('click', function (e) {
  const cell = e.target.closest('.square');
  if (!cell || alreadyRunning || dialogHelp.open || column >= 7) {
    return;
  }
  const line = Number(cell.dataset.line);
  const col = Number(cell.dataset.col);
  if (line !== column) {
    return;
  }
  activeSlot = col;
  syncGuessToDOM();
  focusMobileKeyboardIfNeeded();
});

function rejectInvalidGuess() {
  for (let i = 1; i < 6; i++) {
    const squareElement = document.querySelector('.square-' + column + '-' + i);
    squareElement.style.backgroundColor = 'red';
  }
  setTimeout(function () {
    for (let i = 1; i < 6; i++) {
      const squareElement = document.querySelector('.square-' + column + '-' + i);
      squareElement.style.backgroundColor = 'white';
    }
    clear();
    alreadyRunning = false;
    const msg =
      currentLang === 'pt'
        ? 'Esta palavra não está na lista em português.'
        : 'Esta palavra não é válida no jogo.';
    showToast(msg);
  }, 120);
}

function verifyIfWordExists() {
  if (!wordOfTheDay || String(wordOfTheDay).length !== 5) {
    alreadyRunning = false;
    showToast('Aguarde a palavra do dia carregar.');
    return;
  }
  const word = getGuessWord();
  if (currentLang === 'pt') {
    loadingDiv.style.display = 'block';
    loadPtWordBank()
      .then(function () {
        loadingDiv.style.display = 'none';
        if (ptValidGuessSet && ptValidGuessSet.has(word)) {
          verifyWord();
        } else {
          rejectInvalidGuess();
        }
      })
      .catch(function () {
        loadingDiv.style.display = 'none';
        return fallbackFromPtToEn().finally(function () {
          alreadyRunning = false;
        });
      });
    return;
  }

  loadingDiv.style.display = 'block';
  fetch(validatorURL, {
    method: 'POST',
    body: JSON.stringify({
      word: word,
    }),
  })
    .then(function (response) {
      if (!response.ok) {
        throw new Error('Rede');
      }
      return response.json();
    })
    .then(function (data) {
      loadingDiv.style.display = 'none';
      if (data.validWord === true) {
        verifyWord();
      } else {
        rejectInvalidGuess();
      }
    })
    .catch(function () {
      loadingDiv.style.display = 'none';
      alreadyRunning = false;
      showToast('Não foi possível validar o palpite. Verifique sua conexão.');
    });
}

function verifyWord() {
  paintedLetters = 0;
  const word = getGuessWord();
  if (word === wordOfTheDay) {
    for (let i = 1; i < 6; i++) {
      const squareElement = document.querySelector('.square-' + column + '-' + i);
      squareElement.style.backgroundColor = 'green';
    }
    clearSlotFocus();
    alreadyRunning = false;
    win();
    return;
  }
  const remaining = countLettersInAnswer();
  const status = new Array(5).fill('absent');

  for (let j = 0; j < 5; j++) {
    if (word[j] === wordOfTheDay[j]) {
      status[j] = 'correct';
      remaining[word[j]]--;
    }
  }

  for (let j = 0; j < 5; j++) {
    if (status[j] === 'correct') {
      continue;
    }
    const letter = word[j];
    if ((remaining[letter] || 0) > 0) {
      status[j] = 'present';
      remaining[letter]--;
    }
  }

  for (let j = 0; j < 5; j++) {
    const squareElement = document.querySelector('.square-' + column + '-' + (j + 1));
    if (status[j] === 'correct') {
      squareElement.style.backgroundColor = 'green';
    } else if (status[j] === 'present') {
      squareElement.style.backgroundColor = 'yellow';
    } else {
      squareElement.style.backgroundColor = 'red';
    }
  }

  column++;
  removeBorder(column);
  drawBorder(column);
  for (let i = 0; i < 5; i++) {
    guessLetters[i] = '';
  }
  activeSlot = 1;
  syncGuessToDOM();
  gameIsOver();
  alreadyRunning = false;
}

createBoard();
initLanguageSelector();
loadDailyWord(currentLang);

function gameIsOver() {
  if (column === 7) {
    const w = wordOfTheDay ? wordOfTheDay.toUpperCase() : '';
    alert('Fim de jogo! A palavra era: ' + w + '. Volte amanhã para outra partida.');
  }
}

const count = 200;
const defaults = {
  origin: { y: 0.7 },
};

function fire(particleRatio, opts) {
  confetti(
    Object.assign({}, defaults, opts, {
      particleCount: Math.floor(count * particleRatio),
    })
  );
}

function win() {
  fire(0.25, {
    spread: 26,
    startVelocity: 55,
  });

  fire(0.2, {
    spread: 60,
  });

  fire(0.35, {
    spread: 100,
    decay: 0.91,
    scalar: 0.8,
  });

  fire(0.1, {
    spread: 120,
    startVelocity: 25,
    decay: 0.92,
    scalar: 1.2,
  });

  fire(0.1, {
    spread: 120,
    startVelocity: 45,
  });
}

function clear() {
  for (let i = 0; i < 5; i++) {
    guessLetters[i] = '';
  }
  activeSlot = 1;
  syncGuessToDOM();
}

help.addEventListener('click', showHelp);
closeDialog.addEventListener('click', closeHelp);

function showHelp() {
  if (mobileKbInput) {
    mobileKbInput.blur();
  }
  dialogHelp.showModal();
}

function closeHelp() {
  dialogHelp.close();
}
