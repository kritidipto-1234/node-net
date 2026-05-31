import crypto from "node:crypto"

export const WS_MAGIC = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"

// WebSocket opcode constants (RFC 6455 §5.2)
export const OP = {
  CONTINUATION: 0x0,
  TEXT:         0x1,
  BINARY:       0x2,
  CLOSE:        0x8,
  PING:         0x9,
  PONG:         0xA,
}

// --- HTTP header parser ---

export function parseHeaders(raw) {
  const lines = raw.split("\r\n")
  const firstLine = lines[0]
  const headers = {}
  for (let i = 1; i < lines.length; i++) {
    const colon = lines[i].indexOf(":")
    if (colon === -1) continue
    headers[lines[i].slice(0, colon).trim().toLowerCase()] = lines[i].slice(colon + 1).trim()
  }
  return { firstLine, headers }
}

// --- WebSocket frame codec (RFC 6455 §5) ---

export function decodeFrame(buf) {
  let offset = 0
  const byte1 = buf[offset++]
  const byte2 = buf[offset++]

  const fin    = (byte1 & 0x80) !== 0
  const opcode = byte1 & 0x0f
  const masked = (byte2 & 0x80) !== 0
  let payloadLen = byte2 & 0x7f

  if (payloadLen === 126) {
    payloadLen = buf.readUInt16BE(offset); offset += 2
  } else if (payloadLen === 127) {
    payloadLen = Number(buf.readBigUInt64BE(offset)); offset += 8
  }

  let maskKey = null
  if (masked) {
    maskKey = buf.subarray(offset, offset + 4); offset += 4
  }

  const payload = Buffer.alloc(payloadLen)
  for (let i = 0; i < payloadLen; i++) {
    payload[i] = masked ? buf[offset + i] ^ maskKey[i % 4] : buf[offset + i]
  }

  return { fin, opcode, payload, totalLength: offset + payloadLen }
}

// encodeFrame: shouldMask must be true for client→server frames (RFC 6455 §5.3)
export function encodeFrame(opcode, payload, shouldMask = false) {
  const data = Buffer.isBuffer(payload) ? payload : Buffer.from(payload)
  const maskKey = shouldMask ? crypto.randomBytes(4) : null
  let header

  if (data.length < 126) {
    header = Buffer.alloc(shouldMask ? 6 : 2)
    header[0] = 0x80 | opcode
    header[1] = (shouldMask ? 0x80 : 0) | data.length
    if (shouldMask) maskKey.copy(header, 2)
  } else if (data.length < 65536) {
    header = Buffer.alloc(shouldMask ? 8 : 4)
    header[0] = 0x80 | opcode
    header[1] = (shouldMask ? 0x80 : 0) | 126
    header.writeUInt16BE(data.length, 2)
    if (shouldMask) maskKey.copy(header, 4)
  } else {
    header = Buffer.alloc(shouldMask ? 14 : 10)
    header[0] = 0x80 | opcode
    header[1] = (shouldMask ? 0x80 : 0) | 127
    header.writeBigUInt64BE(BigInt(data.length), 2)
    if (shouldMask) maskKey.copy(header, 10)
  }

  if (!shouldMask) return Buffer.concat([header, data])

  const masked = Buffer.alloc(data.length)
  for (let i = 0; i < data.length; i++) masked[i] = data[i] ^ maskKey[i % 4]
  return Buffer.concat([header, masked])
}

// frameSize: returns total byte length of the next complete frame, or null if not enough data yet
export function hasCompleteWssFrame(buf) {
  if (buf.length < 2) return null
  let needed = 2
  const byte2 = buf[1]
  const masked = (byte2 & 0x80) !== 0
  let len = byte2 & 0x7f

  if (len === 126) needed += 2
  else if (len === 127) needed += 8
  if (buf.length < needed) return null

  let payloadLen = len
  if (len === 126) payloadLen = buf.readUInt16BE(2)
  else if (len === 127) payloadLen = Number(buf.readBigUInt64BE(2))

  if (masked) needed += 4
  needed += payloadLen
  return buf.length >= needed ? needed : null
}
