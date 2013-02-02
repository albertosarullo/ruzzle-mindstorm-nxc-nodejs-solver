var fs = require('fs');

var dictionaryFile = 'dictionary/dictionary_full_no_accent_no_names.txt';
var dictionaryNew = 'dictionary/dictionary_full_no_accent_no_names_new.txt';

var wordToRemoveFile = 'dictionary/non_ruzzle_word.txt';

var wordsList = fs.readFileSync(dictionaryFile).toString().split("\n");
var removeList = fs.readFileSync(wordToRemoveFile).toString().split("\n");
var wordFiltered = [];
for (var i = 0, count = wordsList.length; i < count; i++) {
  var word = wordsList[i];
  var include = true;
  for (var j = 0, countNomi = removeList.length; j < countNomi; j++) {
    var nome = removeList[j];
    if (word === nome) {
      include = false;
    }
  }
  if (include) {
    wordFiltered.push(word);
  }
}

console.log("removeList = " + removeList.length);
console.log("wordsList = " + wordsList.length);
console.log("wordFiltered = " + wordFiltered.length);


fs.writeFileSync(dictionaryFile, wordFiltered.join("\n"));
