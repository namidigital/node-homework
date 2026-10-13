# Node.js Fundamentals

## What is Node.js?

Node.js is not a programming language. It's an environment that hosts and runs the language. JavaScript is the language, and Node is the writer's room where it gets to work outside the browser, on a computer or a server.

## How does Node.js differ from running JavaScript in the browser?

If Node is the writer's room, the browser is the bookstore. Readers can browse the books (the web page, or DOM), but they're kept out of the back office for safety. That fence is called the sandbox. Browser JavaScript can use `window`, `document`, and the DOM, but it can't read your files or start a server. Node works in the back office: it can read and write files, start web servers, read environment variables, and safely use secrets like API keys. But it has no `window`, `document`, or DOM, because there's no page for it to change.

## What is the V8 engine, and how does Node use it?

V8 is an engine that compiles JavaScript directly into the native machine code that processors understand. Google built it for the Chrome browser. Node takes that same engine out of the browser and wraps extra abilities around it, like file system and network access. So the engine running JavaScript in Chrome is the same one running it in Node.

## What are some key use cases for Node.js?

- REST APIs and web servers
- Real-time applications (chat, live dashboards)
- Streaming services and processing large files in chunks
- Command-line tools (CLIs)

## Explain the difference between CommonJS and ES Modules. Give a code example of each.

CommonJS is Node's traditional, original module system. `require()` brings code in, and `module.exports` (or `exports`) sends code out. ES Modules is the more modern standard used in browsers, React, and newer JavaScript environments. `import` brings code in, and `export` sends code out. Node supports both, but this course uses CommonJS, and you shouldn't mix the two in one project.

**CommonJS:**

```js
// mathUtils.js
function add(a, b) {
  return a + b;
}
module.exports = { add };

// app.js
const { add } = require('./mathUtils');
console.log(add(2, 3)); // 5
```

**ES Modules:**

```js
// mathUtils.mjs
export function add(a, b) {
  return a + b;
}

// app.mjs
import { add } from './mathUtils.mjs';
console.log(add(2, 3)); // 5
```
