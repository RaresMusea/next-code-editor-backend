import dotenv from "dotenv"
dotenv.config()
import express from "express";
import { createServer } from "http";
import { initWs } from "./ws";
import { initHttp } from "./http";
import cors from "cors";

const app = express();

console.log(`App started`);

app.use(cors());
const httpServer = createServer(app);

try {
  initWs(httpServer);
  console.log("WebSocket initialized");
} catch (err) {
  console.error("Error initializing WebSocket:", err);
}

initHttp(app);

const port = process.env.PORT || 3001;
httpServer.listen(port, () => {
  console.log(`listening on *:${port}`);
}).on("error", (err) => {
  console.error("Error starting server:", err);
});