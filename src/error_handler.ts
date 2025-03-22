import { Socket } from "socket.io";

export interface RenameError {
    oldPath: string;
    newPath: string;
    code: any;
    socket: Socket;
}

export function handleRenameError(error: RenameError) {
    if (error.code === "ENOENT") {
        error.socket.emit("renameError", {message: "Renaming failed",  description: `File ${error.oldPath} does not exist anymore or it was removed.`});
        return;
    }
    if (error.code === "EEXIST") {
        error.socket.emit("renameError", { message: "Renaming failed", description: `File ${error.newPath} already exists.`});
        return;
    }
}