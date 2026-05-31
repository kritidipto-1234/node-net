import net from "net"

const server = net.createServer(socket => {
    socket.write("Hello welcome to TCP\n")
    socket.on("data", data => {
        console.log("data recived:", data)
        console.log(data.toString())
        socket.write("You sent: " + data.toString())
        // socket.end();
    })
    // socket.pipe(socket)
})

server.listen(8080)