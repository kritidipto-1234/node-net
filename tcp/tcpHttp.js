import net from "node:net"

const server = net.createServer(socket => {

  socket.on("data", data => {
    const request = data.toString()
    console.log("request received:\n", request)

    // parse the first line: "GET /double?n=5 HTTP/1.1"
    const firstLine = request.split("\r\n")[0]
    const url = firstLine.split(" ")[1]

    if (url.startsWith("/double")) {
      const params = new URL(url, "http://localhost").searchParams
      const n = Number(params.get("n"))
      const body = `double of ${n} is ${n * 2}\n`

      socket.write(
        `HTTP/1.1 200 OK\r\n` +
        `Content-Type: text/plain\r\n` +
        `Content-Length: ${body.length}\r\n` +
        `\r\n` +
        body
      )
    }

    socket.end()
  })
})

server.listen(8080)