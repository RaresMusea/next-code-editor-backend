"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
    LogLevel[LogLevel["INFO"] = 1] = "INFO";
    LogLevel[LogLevel["WARN"] = 2] = "WARN";
    LogLevel[LogLevel["ERROR"] = 3] = "ERROR";
    LogLevel[LogLevel["AWS_INFO"] = 4] = "AWS_INFO";
    LogLevel[LogLevel["AWS_WARN"] = 5] = "AWS_WARN";
    LogLevel[LogLevel["AWS_TRACE"] = 6] = "AWS_TRACE";
    LogLevel[LogLevel["AWS_ERROR"] = 7] = "AWS_ERROR";
})(LogLevel || (LogLevel = {}));
class ServerLogger {
    constructor(level = LogLevel.DEBUG) {
        this.currentLogLevel = level;
    }
    log(message, level) {
        if (level >= this.currentLogLevel) {
            const levelName = LogLevel[level];
            const timestamp = new Date().toISOString();
            const color = this.getColorForLevel(level);
            const coloredMessage = `${color}[${timestamp}] [${levelName}] ${message}\x1b[0m`;
            console.log(coloredMessage);
        }
    }
    getColorForLevel(level) {
        switch (level) {
            case LogLevel.DEBUG:
                return '\x1b[34m';
            case LogLevel.INFO:
                return '\x1b[32m';
            case LogLevel.WARN:
                return '\x1b[33m';
            case LogLevel.ERROR, LogLevel.AWS_ERROR:
                return '\x1b[31m';
            case LogLevel.AWS_INFO:
                return '\x1b[38;2;50;205;50m';
            case LogLevel.AWS_WARN:
                return '\x1b[38;2;255;165;0m';
            case LogLevel.AWS_TRACE:
                return '\x1b[38;2;128;0;128m';
            default:
                return '\x1b[37m';
        }
    }
    debug(message) {
        this.log(message, LogLevel.DEBUG);
    }
    info(message) {
        this.log(message, LogLevel.INFO);
    }
    warn(message) {
        this.log(message, LogLevel.WARN);
    }
    awsInfo(message) {
        this.log(message, LogLevel.AWS_INFO);
    }
    awsWarn(message) {
        this.log(message, LogLevel.AWS_WARN);
    }
    awsTrace(message) {
        this.log(message, LogLevel.AWS_TRACE);
    }
    awsError(message) {
        this.log(message, LogLevel.AWS_ERROR);
    }
    error(message) {
        this.log(message, LogLevel.ERROR);
    }
}
exports.logger = new ServerLogger();
