import net from "node:net"
import crypto from "node:crypto"
import { OP, parseHeaders, encodeFrame, decodeFrame, hasCompleteWssFrame, WS_MAGIC } from "./netUtils.js"

const acceptKey = clientKey => crypto.createHash("sha1").update(clientKey + WS_MAGIC).digest("base64")

// --- upgrade handshake ---

// Returns true if the upgrade succeeded, false if the socket was rejected.
function upgrade(socket, raw, clients) {
  console.log("─── incoming HTTP request ───\n" + raw)

  const { headers } = parseHeaders(raw)

  if (
    headers["upgrade"]?.toLowerCase() !== "websocket" ||
    !headers["connection"]?.toLowerCase().includes("upgrade") ||
    !headers["sec-websocket-key"]
  ) {
    socket.write("HTTP/1.1 400 Bad Request\r\n\r\nNot a WebSocket upgrade\n")
    socket.end()
    return false
  }

  if (headers["isloggedin"] !== "true") {
    console.log("rejecting: missing isLoggedin header")
    socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n")
    socket.end()
    return false
  }

  const response =
    `HTTP/1.1 101 Switching Protocols\r\n` +
    `Upgrade: websocket\r\n` +
    `Connection: Upgrade\r\n` +
    `Sec-WebSocket-Accept: ${acceptKey(headers["sec-websocket-key"])}\r\n` +
    `\r\n`

  console.log("─── sending 101 ───\n" + response)
  socket.write(response)
  clients.add(socket)
  console.log(`client connected (${clients.size} total)`)
  return true
}

// --- server ---

const clients = new Set()

const server = net.createServer(socket => {
  let upgraded = false
  let buf = Buffer.alloc(0)

  socket.on("data", data => {
    if (!upgraded) {
      buf = Buffer.concat([buf, data])
      if (!buf.includes("\r\n\r\n")) return

      upgraded = upgrade(socket, buf.toString(), clients)
      buf = Buffer.alloc(0)
      return
    }

    // --- frame loop ---
    buf = Buffer.concat([buf, data])

    while (hasCompleteWssFrame(buf) !== null) {
      const frame = decodeFrame(buf)
      buf = buf.subarray(frame.totalLength)

      switch (frame.opcode) {
        case OP.TEXT: {
          const text = frame.payload.toString()
          console.log("recv:", text)
          if (text === "close") {
            const reason = Buffer.from("Graceful close (max 10 chars)")
            const body = Buffer.alloc(2 + reason.length)
            body.writeUInt16BE(1009, 0)
            reason.copy(body, 2)
            socket.write(encodeFrame(OP.CLOSE, body))
            socket.end()
          } else if (text === "error") {
            socket.destroy()
          } else {
            socket.write(encodeFrame(OP.TEXT, [...text].reverse().join("")))
          }
          break
        }
        case OP.CLOSE:
          console.log("close frame received")
          socket.write(encodeFrame(OP.CLOSE, frame.payload))
          socket.end()
          break
        case OP.PING:
          console.log("ping received, sending pong")
          socket.write(encodeFrame(OP.PONG, frame.payload))
          break
        case OP.PONG:
          console.log("pong received")
          break
      }
    }
  })

  socket.on("close", () => {
    clients.delete(socket)
    console.log(`client disconnected (${clients.size} total)`)
  })
  socket.on("error", err => console.error("socket error:", err.message))
})

setInterval(() => {
  for (const s of clients) s.write(encodeFrame(OP.PING, Buffer.alloc(0)))
}, 5000)

server.listen(8001, () => console.log("raw ws server on ws://localhost:8001"))
