import dotenv from "dotenv"
dotenv.config()
import express from "express";
import { createServer } from "http";
import { initWs } from "./web_sockets/ws";
import { initHttp } from "./http/http";
import cors from "cors";
import { logger } from "./logging/logger";
import projectRoutes from './routes/projects';

const app = express();

logger.debug('App started.');

app.use(cors());
app.use(express.json());
app.use('/project', projectRoutes);
const httpServer = createServer(app);

try {
  initWs(httpServer);
  logger.debug("WebSockets initialized successfully!");
} catch (err) {
  logger.error(`Unable to initialize WebSockets.\n${err}`);
}

initHttp(app);

const port = process.env.PORT || 3001;
httpServer.listen(port, () => {
  console.log(`Listening on *:${port}`);
}).on("error", (err) => {
  logger.error(`Unable to start server!\n${err}`);
});