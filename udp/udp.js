import dgram from "dgram"

const server = dgram.createSocket("udp4")

server.on("message", (msg, rinfo) => {
  console.log("data received:", msg)
  console.log(msg.toString())

  server.send("You sent: " + msg.toString(), rinfo.port, rinfo.address)
})

server.on("listening", () => {
  console.log("UDP server listening on port 8080")
})

server.bind(8080)