import WebSocket from "ws";

const ws = new WebSocket("ws://localhost:8000", { headers: { isLoggedin: "true" } });

ws.on("open", () => {
  console.log("connected");
  setInterval(() => {
    const n = String(Math.floor(100 + Math.random() * 900));
    console.log("sent:", n);
    ws.send(n);
  }, 2000);
});

ws.on("message", (data) => console.log("recv:", data.toString()));
ws.on("close", (code, reason) => console.log("closed:", code, reason.toString()));
ws.on("error", (err) => console.error("error:", err.message));
