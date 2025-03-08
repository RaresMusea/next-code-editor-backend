import { Server, Socket } from "socket.io";
import { Server as HttpServer } from "http";
import { fetchS3Folder, renameS3Directory, renameS3File, saveToS3 } from "./aws";
import path from "path";
import { deleteFile, fetchDir, fetchFileContent, saveFile } from "./fs";
import fs from "fs/promises";
import { TerminalManager } from "./pty";
import { handleRenameError } from "./error_handler";
import { validateRenaming, ValidationResult } from "./validators";

const terminalManager = new TerminalManager();
const replId = 'sourceforopen';
const localRootPath: string = `../tmp/${replId}`
const codeExecEngineRoot: string = path.join(__dirname, localRootPath);

export function initWs(httpServer: HttpServer) {
    const io = new Server(httpServer, {
        cors: {
            // Should restrict this more!
            origin: "*",
            methods: ["GET", "POST"],
        },
    });
      
    io.on("connection", async (socket) => {
        // Auth checks should happen here
        console.log(`Connected socket: ${socket}`);
        const replId = socket.handshake.query.roomId as string;

        if (!replId) {
            socket.disconnect();
            console.log("NOT REPL ID");
            terminalManager.clear(socket.id);
            return;
        }
        
        const s3Prefix = `code/${replId}/Project`;
        const localDir = path.join(__dirname, `../tmp/${replId}/Project`);
        const editorRoot = path.join(__dirname, `../tmp/${replId}`);

        try {
            await fetchS3Folder(s3Prefix, localDir);
            socket.emit("loaded", {
                rootContent: await fetchDir(editorRoot, "")
            });
        }
        catch (error) {
            console.error(error);
        }

        initHandlers(socket, replId);
    });
}

function initHandlers(socket: Socket, replId: string) {

    socket.on("disconnect", () => {
        console.log("user disconnected");
    });

    socket.on("fetchDir", async (dir: string, callback) => {
        //const dirPath = path.join(__dirname, `../tmp/${replId}/${dir}`);
        const dirPath = path.join(__dirname, `../tmp/${replId}/${dir}`);
        console.log("DIR FROM FETCH DIR: ", dirPath);
        const contents = await fetchDir(dirPath, dir);
        callback(contents);
    });

    socket.on("renameEntity", async (data) => {
        const { oldName, newName, parentId, type } = data;
        const parent:string = parentId.slice(1);

        console.log(`Renaming ${parent}/${oldName} to ${parent}/${newName}...`);
        
        const oldFullPath = path.join(__dirname, `../tmp/${replId}/${parent}/${oldName}`);
        console.log("Old full path: ", oldFullPath);
        const newFullPath = path.join(__dirname, `../tmp/${replId}/${parent}/${newName}`);

        try {
            const validationResult: ValidationResult = await validateRenaming({
                oldName: oldName,
                newName: newName,
                type: type,
                parent: parent,
            });

            if (!validationResult.isValid) {
                socket.emit("renameError", {
                    message: "Renaming failed",
                    description: validationResult.message
                });
                console.error(validationResult.message);

                return;
            }

            await fs.rename(oldFullPath, newFullPath);
        }
        catch (error) {
            handleRenameError({
                oldPath: oldFullPath,
                newPath: newFullPath,
                code: (error as NodeJS.ErrnoException).code,
                socket: socket,})
        }

        if (type === "file") {
            await renameS3File(`${parent}/${oldName}`, `${parent}/${newName}`);
        }
        else if (type === "directory") {
            await renameS3Directory(`${parent}/${oldName}`, `${parent}/${newName}`);
        }

        try {
            await fs.access(path.join(codeExecEngineRoot, `${parent}/${newName}`));
            socket.emit("renameSuccessful", {
                oldPath: `/${parent}/${oldName}`,
                newPath: `/${parent}/${newName}`,
                newName: newName
            });
        }
        catch(error) {
            socket.emit("renameError", {message:"Renaming failed", description: `Unable to rename file ${parent}/${oldName}!`});
        }

    });

    socket.on("fetchContent", async ({ path: filePath }: { path: string }, callback) => {
        //const fullPath = path.join(__dirname, `../tmp/${replId}/${filePath}`);
        console.log("FILE PATH: ", filePath);
        const fullPath = path.join(__dirname, `../tmp/${replId}/${filePath}`);
        const data = await fetchFileContent(fullPath);
        callback(data);
    });

    socket.on("deleteFile", async ({filePath}: {filePath: string}, callback) => {
        const fullPath = path.join(__dirname, `../tmp/${replId}`)
        const result = await deleteFile(fullPath);

        socket.emit("fileDeleted", {
            path: filePath,
        });
    });

    // TODO: contents should be diff, not full file
    // Should be validated for size
    // Should be throttled before updating S3 (or use an S3 mount)
    socket.on("updateContent", async ({ path: filePath, content }: { path: string, content: string }) => {
        const fullPath = path.join(__dirname, `../tmp/${replId}/${filePath}`);
        await saveFile(fullPath, content);
        console.log(filePath);
        
        await saveToS3(filePath, content);
    });

    socket.on("requestTerminal", async () => {
        terminalManager.createPty(socket.id, replId, (data, id) => {
            socket.emit('terminal', {
                data: Buffer.from(data,"utf-8")
            });
        });
    });
    
    socket.on("terminalData", async ({ data }: { data: string, terminalId: number }) => {
        terminalManager.write(socket.id, data);
    });

}