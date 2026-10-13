// async-demo.js
// Three ways to handle "start slow work now, get the result later."
// Analogy: ordering food at a restaurant. You place the order (start the read),
// the kitchen cooks while you do other things, and the food arrives later.

const fs = require('fs');
const path = require('path');

// Build file paths from __dirname so the script works no matter
// which folder you run `node` from.
const sampleDir = path.join(__dirname, 'sample-files');
const filePath = path.join(sampleDir, 'sample.txt');

// Setup: create the folder and file programmatically (the assignment says
// not to create sample.txt by hand). Sync is fine here because this is a
// one-time setup step in a small script, not a web server.
fs.mkdirSync(sampleDir, { recursive: true });
fs.writeFileSync(filePath, 'Hello, async world!');

// ---------------------------------------------------------------
// 1) CALLBACK STYLE
// You hand fs.readFile a function to call when it's done.
// Analogy: leaving your phone number so the restaurant can call you back.
// Node callbacks follow the (err, result) pattern: error first, data second.
// ---------------------------------------------------------------
function readWithCallback(done) {
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Callback error:', err.message);
      return done();
    }
    console.log('Callback:', data);
    done();
  });
}

/*
  CALLBACK HELL example:
  Each step needs the previous result, so you nest callbacks inside
  callbacks. The code drifts to the right like a pyramid and gets hard
  to read and to handle errors in.

  fs.readFile('a.txt', 'utf8', (err, a) => {
    if (err) return console.error(err);
    fs.readFile('b.txt', 'utf8', (err, b) => {
      if (err) return console.error(err);
      fs.writeFile('c.txt', a + b, (err) => {
        if (err) return console.error(err);
        fs.readFile('c.txt', 'utf8', (err, c) => {
          if (err) return console.error(err);
          console.log(c); // finally!
        });
      });
    });
  });

  Promises and async/await fix this by flattening the steps.
*/

// ---------------------------------------------------------------
// 2) PROMISE STYLE
// A Promise is a placeholder for a value you don't have yet.
// Analogy: the buzzer they give you at a burger joint. It's "pending"
// until it buzzes (resolve = food ready) or they tell you they're out (reject).
// Here we wrap the callback version in a Promise by hand.
// ---------------------------------------------------------------
function readFilePromise(file) {
  return new Promise((resolve, reject) => {
    fs.readFile(file, 'utf8', (err, data) => {
      if (err) {
        reject(err); // finish with an error
        return;
      }
      resolve(data); // finish successfully with the data
    });
  });
}

// ---------------------------------------------------------------
// 3) ASYNC/AWAIT STYLE
// Same Promise underneath, but reads top-to-bottom like normal code.
// `await` pauses only THIS function until the Promise settles.
// try/catch handles errors the way .catch() does for Promises.
// ---------------------------------------------------------------
async function readWithAsyncAwait() {
  try {
    const data = await fs.promises.readFile(filePath, 'utf8');
    console.log('Async/Await:', data);
  } catch (err) {
    console.error('Async/await error:', err.message);
  }
}

// Run them in order: callback -> promise -> async/await.
// Chaining guarantees the three lines print in that order.
readWithCallback(() => {
  readFilePromise(filePath)
    .then((data) => {
      console.log('Promise:', data);
      return readWithAsyncAwait();
    })
    .catch((err) => {
      console.error('Promise error:', err.message);
    });
});
