require("dotenv").config();

const http = require("http");

const PORT = process.env.PORT || 5001;

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });

  if (req.url === "/api/tasks") {
    res.end(JSON.stringify({ message: "Tasks route working" }));
  } else {
    res.end(JSON.stringify({ message: "Mini Jira AWS Backend is running" }));
  }
});

server.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});