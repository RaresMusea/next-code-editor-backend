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
exports.saveToS3 = exports.deleteS3Folder = exports.renameS3Directory = exports.renameS3File = exports.deleteS3File = exports.copyS3Folder = exports.fetchS3Folder = exports.projectNameExists = exports.folderExists = exports.getFolderDetails = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const lib_storage_1 = require("@aws-sdk/lib-storage");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logger_1 = require("../logging/logger");
const replId = 'sourceforopen'; //TO BE CHANGED
const s3 = new client_s3_1.S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    },
    endpoint: process.env.S3_ENDPOINT
});
const getFolderDetails = (key) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const tokens = key.split('/');
        const prefix = `${tokens[0]}/${tokens[1]}/`;
        const projectName = tokens[3];
        const params = {
            Bucket: (_a = process.env.S3_BUCKET) !== null && _a !== void 0 ? _a : '',
            Prefix: key,
        };
        const command = new client_s3_1.ListObjectsV2Command(params);
        const response = yield s3.send(command);
        //     const folderDetails: FolderDetails[] = response.Contents
        //         ? (await Promise.all(
        //             response.Contents.map(async (elem) => {
        //                 const elemKeyTokens = elem.Key?.split('/');
        //                 let folderName: string = '';
        //                 if (elemKeyTokens && elemKeyTokens.length >= 4) {
        //                     folderName = elemKeyTokens[3];
        //                     console.log(folderName);
        //                     const subParams = {
        //                         Bucket: process.env.S3_BUCKET ?? '',
        //                         Prefix: elem.Key
        //                     };
        //                     const subCommand = new ListObjectsV2Command(subParams);
        //                     const subResponse = await s3.send(subCommand);
        //                     const lastModified = subResponse.Contents
        //                         ?.map(item => item.LastModified)
        //                         .filter(Boolean)
        //                         .sort((a, b) => b!.getTime() - a!.getTime())[0] || null;
        //                     console.log(lastModified);
        //                     return {
        //                         name: folderName,
        //                         lastModified: lastModified ? lastModified.toDateString() : null
        //                     };
        //                 }
        //             })
        //         )).filter((item): item is FolderDetails => item !== undefined)
        //         : [];
        //     return folderDetails;
        // } catch (error) {
        //     logger.error(error as string);
        //     return [];
        // }
        // console.log(folders);
        if (response.Contents) {
            const projects = (yield Promise.all((_b = response.Contents) === null || _b === void 0 ? void 0 : _b.map((elem) => __awaiter(void 0, void 0, void 0, function* () {
                var _c, _d, _e;
                const elemKeyTokens = (_c = elem.Key) === null || _c === void 0 ? void 0 : _c.split('/');
                let folderName = '';
                if (elemKeyTokens && elemKeyTokens.length >= 4) {
                    folderName = elemKeyTokens[3];
                    const subParams = {
                        Bucket: (_d = process.env.S3_BUCKET) !== null && _d !== void 0 ? _d : '',
                        Prefix: elem.Key
                    };
                    const subCommand = new client_s3_1.ListObjectsV2Command(subParams);
                    const subResponse = yield s3.send(subCommand);
                    const lastModified = ((_e = subResponse.Contents) === null || _e === void 0 ? void 0 : _e.map(item => item.LastModified).filter(Boolean).sort((a, b) => b.getTime() - a.getTime())[0]) || null;
                    return {
                        name: folderName,
                        path: elemKeyTokens.slice(0, 4).join("/"),
                        lastModified: lastModified ? lastModified.toDateString() : null
                    };
                }
            })))).filter((item) => item !== undefined);
            const uniqueProjects = Array.from(new Map(projects.map(project => [project.name, project])).values());
            return uniqueProjects;
        }
    }
    catch (error) {
        return [];
    }
});
exports.getFolderDetails = getFolderDetails;
const folderExists = (key) => __awaiter(void 0, void 0, void 0, function* () {
    var _f;
    const params = {
        Bucket: (_f = process.env.S3_BUCKET) !== null && _f !== void 0 ? _f : '',
        Prefix: `${key}`,
    };
    try {
        const command = new client_s3_1.ListObjectsV2Command(params);
        const response = yield s3.send(command);
        if (response.Contents && response.Contents.length > 0) {
            console.warn(response.Contents);
            return response.Contents.some(c => { var _a; return (_a = c.Key) === null || _a === void 0 ? void 0 : _a.startsWith(params.Prefix); });
        }
    }
    catch (error) {
        logger_1.logger.awsError(error);
        return false;
    }
    return false;
});
exports.folderExists = folderExists;
const projectNameExists = (searchQuery, projectName) => __awaiter(void 0, void 0, void 0, function* () {
    var _g;
    const params = {
        Bucket: (_g = process.env.S3_BUCKET) !== null && _g !== void 0 ? _g : '',
        Prefix: searchQuery,
    };
    console.warn(`Searching for ${projectName} in ${searchQuery}`);
    try {
        const command = new client_s3_1.ListObjectsV2Command(params);
        const response = yield s3.send(command);
        if (response.Contents && response.Contents.length > 0) {
            return response.Contents.some(c => { var _a; return (_a = c.Key) === null || _a === void 0 ? void 0 : _a.includes(projectName); });
        }
    }
    catch (error) {
        logger_1.logger.awsError(error);
        return false;
    }
    return false;
});
exports.projectNameExists = projectNameExists;
const fetchS3Folder = (key, localPath) => __awaiter(void 0, void 0, void 0, function* () {
    var _h;
    try {
        const params = {
            Bucket: (_h = process.env.S3_BUCKET) !== null && _h !== void 0 ? _h : "",
            Prefix: key
        };
        const command = new client_s3_1.ListObjectsV2Command(params);
        const response = yield s3.send(command);
        if (response.Contents) {
            // Use Promise.all to run getObject operations in parallel            
            yield Promise.all(response.Contents.map((file) => __awaiter(void 0, void 0, void 0, function* () {
                var _j;
                const fileKey = file.Key;
                if (fileKey) {
                    if (!fileKey.endsWith('/')) {
                        const getObjectParams = {
                            Bucket: (_j = process.env.S3_BUCKET) !== null && _j !== void 0 ? _j : "",
                            Key: fileKey
                        };
                        const getObjectCommand = new client_s3_1.GetObjectCommand(getObjectParams);
                        const data = yield s3.send(getObjectCommand);
                        if (data.Body) {
                            const relativePath = fileKey.replace(key, '');
                            const filePath = path_1.default.join(localPath, relativePath);
                            const dirPath = path_1.default.dirname(filePath);
                            if (!fs_1.default.existsSync(dirPath)) {
                                fs_1.default.mkdirSync(dirPath, { recursive: true });
                            }
                            const bodyStream = data.Body;
                            const writeStream = fs_1.default.createWriteStream(filePath);
                            bodyStream.pipe(writeStream);
                            logger_1.logger.awsInfo(`Downloaded ${fileKey} to ${filePath.replace('\\', '/')}`);
                        }
                    }
                    else {
                        const relativePath = fileKey.replace(key, '');
                        const dirPath = path_1.default.join(localPath, relativePath);
                        if (!fs_1.default.existsSync(dirPath)) {
                            fs_1.default.mkdirSync(dirPath, { recursive: true });
                            logger_1.logger.awsInfo(`Dowloaded directory: ${dirPath}`);
                        }
                    }
                }
            })));
        }
    }
    catch (error) {
        logger_1.logger.awsError(`Error fetching folder.\n${error}`);
    }
});
exports.fetchS3Folder = fetchS3Folder;
function copyS3Folder(sourcePrefix, destinationPrefix, continuationToken) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        logger_1.logger.awsTrace(`Copying ${sourcePrefix} to ${destinationPrefix}... `);
        try {
            // List all objects in the source folder
            const listParams = {
                Bucket: (_a = process.env.S3_BUCKET) !== null && _a !== void 0 ? _a : "",
                Prefix: `${sourcePrefix}`,
                ContinuationToken: continuationToken
            };
            const listCommand = new client_s3_1.ListObjectsV2Command(listParams);
            const listedObjects = yield s3.send(listCommand);
            if (!listedObjects.Contents || listedObjects.Contents.length === 0)
                return;
            // Copy each object to the new location
            yield Promise.all(listedObjects.Contents.map((object) => __awaiter(this, void 0, void 0, function* () {
                var _b;
                if (!object.Key)
                    return;
                let destinationKey = object.Key.replace(sourcePrefix, destinationPrefix);
                let copyParams = {
                    Bucket: (_b = process.env.S3_BUCKET) !== null && _b !== void 0 ? _b : "",
                    CopySource: `${process.env.S3_BUCKET}/${object.Key}`,
                    Key: destinationKey,
                    ACL: client_s3_1.ObjectCannedACL.private
                };
                const copyCommand = new client_s3_1.CopyObjectCommand(copyParams);
                yield s3.send(copyCommand);
                logger_1.logger.awsInfo(`Copied ${object.Key} to ${destinationKey}`);
            })));
            // Check if the list was truncated and continue copying if necessary
            if (listedObjects.IsTruncated) {
                yield copyS3Folder(sourcePrefix, destinationPrefix, listedObjects.NextContinuationToken);
            }
        }
        catch (error) {
            logger_1.logger.error(`Error copying folder.\n${error}`);
        }
    });
}
exports.copyS3Folder = copyS3Folder;
function deleteS3File(sourceKey) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const deleteParams = {
                Bucket: (_a = process.env.S3_BUCKET) !== null && _a !== void 0 ? _a : "",
                Key: `code/${sourceKey}`
            };
            const deleteCommand = new client_s3_1.DeleteObjectCommand(deleteParams);
            yield s3.send(deleteCommand);
            logger_1.logger.awsInfo(`Successfully deleted ${sourceKey} from S3.`);
        }
        catch (error) {
            logger_1.logger.awsError(`Unable to delete S3 object ${sourceKey}.\n${error}`);
            throw error;
        }
    });
}
exports.deleteS3File = deleteS3File;
function renameS3File(sourceKey, destinationKey) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const copyParams = {
                Bucket: (_a = process.env.S3_BUCKET) !== null && _a !== void 0 ? _a : "",
                CopySource: `${process.env.S3_BUCKET}/code/${sourceKey}`,
                Key: `code/${destinationKey}`,
                ACL: client_s3_1.ObjectCannedACL.private
            };
            const copyCommand = new client_s3_1.CopyObjectCommand(copyParams);
            yield s3.send(copyCommand);
            yield deleteS3File(sourceKey);
            logger_1.logger.awsInfo(`Successfully renamed ${sourceKey} to ${destinationKey}`);
        }
        catch (error) {
            logger_1.logger.awsError(`Unable to rename object ${sourceKey}.\n${error}`);
            throw error;
        }
    });
}
exports.renameS3File = renameS3File;
function renameS3Directory(oldPrefix, newPrefix) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield copyS3Folder(`code/${oldPrefix}`, `code/${newPrefix}`);
            yield deleteS3Folder(oldPrefix);
            logger_1.logger.awsInfo(`Renamed directory ${oldPrefix} to ${newPrefix}.`);
        }
        catch (error) {
            logger_1.logger.awsInfo(`Unable to remove S3 directory ${oldPrefix}.\n${error}`);
            throw error;
        }
    });
}
exports.renameS3Directory = renameS3Directory;
function deleteS3Folder(prefix) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const listParams = {
                Bucket: (_a = process.env.S3_BUCKET) !== null && _a !== void 0 ? _a : "",
                Prefix: `code/${prefix}`
            };
            const listCommand = new client_s3_1.ListObjectsV2Command(listParams);
            const listedObjects = yield s3.send(listCommand);
            if (!listedObjects.Contents || listedObjects.Contents.length === 0)
                return;
            yield Promise.all(listedObjects.Contents.map((object) => __awaiter(this, void 0, void 0, function* () {
                var _b;
                if (!object.Key)
                    return;
                if (!object.Key.startsWith(listParams.Prefix + "/") && object.Key !== listParams.Prefix) {
                    logger_1.logger.awsTrace(`Skipping ${object.Key} - not an exact match for ${listParams.Prefix}.`);
                    return;
                }
                const deleteParams = {
                    Bucket: (_b = process.env.S3_BUCKET) !== null && _b !== void 0 ? _b : "",
                    Key: object.Key
                };
                const deleteCommand = new client_s3_1.DeleteObjectCommand(deleteParams);
                yield s3.send(deleteCommand);
                logger_1.logger.awsInfo(`Deleted ${object.Key}`);
            })));
            if (listedObjects.IsTruncated) {
                yield deleteS3Folder(prefix);
            }
        }
        catch (error) {
            logger_1.logger.awsError(`Unable to delete S3 folder ${prefix}.\n${error}`);
        }
    });
}
exports.deleteS3Folder = deleteS3Folder;
const saveToS3 = (filePath, content) => __awaiter(void 0, void 0, void 0, function* () {
    var _k;
    const params = {
        Bucket: (_k = process.env.S3_BUCKET) !== null && _k !== void 0 ? _k : "",
        Key: `code/${filePath}`,
        Body: content,
        ACL: client_s3_1.ObjectCannedACL.private
    };
    const upload = new lib_storage_1.Upload({
        client: s3,
        params: params
    });
    try {
        yield upload.done();
    }
    catch (error) {
        console.error(error);
    }
});
exports.saveToS3 = saveToS3;
