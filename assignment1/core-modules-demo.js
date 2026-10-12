// core-modules-demo.js
// Core modules ship with Node; no npm install needed.
// Analogy: they're the standard tools that come in the truck (os, path, fs),
// versus npm packages, which are specialty tools you go buy.

const os = require('os');     // info about the machine
const path = require('path'); // build file paths safely on any OS
const fs = require('fs');     // file system (we'll use fs.promises + streams)

// ---- os module: system information ----
const cpus = os.cpus();
console.log('Platform:', os.platform());
console.log('CPU:', cpus.length > 0 ? cpus[0].model : 'Unknown');
console.log('Total Memory:', os.totalmem()); // in bytes

// ---- path module: join path pieces ----
// path.join adds the right slashes for Windows (\) or Mac/Linux (/),
// so you never have to glue strings together by hand.
const joinedPath = path.join(__dirname, 'sample-files', 'folder', 'file.txt');
console.log('Joined path:', joinedPath);

const sampleDir = path.join(__dirname, 'sample-files');

async function main() {
  try {
    // ---- fs.promises: write then read a file ----
    await fs.promises.mkdir(sampleDir, { recursive: true });
    const demoPath = path.join(sampleDir, 'demo.txt');
    await fs.promises.writeFile(demoPath, 'Hello from fs.promises!');
    const content = await fs.promises.readFile(demoPath, 'utf8');
    console.log('fs.promises read:', content);

    // ---- OPTIONAL: streams for large files ----
    await streamDemo();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

// Streams read data in chunks instead of loading everything at once.
// Analogy: drinking from a water fountain (a steady flow) instead of
// trying to swallow the whole water tank in one gulp.
async function streamDemo() {
  const largePath = path.join(sampleDir, 'largefile.txt');

  // Build a file with 100 lines
  let lines = '';
  for (let i = 1; i <= 100; i++) {
    lines += `This is line ${i} of a large file used to demonstrate streams.\n`;
  }
  await fs.promises.writeFile(largePath, lines);

  // Wrap the stream in a Promise so main() waits for it to finish
  return new Promise((resolve, reject) => {
    const readStream = fs.createReadStream(largePath, {
      encoding: 'utf8',
      highWaterMark: 1024, // roughly 1 KB per chunk
    });

    readStream.on('data', (chunk) => {
      console.log('Read chunk:', chunk.slice(0, 40));
    });

    readStream.on('end', () => {
      console.log('Finished reading large file with streams.');
      resolve();
    });

    readStream.on('error', (err) => {
      console.error('Stream error:', err.message);
      reject(err);
    });
  });
}

main();
