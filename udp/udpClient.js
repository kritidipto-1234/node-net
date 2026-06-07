import dgram from "dgram"

const client = dgram.createSocket("udp4")

client.bind(0, () => {
  console.log("My address:", client.address())
  //echo  "hello from nc" | nc -u -w1 127.0.0.1 $port
})

client.on("message", (msg, rinfo) => {
  console.log("Server replied:", msg.toString())
  console.log("Server address:", rinfo.address + ":" + rinfo.port)
  // client.close()
})

setTimeout(() => {
  const message = "ping"+Date.now()
  client.send("ping", 8080, "localhost", (err) => {
    console.log("Sent:", message)
  })
}, 1000)

