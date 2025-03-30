"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleRenameError = void 0;
function handleRenameError(error) {
    if (error.code === "ENOENT") {
        error.socket.emit("renameError", { message: "Renaming failed", description: `File ${error.oldPath} does not exist anymore or it was removed.` });
        return;
    }
    if (error.code === "EEXIST") {
        error.socket.emit("renameError", { message: "Renaming failed", description: `File ${error.newPath} already exists.` });
        return;
    }
}
exports.handleRenameError = handleRenameError;
