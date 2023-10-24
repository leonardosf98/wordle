let row = 1;
let column = 1;
let userWord = [];
let wordOfTheDay;
let paintedLetters = 0;
let letterCount = {};
let isLoading = false;
const colors = ["#e74c3c", "#3498db", "#2ecc71", "#f39c12", "#9b59b6"];

let alreadyRunning = false;
const loadingDiv = document.querySelector(".loading");
const help = document.querySelector(".help-image");
const dialogHelp = document.querySelector(".help-dialog");
const closeDialog = document.querySelector(".close-dialog");
const wordURL = "https://words.dev-apis.com/word-of-the-day";

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
  loadingDiv.style.display = "none";
}

getWordOfTheDay();

function createBoard() {
  let row = document.querySelector(".square__container");
  for (let linhas = 1; linhas < 7; linhas++) {
    for (let colunas = 1; colunas < 6; colunas++) {
      let square = document.createElement("div");
      square.classList.add(`square`);
      square.classList.add(`square-${linhas}-${colunas}`);
      row.appendChild(square);
      document.querySelector("main").appendChild(row);
    }
  }
}

function countLetters() {
  for (let i = 0; i < wordOfTheDay.length; i++) {
    const letter = wordOfTheDay[i];
    if (letterCount[letter]) {
      letterCount[letter]++;
    } else {
      letterCount[letter] = 1;
    }
  }
  const formattedLetterCount = {};

  for (const letter in letterCount) {
    formattedLetterCount[letter] = letterCount[letter];
  }
  return formattedLetterCount;
}

function isLetter(value) {
  return /^[a-zA-Z]$/.test(value);
}

document.addEventListener("keydown", function (event) {
  let squareElement = document.querySelector(`.square-${column}-${row}`);

  if (isLetter(event.key) === true && userWord.length < 5) {
    userWord.push(event.key);
    squareElement.innerText = event.key.toUpperCase();
    row++;
  }

  if (event.key === "Backspace") {
    userWord.pop();
    let element = document.querySelector(`.square-${column}-${row - 1}`);
    element.innerHTML = "";
    if (column > 0) row--;
    return;
  }

  if (event.key === "Enter" && userWord.length === 5) {
    if (alreadyRunning) {
      event.preventDefault();
    } else {
      alreadyRunning = true;
      verifyIfWordExists();
      return;
    }
  }
});

function verifyIfWordExists() {
  isLoading = true;
  loadingDiv.style.display = "block";
  const validatorURL = "https://words.dev-apis.com/validate-word";
  fetch(validatorURL, {
    method: "POST",
    body: JSON.stringify({
      word: userWord.join("").toLowerCase(),
    }),
  })
    .then(function (response) {
      return response.json();
    })
    .then(function (data) {
      loadingDiv.style.display = "none";
      if (data.validWord === true) {
        verifyWord();
      } else {
        for (let i = 1; i < 6; i++) {
          let squareElement = document.querySelector(`.square-${column}-${i}`);
          squareElement.style.backgroundColor = "red";
          setTimeout(function () {
            squareElement.style.backgroundColor = "white";
          }, 100);
          clear();
        }
      }
    });
  isLoading = false;
}

function verifyWord() {
  paintedLetters = 0;
  letterCount = countLetters();
  const word = userWord.join("").toLowerCase();
  if (word === wordOfTheDay) {
    for (let i = 1; i < 6; i++) {
      let squareElement = document.querySelector(`.square-${column}-${i}`);
      squareElement.style.backgroundColor = "green";
    }
    win();
    return;
  } else {
    for (let j = 0; j < 5; j++) {
      let letter = word[j];
      if (word[j] === wordOfTheDay[j] && letterCount[`${letter}`] !== 0) {
        let squareElement = document.querySelector(
          `.square-${column}-${j + 1}`
        );
        letterCount[`${letter}`]--;
        console.log(letterCount[`${letter}`]);
        debugger;
        squareElement.style.backgroundColor = "green";
      } else if (
        wordOfTheDay.includes(word[j]) &&
        letterCount[`${letter}`] !== 0
      ) {
        letterCount[`${letter}`]--;
        let squareElement = document.querySelector(
          `.square-${column}-${j + 1}`
        );
        squareElement.style.backgroundColor = "yellow";
      } else {
        let squareElement = document.querySelector(
          `.square-${column}-${j + 1}`
        );
        squareElement.style.backgroundColor = "red";
      }
    }
  }
  column++;
  userWord = [];
  row = 1;
  gameIsOver();
  alreadyRunning = false;
}

createBoard();
function gameIsOver() {
  if (column === 7) {
    alert("Game Over! Try again tomorrow!");
  }
}

//fireworks
const count = 200,
  defaults = {
    origin: { y: 0.7 },
  };

function fire(particleRatio, opts) {
  console.log("fire");
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
  userWord = [];
  row = 1;
  for (let i = 1; i < 6; i++) {
    let squareElement = document.querySelector(`.square-${column}-${i}`);
    squareElement.innerHTML = "";
  }
}

help.addEventListener("click", showHelp);
closeDialog.addEventListener("click", closeHelp);

function showHelp() {
  dialogHelp.showModal();
}
function closeHelp() {
  dialogHelp.close();
}
