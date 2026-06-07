import net from "node:net"
import fs from "node:fs"

const STATIC = "tcp/static"
const VERSION = "1.1"   // switch between "1.0" and "1.1" here and check logs, u see new connection everytime for 1.0
// const CLOSE   = VERSION === "1.0"

function respond(socket, body, contentType) {
  socket.write(
    `HTTP/${VERSION} 200 OK\r\n` +
    `Content-Type: ${contentType}\r\n` +
    `Content-Length: ${Buffer.byteLength(body)}\r\n`+
    // (CLOSE ? `Connection: close\r\n` : `Connection: keep-alive\r\n`) +
    `\r\n`
  )
  socket.write(body)
  socket.write("\r\n")

  // socket.end()
  // if (CLOSE) socket.end()
}

const server = net.createServer(socket => {

  console.log("new connection")

  socket.on("data", data => {
    const request = data.toString()
    console.log("request received:\n", request)

    //Note incorrect. Frames might come in half. Use same logic as wssServerRaw
    const firstLine = request.split("\r\n")[0]
    const url = firstLine.split(" ")[1]

    if (url === "/page") {
      const body = fs.readFileSync(`${STATIC}/index.html`, "utf-8")
      respond(socket, body, "text/html")

    } else if (url === "/style.css") {
      const body = fs.readFileSync(`${STATIC}/style.css`, "utf-8")
      respond(socket, body, "text/css")

    } else if (url === "/script.js") {
      const body = fs.readFileSync(`${STATIC}/script.js`, "utf-8")
      respond(socket, body, "application/javascript")

    } else if (url.startsWith("/largeimg.jpg")) {
      const body = fs.readFileSync(`${STATIC}/largeimg.jpg`)
      respond(socket, body, "image/jpeg")

    } else if (url.startsWith("/double")) {
      const params = new URL(url, "http://localhost").searchParams
      const n = Number(params.get("n"))
      const body = JSON.stringify({ n, result: n * 2 })
      respond(socket, body, "application/json")
    }
    else {
      respond(socket, "Not Found", "text/plain")
    }
  })

  socket.on("end", () => {
    console.log("connection ended")
  })

  socket.on("error", (err) => {
    //To do - check why err is reaching here.
    //WIthout this server is failing
    console.log("error", err)
  })
})

server.listen(8080)
