let counter = Date.now();

function generateId() {
  counter++;
  return counter.toString(36);
}

module.exports = { generateId };
