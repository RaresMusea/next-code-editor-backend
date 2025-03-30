//@ts-ignore => someone fix this
import { fork, IPty } from 'node-pty';
import path from "path";

const SHELL = 'C:/Program Files/Git/bin/bash.exe';
const localRoot: string = `../../tmp`;

export class TerminalManager {
    private readonly sessions: { [id: string]: {terminal: IPty, projectId: string;} } = {};

    constructor() {
        this.sessions = {};
    }
    
    createPty(id: string, projectId: string, onData: (data: string, id: number) => void) {
        let term = fork(SHELL, [], {
            cols: 100,
            name: 'xterm',
            cwd: path.join(__dirname, `${localRoot}/${projectId}`)
        });
    
        term.on('data', (data: string) => onData(data, term.pid));
        this.sessions[id] = {
            terminal: term,
            projectId
        };
        term.on('exit', () => {
            delete this.sessions[id];
        });
        return term;
    }

    write(terminalId: string, data: string) {
        if (!this.sessions[terminalId]) {
            console.error(`Terminal ${terminalId} does not exist`);
            return;
        }
        this.sessions[terminalId]?.terminal.write(data);
    }

    clear(terminalId: string) {
        this.sessions[terminalId].terminal.kill();
        delete this.sessions[terminalId];
    }
}