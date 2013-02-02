var fs = require('fs'),
    spawn = require('child_process').spawn,
    Nxt = require('mindstorms_bluetooth').Nxt,
    _ = require('underscore')._;

var nxt = new Nxt("/dev/tty.NXT-DevB");

var dictionaryFile = 'dictionary/dictionary_full_no_accent_no_names.txt';
//    dictionaryFile = 'dictionary/dictionary_it.txt';


var wordsList = fs.readFileSync(dictionaryFile).toString().split("\n");

process.stdin.resume();
process.stdin.setEncoding('utf8');
process.stdin.write("\nDigit 'start'\n");
process.stdin.on('data', function (chunk) {
  // process.stdout.write('data: ' + chunk);
  if (chunk.toString().trim() == 'start') {
    readLettersFromTablet();
  }
});



function readLettersFromTablet() {
  var bash = spawn('./bash_script/ruzzle_download_crop_ocr.sh');
  bash.on('exit', function (code) {
    var stringFromOCR = fs.readFileSync('temp/output.txt').toString();
    console.log(stringFromOCR);

    var letters = [];
    var row = '';
    for (var y = 0; y < 4; y++) {
      letters[y] = [];
      row = stringFromOCR.substr(y * 4, 4);
      for (var x = 0; x < 4; x++) {
        letters[y][x] = row.substr(x, 1).toLowerCase();
      }
    }
    startGame(letters);
  });
  bash.stdout.on('data', function (data) {
    console.log('stdout: ' + data);
  });
  bash.stderr.on('data', function (data) {
    console.log('stderr: ' + data);
  });
}



function startGame(letters) {
  var startTime = new Date();

  var findedWords = Ruzzle.solve(letters, wordsList);

  var moves = formatAndOrderResult(findedWords);

  var endTime = new Date();

  // console.log(findedWords);
  sendViaBluetooth(moves);

  console.log("");
  console.log(letters);
  console.log("");
  console.log("FINDED WORDS = " + findedWords.length);
  console.log("TIME = " + (endTime - startTime) + 'ms');
  console.log("");
  console.log("WORDLIST = " + wordsList.length);
  console.log("CLEAN WORDS = " + Ruzzle.cleanWordList.length);
  console.log("WORD LIMIT = " + Ruzzle.WORDS_NUMBER_LIMIT);
  console.log("\nDigit 'start'\n");

}




function formatAndOrderResult(findedWords) {
  var results = [];
  var resultsForPrint = [];
  _.each(findedWords, function(wordObj) {
    var temp = [];
    _.each(_.invert(wordObj.letters), function(letter) {
      letter = letter.split(',').join('');
      temp.push(letter);
    });
    results.push('6'+ temp.join('') + '7');
    temp.unshift(wordObj.word);
    resultsForPrint.push(temp);
  });

  // console.log(resultsForPrint);

  resultsForPrint = sortMoves(resultsForPrint);

  console.log("\nSORTED:");
  console.log(resultsForPrint);

  results = [];

  for (var i = 0; i < resultsForPrint.length; i++) {
    resultsForPrint[i].shift(0);
    result = '6' + resultsForPrint[i].join('') + '7';
    results.push(result);
  }

  // console.log("RESULTS:");
  // console.log(results);
  return results;
}


// calculate distance from one move to the next
function distance(a, b) {
  // console.log(a,b);
  var lastIndex = a.length - 1;
  var endAX = a[lastIndex].substr(0, 1);
  var endAY = a[lastIndex].substr(1, 1);
  var startBX = b[1].substr(0, 1);
  var startBY = b[1].substr(1, 1);

  return Math.abs(endAX - startBX) + Math.abs(endAY - startBY);
}

  
  
// order move minimizing the path
function sortMoves(moves) {

  
  var sortedMoves = [];

  var actualMoveIndex = 0;
  sortedMoves.push(moves[actualMoveIndex]);
  moves.splice(actualMoveIndex, 1);

  for (var j = 0; j < moves.length; j++) {
    var minDistance = 10;
    var dist = 0;
    var minimumDistanceMove = null;
    var minimumDistanceMoveIndex = -1;
    if (actualMoveIndex < moves.length) {
      for (var i = 0, count = moves.length; i < count; i++) {
        dist = distance(moves[actualMoveIndex], moves[i]);
        if (dist < minDistance) {
          minimumDistanceMove = moves[i];
          minimumDistanceMoveIndex = i;
          minDistance = dist;
        }
      }
      sortedMoves.push(minimumDistanceMove);
      moves.splice(minimumDistanceMoveIndex, 1);

      actualMoveIndex = minimumDistanceMoveIndex;
    }
  }

  // push the remaining move on the bottom of sortedMoves array
  for (j = 0; j < moves.length; j++) {
    sortedMoves.push(moves[j]);
  }

  return sortedMoves;
}




function sendViaBluetooth(coords) {
  var bluetoothMessageIndex = 0;
  var intervalId = 0;
  var nxtOutbox = 2;
  // first send the length of array
  var msg = coords.join('').length.toString();
  nxt.message_write(nxtOutbox, new Buffer(msg));
  var wordPerMessage = 3;

  // console.log("bt write", msg);
  intervalId = setInterval(function() {
    var tempMsg = [];
    for (var i = bluetoothMessageIndex; i < bluetoothMessageIndex + wordPerMessage; i++) {
      tempMsg.push(coords[i]);
    }
    bluetoothMessageIndex += wordPerMessage;
    msg = tempMsg.join('');
    // console.log("bt write", msg);
    nxt.message_write(nxtOutbox, new Buffer(msg));
    
    if (bluetoothMessageIndex >= coords.length) {
      clearInterval(intervalId);
      msg = "8";
      nxt.message_write(nxtOutbox, new Buffer(msg));
      // console.log("bt write", msg);
    }
  }, 40);
}




var Ruzzle = {
  SEARCH_FOUND: 1,
  SEARCH_NOT_FOUND: 0,
  WORDS_NUMBER_LIMIT: 5000,

  pointsPerChar: {
    "a": 1, "b": 5, "c": 2,
    "d": 5, "e": 1, "f": 5,
    "g": 8, "h": 8, "i": 1,
    "j": 10, "k": 10, "l": 3,
    "m": 3, "n": 3, "o": 1,
    "p": 5, "q": 5, "r": 2,
    "s": 2, "t": 2, "u": 3,
    "v": 5, "w": 10,"x": 10,
    "y": 10, "z": 8
  },

  letters: [],
  tempWordData: {},
  cleanWordList: [],
  findedWords: [],

  solve: function solve(letters, wordList) {
    // todo: declare findedWords inside ruzzle obj
    Ruzzle.findedWords = [];

    Ruzzle.letters = letters;
    Ruzzle.cleanWordList = Ruzzle.cleanWords(wordList);
    Ruzzle.search(Ruzzle.cleanWordList);

    Ruzzle.findedWords = Ruzzle.prepareSort(Ruzzle.findedWords);

    Ruzzle.findedWords.sort(function reverseSort(a, b) {
      return b.points - a.points;
    });

    return Ruzzle.findedWords;
  },

  // clean wordsList removing unfindable word
  cleanWords: function cleanWords(wordList) {
    var letters = Ruzzle.letters;
    var limit = Ruzzle.WORDS_NUMBER_LIMIT;
    var lettersInBoard = [];
    var word = '';
    var words = [];

    for (var y = 0; y < letters.length; y++) {
      for (var x = 0; x < letters[y].length; x++) {
        lettersInBoard.push(letters[y][x]);
      }
    }
    lettersInBoard = _.uniq(lettersInBoard);

    var regexpLetters = new RegExp('[' + lettersInBoard.join('') + ']');

    for (var i = 0, count = wordList.length; i < count && i < limit; i++) {
      word = wordList[i];
      if (regexpLetters.test(word)) {
        words.push(word);
      }
    }
    return words;
  },

  search: function search(words) {
    for (var i = 0, count = words.length; i < count; i++) {
      Ruzzle.searchWord(words[i]);
    }
  },

  searchWord: function searchWord(word) {
    Ruzzle.tempWordData = {
      word: word,
      letters: {}
    };
    var pointsPerChar = Ruzzle.pointsPerChar;
    var tempWordData = Ruzzle.tempWordData;
    var letters = Ruzzle.letters;
    var wordLetterIndex = 0;
    var findedCharacters = 0;
    var wordLetter = word.substr(wordLetterIndex, 1);

    // start scanning board to find first letter
    var row = [];
    for (var y = 0, yCount = letters.length; y < yCount; y++) {
      row = letters[y];
      for (var x = 0, xCount = row.length, letter = ''; x < xCount; x++) {
        letter = letters[y][x];
        // if found, search next letters of word
        if (wordLetter === letter) {
          tempWordData.letters[x + ',' + y] = wordLetterIndex + ',' + wordLetter;
          findedCharacters++;

          if (word.length === findedCharacters) {
            findedWords.push(tempWordData);
            return;
          } else {
            // start search next letters
            wordLetterIndex++;
            var searchResult = Ruzzle.searchNeighboard(x, y, word, wordLetterIndex, findedCharacters);
            if (searchResult === Ruzzle.SEARCH_FOUND) {
              return;
            } else {
              // continue to search the word on the remaining letters
              delete tempWordData.letters[x+','+y];
              findedCharacters--;
              wordLetterIndex--;
            }
          }
        }
      }
    }
  },

  searchNeighboard: function searchNeighboard(x, y, word, wordLetterIndex, findedCharacters) {
    var letters = Ruzzle.letters;
    var tempWordData = Ruzzle.tempWordData;
    var findedWords = Ruzzle.findedWords;
    wordLetter = word.substr(wordLetterIndex, 1);
    for (var sY = y - 1; sY <= y + 1; sY++) {
      for (var sX = x - 1; sX <= x + 1; sX++) {
        if ( (sY != y || sX != x) && letters[sY] && letters[sY][sX] && letters[sY][sX] === wordLetter && !tempWordData.letters[sX + ',' + sY]) {
          tempWordData.letters[sX + ',' + sY] = wordLetterIndex + ',' + wordLetter;
          findedCharacters++;
          if (word.length === findedCharacters) {
            findedWords.push(tempWordData);
            return Ruzzle.SEARCH_FOUND;
          } else {
            wordLetterIndex ++;
            return Ruzzle.searchNeighboard(sX, sY, word, wordLetterIndex, findedCharacters);
          }
        }
      }
    }
    return Ruzzle.SEARCH_NOT_FOUND;
  },

  // add points and link to first and last letter
  prepareSort: function prepareSort(words) {
    var pointsPerChar = Ruzzle.pointsPerChar;
    orderedWords = [];
    var wordObj = {};
    var word;
    var wordLength;
    var letter;

    for (var i = 0, count = words.length; i < count; i++) {
      wordObj = words[i];
      points = 0;
      word = wordObj.word;
      wordLength = word.length;
      for (var j = 0; j < wordLength; j++) {
         letter = word.substr(j,1);
         points += pointsPerChar[letter];
      }
      wordObj.first = word.substr(0, 1);
      wordObj.last = word.substr(wordLength - 1, 1);
      wordObj.points = points;

      orderedWords.push(wordObj);
    }
    return orderedWords;
  }
};

