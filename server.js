import http from "http";
import "dotenv/config";

import { websocketServer } from "./websocket.js";

const hostname = "localhost";
const port = 8080;

const httpServer = http.createServer((request, response) => {
  if (request.url === "/health") {
    response.writeHead(200, {
      "Content-Type": "application/json",
    });

    response.end(
      JSON.stringify({
        status: "ok",
      }),
    );

    return;
  }

  response.writeHead(404);
  response.end();
});

httpServer.on("upgrade", async (request, socket, head) => {
  if (request.url !== "/ws") {
    socket.destroy();
    return;
  }

  try {
    websocketServer.handleUpgrade(request, socket, head, (websocket) => {
      websocketServer.emit("connection", websocket, request);
    });
  } catch (error) {
    console.error("WebSocket upgrade failed:", error);

    socket.write("HTTP/1.1 500 Internal Server Error\r\n\r\n");

    socket.destroy();
  }
});

httpServer.listen(port, () => {
  console.log(`> WS Server ready on http://${hostname}:${port}`);
});
