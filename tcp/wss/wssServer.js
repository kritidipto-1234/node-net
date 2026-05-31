import http from "node:http";
import { WebSocketServer } from "ws";

const HEARTBEAT_MS = 2000;

class WssServer {
  constructor(httpServer) {
    this.wss = new WebSocketServer({ noServer: true });
    httpServer.on("upgrade", (req, socket, head) => {
      console.log("upgrade connection")
      // if (req.headers["isloggedin"] !== "true") {
      //   console.log("rejecting: missing isLoggedin header");
      //   socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      //   return socket.destroy("ok");
      // }
      this.wss.handleUpgrade(req, socket, head, (ws) => this.wss.emit("connection", ws, req));
    });
    this.wss.on("connection", (ws) => this.handleConnection(ws));
    this.wss.on("error", (err) => console.error("server error:", err));
    this.heartbeat = setInterval(() => this.checkAlive(), HEARTBEAT_MS);
    this.wss.on("close", () => clearInterval(this.heartbeat));
  }

  checkAlive() {
    this.wss.clients.forEach((ws) => {
      console.log("pinging", ws.url);
      if (!ws.isAlive) {
        console.log("dead client, terminating");
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }

  handleConnection(ws) {
    console.log("new connection", ws.url);
    ws.isAlive = true;
    ws.on("pong", () => this.handlePong(ws));
    ws.on("message", (msg) => this.handleMessage(ws, msg.toString()));
    ws.on("error", (err) => this.handleError(ws, err));
    ws.on("close", (code, reason) => this.handleClose(ws, code, reason));
  }

  handlePong(ws) {
    console.log("pong received");
    ws.isAlive = true;
  }

  handleError(ws, err) {
    console.error("socket error:", err.message);
  }

  handleClose(ws, code, reason) {
    console.log("closed:", code, reason.toString());
  }

  handleMessage(ws, text) {
    console.log("message received:", text);
    if (text==='error') return ws.destroy();
    if (text === "close") return ws.close(1009, "Graceful close too long (max 10 chars)");
    ws.send([...text].reverse().join(""));
  }
}

const httpServer = http.createServer((req, res) => {
  if (req.url === "/info") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ server: "wssServer", clients: wss.wss.clients.size }));
  }
  res.writeHead(404).end();
});
const wss = new WssServer(httpServer);
httpServer.listen(8000, () => console.log(`ws://localhost:8000 (ws ready, ${wss.wss.clients.size} clients)`));
