"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initWs = void 0;
const socket_io_1 = require("socket.io");
const aws_1 = require("../aws/aws");
const path_1 = __importDefault(require("path"));
const fs_1 = require("../filesystem/fs");
const promises_1 = __importDefault(require("fs/promises"));
const pty_1 = require("../pseudoterminal/pty");
const error_handler_1 = require("../error_handler");
const validators_1 = require("../validation/validators");
const logger_1 = require("../logging/logger");
const terminalManager = new pty_1.TerminalManager();
//const replId = 'sourceforopen';
const localRoot = '../../tmp';
function initWs(httpServer) {
    const io = new socket_io_1.Server(httpServer, {
        cors: {
            // Should restrict this more!
            origin: "*",
            methods: ["GET", "POST"],
        },
    });
    io.on("connection", (socket) => __awaiter(this, void 0, void 0, function* () {
        // Auth checks should happen here
        logger_1.logger.debug(`Connected socket with ID ${socket}`);
        const projectId = socket.handshake.query.roomId;
        const projectRoot = projectId.slice(0, projectId.lastIndexOf("/"));
        console.log(projectRoot);
        if (!projectId) {
            socket.disconnect();
            terminalManager.clear(socket.id);
            return;
        }
        const localProjectId = projectRoot.replace('code/', '');
        //Before: code/sourceforopen/TestProj
        const s3Prefix = `${projectId}`;
        const localDir = path_1.default.join(__dirname, `${localRoot}/${localProjectId}`);
        const editorRoot = path_1.default.join(__dirname, `${localRoot}/${localProjectId}`);
        try {
            yield (0, aws_1.fetchS3Folder)(projectRoot, editorRoot);
            socket.emit("loaded", {
                rootContent: yield (0, fs_1.fetchDir)(localDir, "")
            });
        }
        catch (error) {
            logger_1.logger.error(`${error}`);
        }
        initHandlers(socket, projectRoot.replace('code/', ''), localProjectId);
    }));
}
exports.initWs = initWs;
function initHandlers(socket, projectId, pathForTem) {
    socket.on("disconnect", () => {
        logger_1.logger.debug("User disconnected.");
    });
    socket.on("fetchDir", (dir, callback) => __awaiter(this, void 0, void 0, function* () {
        //const dirPath = path.join(__dirname, `../tmp/${replId}/${dir}`);
        console.log(projectId);
        const dirPath = path_1.default.join(__dirname, `${localRoot}/${projectId}/${dir}`);
        const contents = yield (0, fs_1.fetchDir)(dirPath, dir);
        callback(contents);
    }));
    socket.on("createFile", ({ newName, parentDir }) => __awaiter(this, void 0, void 0, function* () {
        const absoluteNewFilePath = path_1.default.join(__dirname, `${localRoot}/${projectId}${parentDir}/${newName}`);
        if ((0, fs_1.fileExists)(absoluteNewFilePath)) {
            logger_1.logger.error(`File ${newName} already exists in ${parentDir}!`);
            socket.emit('fileCreationFailed', {
                message: "Unable to create file",
                description: `File ${newName} already exists in ${parentDir}!`
            });
            return;
        }
        try {
            yield (0, fs_1.saveFile)(absoluteNewFilePath, '');
            yield (0, aws_1.saveToS3)(`${projectId}${parentDir}/${newName}`, '');
            logger_1.logger.info(`[INFO]: Created file ${newName} in ${parentDir}.`);
            socket.emit('fileCreated', {
                name: newName,
                parentDir: parentDir,
                path: `${parentDir}/${newName}`
            });
        }
        catch (error) {
            logger_1.logger.error(`Unable to create file ${newName} in ${parentDir}!`);
            socket.emit('fileCreationFailed', {
                message: "Unable to create file",
                description: `An error occurred while attempting to create file ${newName}!`
            });
        }
    }));
    socket.on("createDirectory", ({ newName, parentDir }) => __awaiter(this, void 0, void 0, function* () {
        const absoluteNewDirPath = path_1.default.join(__dirname, `${localRoot}/${projectId}${parentDir}/${newName}`);
        const normalizedParentDir = parentDir.slice(1);
        if ((0, fs_1.fileExists)(absoluteNewDirPath)) {
            console.error(`[ERROR]: Directory ${newName} already exists in ${parentDir}!`);
            socket.emit('directoryCreationFailed', {
                message: "Unable to create directory",
                description: `Directory ${newName} already exists in ${parentDir}!`
            });
            return;
        }
        try {
            yield promises_1.default.mkdir(absoluteNewDirPath);
            yield (0, aws_1.saveToS3)(`${projectId}/${normalizedParentDir}/${newName}/`, '');
            logger_1.logger.info(`Created directory ${newName} in ${parentDir}.`);
            socket.emit('directoryCreated', {
                name: newName,
                parentDir: parentDir,
                path: `${parentDir}/${newName}`
            });
        }
        catch (error) {
            logger_1.logger.error(`Unable to create directory ${newName} in ${parentDir}!`);
            socket.emit('directoryCreationFailed', {
                message: "Unable to create directory",
                description: `An error occurred while attempting to create directory ${newName}!`
            });
        }
    }));
    socket.on("renameEntity", (data) => __awaiter(this, void 0, void 0, function* () { yield renameEntityHandler(socket, data, false, projectId); }));
    socket.on('deepRename', (data) => __awaiter(this, void 0, void 0, function* () { yield renameEntityHandler(socket, data, true, projectId); }));
    socket.on("fetchContent", ({ path: filePath }, callback) => __awaiter(this, void 0, void 0, function* () {
        const fullPath = path_1.default.join(__dirname, `${localRoot}/${projectId}/${filePath}`);
        const data = yield (0, fs_1.fetchFileContent)(fullPath);
        callback(data);
    }));
    socket.on("deleteEntity", ({ filePath, type }) => __awaiter(this, void 0, void 0, function* () {
        logger_1.logger.debug(`Deleting ${type} ${filePath}...`);
        const normalizedPath = filePath.slice(1);
        const fullPath = path_1.default.join(__dirname, `${localRoot}/${projectId}/${normalizedPath}`);
        const deletionValidation = (0, validators_1.validateDeletion)(filePath, type);
        if (!deletionValidation.isValid) {
            socket.emit('entityDeletionFailed', { message: 'Deletion failed', description: deletionValidation === null || deletionValidation === void 0 ? void 0 : deletionValidation.message });
            return;
        }
        if (!(0, fs_1.fileExists)(fullPath)) {
            logger_1.logger.error(`${fullPath} does not exist or it was removed earlier!`);
            socket.emit("entityDeletionFailed", {
                message: "Deletion failed",
                description: `${type} ${filePath} does not exist or it was removed earlier!`
            });
            return;
        }
        try {
            if (type === 'file') {
                yield promises_1.default.unlink(fullPath);
                yield (0, aws_1.deleteS3File)(`${projectId}/${normalizedPath}`);
            }
            else if (type === 'directory') {
                yield promises_1.default.rm(fullPath, { recursive: true });
                yield (0, aws_1.deleteS3Folder)(`${projectId}/${normalizedPath}`);
            }
            logger_1.logger.info(`${type} ${filePath} deleted successfully.`);
            socket.emit("deletionSuccessful", {
                path: filePath,
                type
            });
        }
        catch (error) {
            logger_1.logger.error(`Unable to delete ${filePath}!\n${error}`);
            console.log(error);
            socket.emit("entityDeletionFailed", {
                message: "Deletion failed",
                description: `An error occurred while attempting to delete ${filePath}!`
            });
        }
    }));
    // TODO: contents should be diff, not full file
    // Should be validated for size
    // Should be throttled before updating S3 (or use an S3 mount)
    socket.on("updateContent", ({ path: filePath, content }) => __awaiter(this, void 0, void 0, function* () {
        const fullPath = path_1.default.join(__dirname, `${localRoot}/${projectId}/${filePath}`);
        yield (0, fs_1.saveFile)(fullPath, content);
        let appPath = filePath;
        if (appPath.startsWith('/')) {
            appPath = appPath.slice(1);
        }
        console.log(appPath);
        yield (0, aws_1.saveToS3)(`${projectId}/${appPath}`, content);
    }));
    socket.on("requestTerminal", () => __awaiter(this, void 0, void 0, function* () {
        terminalManager.createPty(socket.id, pathForTem, (data, id) => {
            socket.emit('terminal', {
                data: Buffer.from(data, "utf-8")
            });
        });
    }));
    socket.on("terminalData", ({ data }) => __awaiter(this, void 0, void 0, function* () {
        terminalManager.write(socket.id, data);
    }));
}
function renameEntityHandler(socket, data, isDeepRename = false, projectId) {
    return __awaiter(this, void 0, void 0, function* () {
        const { oldName, newName, parentId, type, children } = data;
        const parent = parentId.slice(1);
        logger_1.logger.debug(`${isDeepRename ? "Deep-renaming" : "Renaming"} ${type} ${parent}/${oldName} to ${parent}/${newName}...`);
        const oldFullPath = path_1.default.join(__dirname, `${localRoot}/${projectId}/${parent}/${oldName}`);
        const newFullPath = path_1.default.join(__dirname, `${localRoot}/${projectId}/${parent}/${newName}`);
        try {
            const validationResult = yield (0, validators_1.validateRenaming)({ oldName, newName, type, parent });
            if (!validationResult.isValid) {
                socket.emit("renameError", { message: "Renaming failed", description: validationResult.message });
                logger_1.logger.error(validationResult.message);
                return;
            }
            yield promises_1.default.rename(oldFullPath, newFullPath);
        }
        catch (error) {
            (0, error_handler_1.handleRenameError)({
                oldPath: oldFullPath,
                newPath: newFullPath,
                code: error.code,
                socket,
            });
            return;
        }
        if (type === "file") {
            yield (0, aws_1.renameS3File)(`${projectId}/${parent}/${oldName}`, `${projectId}/${parent}/${newName}`);
        }
        else if (type === "directory") {
            yield (0, aws_1.renameS3Directory)(`${projectId}/${parent}/${oldName}`, `${projectId}/${parent}/${newName}`);
        }
        try {
            yield promises_1.default.access(`${path_1.default.join(__dirname, `${localRoot}/${projectId}`)}/${parent}/${newName}`);
            logger_1.logger.info(`${isDeepRename ? 'Deep-renamed' : 'Renamed'} ${parent}/${oldName} to ${parent}/${newName}.`);
            let response = {
                oldPath: `/${parent}/${oldName}`,
                newPath: `/${parent}/${newName}`,
                newName,
                type
            };
            if (isDeepRename) {
                response.children = children === null || children === void 0 ? void 0 : children.map((child) => {
                    var _a;
                    return (Object.assign(Object.assign({}, child), { path: child.path.replace(oldName, newName), parentDir: ((_a = child.parentDir) === null || _a === void 0 ? void 0 : _a.includes(oldName))
                            ? child.parentDir.replace(oldName, newName)
                            : child.parentDir }));
                });
                socket.emit("deepRenameSuccessful", response);
            }
            else {
                socket.emit("renameSuccessful", response);
            }
        }
        catch (error) {
            console.error(error);
            socket.emit("renameError", { message: "Renaming failed", description: `Unable to rename file ${parent}/${oldName}!` });
        }
    });
}
;
