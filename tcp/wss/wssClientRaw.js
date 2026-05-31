import net from "node:net"
import crypto from "node:crypto"
import { OP, encodeFrame, decodeFrame, hasCompleteWssFrame, WS_MAGIC } from "./netUtils.js"

// --- handshake ---

const wsKey = crypto.randomBytes(16).toString("base64")
const expectedAccept = crypto.createHash("sha1").update(wsKey + WS_MAGIC).digest("base64")

// Returns true if the server's 101 response is valid, false otherwise.
function verifyUpgrade(socket, raw) {
  console.log("─── server response ───\n" + raw)

  if (!raw.startsWith("HTTP/1.1 101")) {
    console.error("upgrade failed!")
    socket.end()
    return false
  }

  const acceptLine = raw.split("\r\n").find(l => l.toLowerCase().startsWith("sec-websocket-accept"))
  const serverAccept = acceptLine?.split(":")[1]?.trim()
  if (serverAccept !== expectedAccept) {
    console.error("accept key mismatch!", { serverAccept, expectedAccept })
    socket.end()
    return false
  }

  console.log("handshake verified! connection upgraded to WebSocket\n")
  return true
}

const socket = net.createConnection(8001, "127.0.0.1", () => {
  const request =
    `GET / HTTP/1.1\r\n` +
    `Host: localhost:8001\r\n` +
    `Upgrade: websocket\r\n` +
    `Connection: Upgrade\r\n` +
    `Sec-WebSocket-Key: ${wsKey}\r\n` +
    `Sec-WebSocket-Version: 13\r\n` +
    `isLoggedin: true\r\n` +
    `\r\n`

  console.log("─── sending upgrade request ───\n" + request)
  socket.write(request)
})

function sendData(socket){
  setTimeout(() => {
    const n = String(Math.floor(100 + Math.random() * 900))
    console.log("sent:", n)
    // socket.write(encodeFrame(OP.TEXT, n,true))

    const frame1=encodeFrame(OP.TEXT, "aa",true)
    const frame2=encodeFrame(OP.TEXT, "bb",true)
    const frame3=encodeFrame(OP.TEXT, "cccc",true)
    const half = Math.floor(frame3.length / 2)
    socket.write(Buffer.concat([frame1, frame2, frame3.subarray(0, half)]))
    setTimeout(() => socket.write(frame3.subarray(half)), 1100)

  }, 500)
}

let upgraded = false
let buf = Buffer.alloc(0)

socket.on("data", data => {
  if (!upgraded) {
    buf = Buffer.concat([buf, data])
    if (!buf.includes("\r\n\r\n")) return

    upgraded = verifyUpgrade(socket, buf.toString())
    buf = Buffer.alloc(0)
    if (!upgraded) return

    sendData(socket)
    return
  }

  // --- frame loop ---
  buf = Buffer.concat([buf, data])

  while (hasCompleteWssFrame(buf) !== null) {
    const frame = decodeFrame(buf)
    buf = buf.subarray(frame.totalLength)

    switch (frame.opcode) {
      case OP.TEXT:
        console.log("recv:", frame.payload.toString())
        break
      case OP.CLOSE:
        console.log("close frame from server")
        socket.write(encodeFrame(OP.CLOSE, frame.payload,true))
        socket.end()
        break
      case OP.PING:
        console.log("ping from server, sending pong")
        socket.write(encodeFrame(OP.PONG, frame.payload,true))
        break
      case OP.PONG:
        console.log("pong from server")
        break
    }
  }
})

socket.on("close", () => console.log("disconnected"))
socket.on("error", err => console.error("error:", err.message))
