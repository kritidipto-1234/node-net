import http from "node:http";
import fs from "node:fs";
import net from "node:net";

const WSS_HOST = "localhost";
const WSS_PORT = 8000;

const handleRequest = (req, res) => {
  if (req.url === "/info") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ message: "this is just a nextjs server" }));
  }
  // if (req.url.startsWith("/wssServer/")) return forwardHTTPToWss(req, res);
  const file = req.url === "/client.js" ? "client.js" : "index.html";
  const type = file.endsWith(".js") ? "text/javascript" : "text/html";
  res.writeHead(200, { "Content-Type": type });
  fs.createReadStream(file).pipe(res);
};

// const forwardHTTPToWss = (req, res) => {
//   const upstream = net.connect(WSS_PORT, WSS_HOST, () => {
//     const upstreamUrl = req.url.replace(/^\/wssServer/, "");
//     const headerLines = Object.entries({ ...req.headers, host: `${WSS_HOST}:${WSS_PORT}` })
//       .map(([k, v]) => `${k}: ${v}\r\n`).join("");
//     upstream.write(`${req.method} ${upstreamUrl} HTTP/1.1\r\n${headerLines}\r\n`);
//     req.pipe(upstream);
//     upstream.pipe(res.socket);
//   });
//   upstream.on("error", () => res.socket?.destroy());
// };

const server = http.createServer(handleRequest);

server.on("upgrade", (req, clientSocket, head) => {
  const upstream = net.connect(WSS_PORT, WSS_HOST, () => {
    const handshake =
      `GET ${req.url} HTTP/1.1\r\n` +
      `Host: ${WSS_HOST}:${WSS_PORT}\r\n` +
      `Upgrade: websocket\r\n` +
      `Connection: Upgrade\r\n` +
      `Sec-WebSocket-Key: ${req.headers["sec-websocket-key"]}\r\n` +
      `Sec-WebSocket-Version: ${req.headers["sec-websocket-version"]}\r\n` +
      `isLoggedin: true\r\n` +
      `\r\n`;
    upstream.write(handshake);
    if (head?.length) upstream.write(head);
    clientSocket.pipe(upstream).pipe(clientSocket);
  });

  upstream.on("error", () => clientSocket.destroy());
  clientSocket.on("error", () => upstream.destroy());
});

server.listen(3000, () => console.log("http://localhost:3000 (static + ws proxy)"));
