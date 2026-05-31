class Client {
  constructor(url, { onEvent } = {}) {
    this.url = url;
    this.onEvent = onEvent || (() => {});
    this.retry = 0;
    this.connect();
  }

  connect() {
    this.ws = new WebSocket(this.url);
    window.ws=this.ws;
    this.ws.onopen = () => this.handleOpen();
    this.ws.onmessage = (e) => this.handleMessage(e.data);
    this.ws.onerror = (e) => this.handleError(e);
    this.ws.onclose = (e) => this.handleClose(e);
  }

  logWssState(){
    console.log("WebSocket state:", this.ws.readyState);
  }

  handleOpen(e) {
    console.log("connection opened:", e);
    this.retry = 0;
    this.emit("sys", "Connected");
  }

  handleError(e) {
    console.error("connection error:", e);
    this.emit("err", "connection error");
  }

  handleMessage(data) {
    try {
      const parsed = JSON.parse(data);
      if (parsed.error) return this.emit("err", `error: ${parsed.error}`);
    } catch { /* plain text echo */ }
    this.emit("srv", `server: ${data}`);
  }

  handleClose(e) {
    console.log("closing connection", this.ws.readyState, e);
    if (e.reason) this.emit("err", `closed by server: ${e.reason}`);
    // const delay = Math.min(1000 * 2);
    this.emit("err", `disconnected`);
    // setTimeout(() => this.connect(), delay);
  }

  send(text) {
    if (this.ws.readyState !== WebSocket.OPEN) return this.emit("err", "not connected");
    this.emit("me", `you: ${text}`);
    this.ws.send(text);
  }

  close(code = 1000, reason = "client closed") {
    if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
      this.ws.close(code, reason);
    } else {
      this.emit("err", "already closed");
    }
  }

  emit(kind, text) { this.onEvent(kind, text); }
}

const log = document.getElementById("log");
const render = (cls, text) => {
  log.insertAdjacentHTML("beforeend", `<div class="${cls}">${text}</div>`);
  log.scrollTop = log.scrollHeight;
};

const client = new Client(`ws://localhost:3000`, { onEvent: render });

document.getElementById("f").onsubmit = (e) => {
  e.preventDefault();
  const input = document.getElementById("m");
  if (!input.value) return;
  client.send(input.value);
  input.value = "";
};

document.getElementById("disconnect").onclick = () => client.close();
document.getElementById("reconnect").onclick = () => client.connect();

window.addEventListener("offline", (e) => {
  console.log("offline",window.navigator.onLine,client.ws.readyState);
});

window.addEventListener("online", (e) => {
  console.log("online",window.navigator.onLine,client.ws.readyState);
});

setInterval(()=>{
console.log("Wss state:", client.ws.readyState);
},1000)