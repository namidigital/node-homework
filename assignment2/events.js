// events.js
// An EventEmitter is like a plant's alarm system:
//   - emit()  = a sensor tripping and sounding an alarm
//   - on()    = an operator assigned to respond whenever that alarm sounds
// The sensor doesn't need to know who's listening; it just announces "time!".

const EventEmitter = require("events");
const emitter = new EventEmitter();

// The listener: whenever a "time" event fires, this function runs.
emitter.on("time", (message) => {
  console.log("Time received:", message);
});

// Export the emitter so other files (and the tests) can use it.
module.exports = emitter;

// Only start the 5-second timer when this file is run directly
// (node assignment2/events.js), NOT when a test imports it.
// Analogy: the alarm test only runs when you're on site, not when
// someone is just reading the manual.
if (require.main === module) {
  setInterval(() => {
    const currentTime = new Date().toString();
    emitter.emit("time", currentTime);
  }, 5000);
}
