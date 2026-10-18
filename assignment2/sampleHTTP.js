// sampleHTTP.js
// A web server built with ONLY Node's built-in http module (no Express).
// Analogy: running a plant with manual valves. Every request comes in,
// and YOU check the method and path, set the headers, and build the reply
// by hand. Express (in app.js) automates a lot of this later.

const http = require("http");

// The HTML page served at /timePage. Its button calls /time and shows the result.
const htmlString = `
<!DOCTYPE html>
<html>
<body>
<h1>Clock</h1>
<button id="getTimeBtn">Get the Time</button>
<p id="time"></p>
<script>
document.getElementById('getTimeBtn').addEventListener('click', async () => {
  const res = await fetch('/time');
  const timeObj = await res.json();
  console.log(timeObj);
  const timeP = document.getElementById('time');
  timeP.textContent = timeObj.time;
});
</script>
</body>
</html>
`;

// Small helper so we don't repeat the same 2 lines for every JSON reply.
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

// Every request lands here. req = what the client asked for, res = our reply.
const server = http.createServer((req, res) => {
  // ---- GET /time : return the current time as JSON ----
  if (req.method === "GET" && req.url === "/time") {
    sendJson(res, 200, { time: new Date().toString() });
    return;
  }

  // ---- GET /timePage : return the HTML page ----
  if (req.method === "GET" && req.url === "/timePage") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(htmlString);
    return;
  }

  // ---- POST /echo : read the JSON body and send it back ----
  // The body arrives in pieces ("chunks"), like water filling a tank.
  // "data" fires for each chunk; "end" fires when the tank is full.
  if (req.method === "POST" && req.url === "/echo") {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;
    });

    req.on("end", () => {
      // OPTIONAL Task 7: bad JSON shouldn't crash the server.
      // try/catch is the relief valve: if parsing blows up, we send a
      // 400 "Invalid JSON." instead of letting the whole server go down.
      try {
        const parsedBody = JSON.parse(body);
        sendJson(res, 200, { weReceived: parsedBody });
      } catch (error) {
        sendJson(res, 400, { message: "Invalid JSON." });
      }
    });
    return;
  }

  // ---- OPTIONAL Task 6: anything else gets a 404 ----
  sendJson(res, 404, { message: "That route is not available." });
});

server.listen(8000, () => {
  console.log("Raw HTTP server listening on port 8000...");
});
