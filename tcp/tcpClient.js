import net from "net";

const client = net.createConnection({ port: 8080 }, () => {
  console.log("Connected to server");

  setInterval(() => {
    client.write("ping"+Date.now());
      // client.end();
  }, 1000);
});

client.on("data", (data) => {
  console.log("Server replied:", data.toString());
  // client.end();
});

client.on("end", () => {
  console.log("Disconnected from server");
});