import net from "node:net";
import crypto from "node:crypto";

const HOST = "localhost";
const PORT = 8000;

// ─── handshake ──────────────────────────────────────────────────────────────
// Client picks 16 random bytes, base64s them, sends as Sec-WebSocket-Key.
// Server must reply with base64(sha1(key + GUID)). GUID is hard-coded in RFC 6455.
const WS_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
const key = crypto.randomBytes(16).toString("base64");
const expectedAccept = crypto.createHash("sha1").update(key + WS_GUID).digest("base64");

const socket = net.connect(PORT, HOST, () => {
  socket.write(
    `GET / HTTP/1.1\r\n` +
    `Host: ${HOST}:${PORT}\r\n` +
    `Upgrade: websocket\r\n` +
    `Connection: Upgrade\r\n` +
    `Sec-WebSocket-Key: ${key}\r\n` +
    `Sec-WebSocket-Version: 13\r\n` +
    `isLoggedin: true\r\n` +
    `\r\n`
  );
});

let handshakeDone = false;
let buffer = Buffer.alloc(0);

socket.on("data", (chunk) => {
  buffer = Buffer.concat([buffer, chunk]);

  if (!handshakeDone) {
    const headerEnd = buffer.indexOf("\r\n\r\n");
    if (headerEnd === -1) return; // wait for more bytes
    const headerText = buffer.slice(0, headerEnd).toString();
    buffer = buffer.slice(headerEnd + 4); // remainder may already contain frames

    const accept = /sec-websocket-accept: (.+)/i.exec(headerText)?.[1]?.trim();
    if (!headerText.startsWith("HTTP/1.1 101") || accept !== expectedAccept) {
      console.error("handshake failed:\n" + headerText);
      return socket.destroy();
    }
    handshakeDone = true;
    console.log("connected");
    startSending();
  }

  // process as many complete frames as the buffer currently holds
  while (true) {
    const frame = tryDecodeFrame(buffer);
    if (!frame) break;
    buffer = buffer.slice(frame.size);
    handleFrame(frame);
  }
});

socket.on("close", () => console.log("closed"));
socket.on("error", (err) => console.error("error:", err.message));

// ─── frame encode (client → server, MUST be masked) ─────────────────────────
// Layout for a text frame with payload < 126 bytes (our case, 3 digits):
//   byte 0: 0x81           = FIN(1) + RSV(000) + opcode(0001 = text)
//   byte 1: 0x80 | len     = MASK(1) + 7-bit length
//   bytes 2..5: mask key (4 random bytes)
//   bytes 6..:  payload XOR mask[i % 4]
function encodeTextFrame(text) {
  const payload = Buffer.from(text, "utf8");
  const mask = crypto.randomBytes(4);
  const masked = Buffer.alloc(payload.length);
  for (let i = 0; i < payload.length; i++) masked[i] = payload[i] ^ mask[i % 4];

  if (payload.length >= 126) throw new Error("this demo only handles short payloads");

  return Buffer.concat([
    Buffer.from([0x81, 0x80 | payload.length]),
    mask,
    masked,
  ]);
}

// ─── frame decode (server → client, never masked) ───────────────────────────
// Returns { opcode, payload, size } or null if buf doesn't yet hold a full frame.
// `size` = total bytes consumed, so the caller can slice the buffer.
function tryDecodeFrame(buf) {
  if (buf.length < 2) return null;

  const b0 = buf[0];
  const b1 = buf[1];
  const opcode = b0 & 0x0f;
  const masked = (b1 & 0x80) !== 0;
  let len = b1 & 0x7f;
  let offset = 2;

  if (len === 126) {
    if (buf.length < offset + 2) return null;
    len = buf.readUInt16BE(offset);
    offset += 2;
  } else if (len === 127) {
    if (buf.length < offset + 8) return null;
    // payloads > 2^32 aren't realistic for this demo; readUInt32BE on the low half is fine
    len = Number(buf.readBigUInt64BE(offset));
    offset += 8;
  }

  // server frames are unmasked per spec; we don't expect a mask key here
  if (masked) {
    console.error("unexpected mask bit on server frame");
    socket.destroy();
    return null;
  }

  if (buf.length < offset + len) return null;
  const payload = buf.slice(offset, offset + len);
  return { opcode, payload, size: offset + len };
}

function handleFrame({ opcode, payload }) {
  switch (opcode) {
    case 0x1: return console.log("recv:", payload.toString("utf8"));
    case 0x8: return socket.end(); // close
    case 0x9: return socket.write(Buffer.concat([Buffer.from([0x8a, 0x80]), crypto.randomBytes(4)])); // ping → pong (empty)
    case 0xa: return; // pong, ignore
    default:  return console.log("frame opcode", opcode, "ignored");
  }
}

// ─── app logic ──────────────────────────────────────────────────────────────
function startSending() {
  setInterval(() => {
    const n = String(Math.floor(100 + Math.random() * 900));
    console.log("sent:", n);
    socket.write(encodeTextFrame(n));
  }, 2000);
}
