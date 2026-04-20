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
const userWordInput = document.querySelector('#user-word');

function getWordOfTheDay() {
  const promise = fetch(wordURL);
  promise
    .then(function (response) {
      const processingPromise = response.json();
      return processingPromise;
    })
    .then(function (processedResponse) {
      wordOfTheDay = processedResponse.word;
    });
  loadingDiv.style.display = 'none';
}

getWordOfTheDay();

function createBoard() {
  const container = document.querySelector('.square__container');
  for (let linhas = 1; linhas < 7; linhas++) {
    for (let colunas = 1; colunas < 6; colunas++) {
      const square = document.createElement('div');
      square.classList.add('square');
      square.classList.add(`square-${linhas}-${colunas}`);
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
      const el = document.querySelector(`.square-${column}-${j}`);
      const ch = guessLetters[j - 1];
      el.innerText = ch ? ch.toUpperCase() : '';
    }
  }
  setFocusedSquare();
}

function clearSlotFocus() {
  for (let linhas = 1; linhas < 7; linhas++) {
    for (let j = 1; j <= 5; j++) {
      document.querySelector(`.square-${linhas}-${j}`).classList.remove('square--focused');
    }
  }
}

function setFocusedSquare() {
  clearSlotFocus();
  if (column < 7) {
    document.querySelector(`.square-${column}-${activeSlot}`).classList.add('square--focused');
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
  for (i = 1; i < 6; i++) {
    const squareElement = document.querySelector(`.square-${number}-${i}`);
    squareElement.style.border = '3px solid black';
  }
}
function removeBorder(number) {
  for (i = 1; i < 6; i++) {
    const squareElement = document.querySelector(`.square-${number - 1}-${i}`);
    squareElement.style.border = '0px';
  }
}

document.addEventListener('keydown', function (event) {
  if (dialogHelp.open) {
    return;
  }

  if (
    event.key === 'Enter' &&
    isGuessComplete() &&
    alreadyRunning === false &&
    column < 7
  ) {
    alreadyRunning = true;
    verifyIfWordExists();
    return;
  }

  if (column >= 7 || alreadyRunning) {
    return;
  }

  const tag = event.target && event.target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || event.target.isContentEditable) {
    return;
  }

  if (event.key === 'ArrowLeft' && activeSlot > 1) {
    activeSlot--;
    setFocusedSquare();
    return;
  }

  if (event.key === 'ArrowRight' && activeSlot < 5) {
    activeSlot++;
    setFocusedSquare();
    return;
  }

  if (event.key === 'Backspace') {
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
    guessLetters[activeSlot - 1] = event.key.toLowerCase();
    syncGuessToDOM();
    if (activeSlot < 5) {
      activeSlot++;
    }
    setFocusedSquare();
  }
});

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
  setFocusedSquare();
});

function verifyIfWordExists() {
  loadingDiv.style.display = 'block';
  const validatorURL = 'https://words.dev-apis.com/validate-word';
  fetch(validatorURL, {
    method: 'POST',
    body: JSON.stringify({
      word: getGuessWord(),
    }),
  })
    .then(function (response) {
      return response.json();
    })
    .then(function (data) {
      loadingDiv.style.display = 'none';
      if (data.validWord === true) {
        verifyWord();
      } else {
        for (let i = 1; i < 6; i++) {
          let squareElement = document.querySelector(`.square-${column}-${i}`);
          squareElement.style.backgroundColor = 'red';
          setTimeout(function () {
            squareElement.style.backgroundColor = 'white';
          }, 100);
          clear();
          alreadyRunning = false;
        }
      }
    });
}

function verifyWord() {
  paintedLetters = 0;
  const word = getGuessWord();
  if (word === wordOfTheDay) {
    for (let i = 1; i < 6; i++) {
      let squareElement = document.querySelector(`.square-${column}-${i}`);
      squareElement.style.backgroundColor = 'green';
    }
    clearSlotFocus();
    win();
    return;
  } else {
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
      const squareElement = document.querySelector(
        `.square-${column}-${j + 1}`
      );
      if (status[j] === 'correct') {
        squareElement.style.backgroundColor = 'green';
      } else if (status[j] === 'present') {
        squareElement.style.backgroundColor = 'yellow';
      } else {
        squareElement.style.backgroundColor = 'red';
      }
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
function gameIsOver() {
  console.log('veio');
  if (column === 7) {
    alert('Game Over! Try again tomorrow!');
  }
}

//fireworks
const count = 200,
  defaults = {
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
  dialogHelp.showModal();
}
function closeHelp() {
  dialogHelp.close();
}
