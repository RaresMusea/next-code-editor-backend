"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const ws_1 = require("./web_sockets/ws");
const http_2 = require("./http/http");
const cors_1 = __importDefault(require("cors"));
const logger_1 = require("./logging/logger");
const projects_1 = __importDefault(require("./routes/projects"));
const app = (0, express_1.default)();
logger_1.logger.debug('App started.');
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use('/project', projects_1.default);
const httpServer = (0, http_1.createServer)(app);
try {
    (0, ws_1.initWs)(httpServer);
    logger_1.logger.debug("WebSockets initialized successfully!");
}
catch (err) {
    logger_1.logger.error(`Unable to initialize WebSockets.\n${err}`);
}
(0, http_2.initHttp)(app);
const port = process.env.PORT || 3001;
httpServer.listen(port, () => {
    console.log(`Listening on *:${port}`);
}).on("error", (err) => {
    logger_1.logger.error(`Unable to start server!\n${err}`);
});
