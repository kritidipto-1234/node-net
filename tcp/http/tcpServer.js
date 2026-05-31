import http from "node:http"

const server = http.createServer((req, res) => {
  console.log("request received", req.url)

  if (req.url.startsWith("/double")) {
    const params = new URL(req.url, "http://localhost").searchParams
    const n = Number(params.get("n"))
    res.writeHead(200, {
      // "Connection": "keep-alive",
      // "Keep-Alive": "timeout=60"
    })
    res.end(`double of ${n} is ${n * 2}`)
  }
})

// server.keepAliveTimeout = 1_000
server.listen(8080)