const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const biblePath = path.join(__dirname, '..', 'data', 'synodal-ru.json');
const bible = JSON.parse(fs.readFileSync(biblePath, 'utf8'));

function findBook(name) {
  return bible.books.find((book) => book.name === name);
}

test('офлайн-база содержит полный канонический Синодальный перевод', () => {
  assert.equal(bible.translation, 'Синодальный перевод');
  assert.equal(bible.license, 'Public Domain');
  assert.equal(bible.bookCount, 66);
  assert.equal(bible.verseCount, 31352);
  assert.equal(bible.books.length, 66);
});

test('Иоанна 3:16 доступен и содержит ожидаемое начало текста', () => {
  const john = findBook('От Иоанна');
  assert.ok(john);
  assert.equal(john.chapters[2][15].startsWith('Ибо так возлюбил Бог мир'), true);
});

test('русские сокращения сохранены для популярного поиска', () => {
  const john = findBook('От Иоанна');
  const psalms = findBook('Псалтирь');
  assert.ok(john.aliases.includes('ин'));
  assert.ok(psalms.aliases.includes('пс'));
});
