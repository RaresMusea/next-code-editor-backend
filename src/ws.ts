import { Server, Socket } from "socket.io";
import { Server as HttpServer } from "http";
import { deleteS3File, deleteS3Folder, fetchS3Folder, renameS3Directory, renameS3File, saveToS3 } from "./aws";
import path from "path";
import { ExtendedFile, fetchDir, fetchFileContent, fileExists, saveFile } from "./fs";
import fs from "fs/promises";
import { TerminalManager } from "./pty";
import { handleRenameError } from "./error_handler";
import { validateRenaming, ValidationResult } from "./validators";
import { logger } from "./logger";
import { File } from "./fs";

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
        logger.debug(`Connected socket with ID ${socket}`);
        const replId = socket.handshake.query.roomId as string;

        if (!replId) {
            socket.disconnect();
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
            logger.error(`${error}`);
        }

        initHandlers(socket, replId);
    });
}

function initHandlers(socket: Socket, replId: string) {

    socket.on("disconnect", () => {
        logger.debug("User disconnected.");
    });

    socket.on("fetchDir", async (dir: string, callback) => {
        //const dirPath = path.join(__dirname, `../tmp/${replId}/${dir}`);
        const dirPath = path.join(__dirname, `../tmp/${replId}/${dir}`);
        const contents = await fetchDir(dirPath, dir);
        callback(contents);
    });

    socket.on("createFile", async ({ newName, parentDir }: { newName: string, parentDir: string }) => {
        const absoluteNewFilePath: string = path.join(__dirname, `../tmp/${replId}${parentDir}/${newName}`);

        if (fileExists(absoluteNewFilePath)) {
            console.error(`[ERROR]: File ${newName} already exists in ${parentDir}!`);
            socket.emit('fileCreationFailed', {
                message: "Unable to create file",
                description: `File ${newName} already exists in ${parentDir}!`
            });
            return;
        }

        try {
            await saveFile(absoluteNewFilePath, '');
            await saveToS3(`${parentDir}/${newName}`, '');
            logger.info(`[INFO]: Created file ${newName} in ${parentDir}.`);

            socket.emit('fileCreated', {
                name: newName,
                parentDir: parentDir,
                path: `${parentDir}/${newName}`
            });
        }
        catch (error) {
            logger.error(`Unable to create file ${newName} in ${parentDir}!`);
            socket.emit('fileCreationFailed', {
                message: "Unable to create file",
                description: `An error occurred while attempting to create file ${newName}!`
            });
        }
    });

    socket.on("createDirectory", async ({ newName, parentDir }: { newName: string, parentDir: string }) => {
        const absoluteNewDirPath: string = path.join(__dirname, `../tmp/${replId}${parentDir}/${newName}`);

        if (fileExists(absoluteNewDirPath)) {
            console.error(`[ERROR]: Directory ${newName} already exists in ${parentDir}!`);
            socket.emit('directoryCreationFailed', {
                message: "Unable to create directory",
                description: `Directory ${newName} already exists in ${parentDir}!`
            });
            return;
        }

        try {
            await fs.mkdir(absoluteNewDirPath);
            await saveToS3(`${parentDir}/${newName}/`, '');
            logger.info(`Created directory ${newName} in ${parentDir}.`);

            socket.emit('directoryCreated', {
                name: newName,
                parentDir: parentDir,
                path: `${parentDir}/${newName}`
            });
        }
        catch (error) {
            logger.error(`[ERROR]: Unable to create directory ${newName} in ${parentDir}!`);
            socket.emit('directoryCreationFailed', {
                message: "Unable to create directory",
                description: `An error occurred while attempting to create directory ${newName}!`
            });
        }
    });

    socket.on("renameEntity", async (data) => {await renameEntityHandler(socket, data, false)});

    socket.on('deepRename', async (data) => { await renameEntityHandler(socket, data, true) });

    socket.on("fetchContent", async ({ path: filePath }: { path: string }, callback) => {
        const fullPath = path.join(__dirname, `../tmp/${replId}/${filePath}`);
        const data = await fetchFileContent(fullPath);
        callback(data);
    });

    socket.on("deleteEntity", async ({ filePath, type }: { filePath: string, type: string }) => {
        logger.debug(`Deleting ${type} ${filePath}...`);
        const normalizedPath = filePath.slice(1);
        const fullPath: string = path.join(__dirname, `../tmp/${replId}/${normalizedPath}`);

        if (!fileExists(fullPath)) {
            logger.error(`${fullPath} does not exist or it was removed earlier!`);
            socket.emit("deleteError", {
                message: "Deletion failed",
                description: `${type} ${filePath} does not exist or it was removed earlier!`
            });
            return;
        }

        try {
            if (type === 'file') {
                await fs.unlink(fullPath);
                await deleteS3File(normalizedPath);
            }
            else if (type === 'directory') {
                await fs.rm(fullPath, { recursive: true });
                await deleteS3Folder(normalizedPath);
            }
            logger.info(`${type} ${filePath} deleted successfully.`);
            socket.emit("deletionSuccessful", {
                path: filePath,
                type
            });
        } catch (error) {
            logger.error(`Unable to delete ${filePath}!\n${error}`);
            console.log(error);
            socket.emit("deleteError", {
                message: "Deletion failed",
                description: `An error occurred while attempting to delete ${filePath}!`
            });
        }
    });

    // TODO: contents should be diff, not full file
    // Should be validated for size
    // Should be throttled before updating S3 (or use an S3 mount)
    socket.on("updateContent", async ({ path: filePath, content }: { path: string, content: string }) => {
        const fullPath = path.join(__dirname, `../tmp/${replId}/${filePath}`);
        await saveFile(fullPath, content);

        await saveToS3(filePath, content);
    });

    socket.on("requestTerminal", async () => {
        terminalManager.createPty(socket.id, replId, (data, id) => {
            socket.emit('terminal', {
                data: Buffer.from(data, "utf-8")
            });
        });
    });

    socket.on("terminalData", async ({ data }: { data: string, terminalId: number }) => {
        terminalManager.write(socket.id, data);
    });
}

async function renameEntityHandler(socket: Socket,
    data: { oldName: string; newName: string; parentId: string; type: string; children?: ExtendedFile[]; },
    isDeepRename: boolean = false) {
    const { oldName, newName, parentId, type, children } = data;
    const parent: string = parentId.slice(1);

    logger.debug(`${isDeepRename ? "Deep-renaming" : "Renaming"} ${type} ${parent}/${oldName} to ${parent}/${newName}...`);

    const oldFullPath = path.join(__dirname, `../tmp/${replId}/${parent}/${oldName}`);
    const newFullPath = path.join(__dirname, `../tmp/${replId}/${parent}/${newName}`);

    try {
        const validationResult: ValidationResult = await validateRenaming({ oldName, newName, type, parent });

        if (!validationResult.isValid) {
            socket.emit("renameError", { message: "Renaming failed", description: validationResult.message });
            logger.error(validationResult.message!);
            return;
        }

        await fs.rename(oldFullPath, newFullPath);
    } catch (error) {
        handleRenameError({
            oldPath: oldFullPath,
            newPath: newFullPath,
            code: (error as NodeJS.ErrnoException).code,
            socket,
        });
        return;
    }

    if (type === "file") {
        await renameS3File(`${parent}/${oldName}`, `${parent}/${newName}`);
    } else if (type === "directory") {
        await renameS3Directory(`${parent}/${oldName}`, `${parent}/${newName}`);
    }

    try {
        await fs.access(path.join(codeExecEngineRoot, `${parent}/${newName}`));
        logger.info(`${isDeepRename ? 'Deep-renamed' : 'Renamed'} ${parent}/${oldName} to ${parent}/${newName}.`);

        let response: { oldPath: string; newPath: string; newName: string; type: string, children?: ExtendedFile[] } = {
            oldPath: `/${parent}/${oldName}`,
            newPath: `/${parent}/${newName}`,
            newName,
            type
        };

        if (isDeepRename) {
            response.children = children?.map((child: ExtendedFile) => ({
                ...child,
                path: child.path.replace(oldName, newName),
                parentDir: child.parentDir?.includes(oldName)
                    ? child.parentDir.replace(oldName, newName)
                    : child.parentDir,
            }));
            socket.emit("deepRenameSuccessful", response);
        } else {
            socket.emit("renameSuccessful", response);
        }
    } catch (error) {
        socket.emit("renameError", { message: "Renaming failed", description: `Unable to rename file ${parent}/${oldName}!` });
    }
};
