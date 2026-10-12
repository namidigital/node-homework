// globals-demo.js
// Node "globals" are tools that exist everywhere without require().
// Analogy: they're like the gauges already mounted on a plant control panel.
// You don't install them; you just read them.

// __dirname = the folder this file lives in (the "building")
console.log('__dirname:', __dirname);

// __filename = the full path to this exact file (the "room" in that building)
console.log('__filename:', __filename);

// process = info about the running Node program itself
console.log('Process ID:', process.pid);       // the ID number the OS gave this run
console.log('Platform:', process.platform);    // win32, darwin (Mac), or linux

// global is Node's version of the browser's window object.
// This works, but it's usually bad practice: anything anywhere can change it,
// which makes bugs hard to trace. Prefer module.exports / require().
global.myCustomVar = 'Hello, global!';
console.log('Custom global variable:', global.myCustomVar);
