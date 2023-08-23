let row = 1;
let column = 1;
let userWord = [];
let wordOfTheDay;
let paintedLetters = 0;
let letterCount = {};
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
    verifyIfWordExists();
    return;
  }

  if (!isLetter(event.key) || userWord.length < 5) return;
});

function verifyIfWordExists() {
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
}

function verifyWord() {
  paintedLetters = 0;
  letterCount = countLetters();
  console.log(letterCount);
  const word = userWord.join("").toLowerCase();
  if (word === wordOfTheDay) {
    alert("You win!");
    for (let i = 1; i < 6; i++) {
      let squareElement = document.querySelector(`.square-${column}-${i}`);
      squareElement.style.backgroundColor = "green";
    }
    return;
  } else {
    for (let j = 0; j < 5; j++) {
      if (word[j] === wordOfTheDay[j]) {
        let squareElement = document.querySelector(
          `.square-${column}-${j + 1}`
        );
        squareElement.style.backgroundColor = "green";
      } else if (wordOfTheDay.includes(word[j])) {
        let squareElement = document.querySelector(
          `.square-${column}-${j + 1}`
        );/* Em desenvolvimento para consertar erro onde letra fica amarela sem precisar
        for (m = 0; m < wordOfTheDay.length; m++) {
         if(word[j] === wordOfTheDay[m]){
          squareElement.style.backgroundColor = "red";
      } else if (letterCount[word[j]] === 0){
        squareElement.style.backgroundColor = "red";
      } else {
        letterCount[word[j]] -= 1;
        squareElement.style.backgroundColor = "yellow";
      }
     }
     } */
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
}

createBoard();
function gameIsOver() {
  if (column === 7) {
    alert("Game Over! Try again tomorrow!");
  }
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
