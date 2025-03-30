enum LogLevel {
    DEBUG = 0,
    INFO,
    WARN,
    ERROR,
    AWS_INFO,
    AWS_WARN,
    AWS_TRACE,
    AWS_ERROR
}

class ServerLogger {
    private readonly currentLogLevel: LogLevel;

    constructor(level: LogLevel = LogLevel.DEBUG) {
        this.currentLogLevel = level;
    }

    private log(message: string, level: number): void {
        if (level >= this.currentLogLevel) {
            const levelName = LogLevel[level];
            const timestamp = new Date().toISOString();
            const color = this.getColorForLevel(level);
            const coloredMessage = `${color}[${timestamp}] [${levelName}] ${message}\x1b[0m`;
            console.log(coloredMessage);
        }
    }

    private getColorForLevel(level: number): string {
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

    public debug(message: string): void {
        this.log(message, LogLevel.DEBUG);
    }

    public info(message: string): void {
        this.log(message, LogLevel.INFO);
    }

    public warn(message: string): void {
        this.log(message, LogLevel.WARN);
    }

    public awsInfo(message: string): void {
        this.log(message, LogLevel.AWS_INFO);
    }

    public awsWarn(message: string): void {
        this.log(message, LogLevel.AWS_WARN);
    }

    public awsTrace(message: string): void {
        this.log(message, LogLevel.AWS_TRACE);
    }

    public awsError(message: string): void {
        this.log(message, LogLevel.AWS_ERROR);
    }

    public error(message: string): void {
        this.log(message, LogLevel.ERROR);
    }
}

export const logger = new ServerLogger();