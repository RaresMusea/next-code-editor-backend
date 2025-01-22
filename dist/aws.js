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
exports.saveToS3 = exports.copyS3Folder = exports.fetchS3Folder = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const s3 = new client_s3_1.S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    },
    endpoint: process.env.S3_ENDPOINT
});
const fetchS3Folder = (key, localPath) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const params = {
            Bucket: (_a = process.env.S3_BUCKET) !== null && _a !== void 0 ? _a : "",
            Prefix: key
        };
        const command = new client_s3_1.ListObjectsV2Command(params);
        const response = yield s3.send(command);
        if (response.Contents) {
            // Use Promise.all to run getObject operations in parallel
            yield Promise.all(response.Contents.map((file) => __awaiter(void 0, void 0, void 0, function* () {
                var _b;
                const fileKey = file.Key;
                if (fileKey) {
                    const getObjectParams = {
                        Bucket: (_b = process.env.S3_BUCKET) !== null && _b !== void 0 ? _b : "",
                        Key: fileKey
                    };
                    const getObjectCommand = new client_s3_1.GetObjectCommand(getObjectParams);
                    const data = yield s3.send(getObjectCommand);
                    if (data.Body) {
                        const filePath = path_1.default.join(localPath, fileKey);
                        const bodyStream = data.Body;
                        const writeStream = fs_1.default.createWriteStream(filePath);
                        bodyStream.pipe(writeStream);
                        console.log(`Downloaded ${fileKey} to ${filePath}`);
                    }
                }
            })));
        }
    }
    catch (error) {
        console.error('Error fetching folder:', error);
    }
});
exports.fetchS3Folder = fetchS3Folder;
function copyS3Folder(sourcePrefix, destinationPrefix, continuationToken) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // List all objects in the source folder
            const listParams = {
                Bucket: (_a = process.env.S3_BUCKET) !== null && _a !== void 0 ? _a : "",
                Prefix: sourcePrefix,
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
                    Key: destinationKey
                };
                console.log(copyParams);
                const copyCommand = new client_s3_1.CopyObjectCommand(copyParams);
                yield s3.send(copyCommand);
                console.log(`Copied ${object.Key} to ${destinationKey}`);
            })));
            // Check if the list was truncated and continue copying if necessary
            if (listedObjects.IsTruncated) {
                yield copyS3Folder(sourcePrefix, destinationPrefix, listedObjects.NextContinuationToken);
            }
        }
        catch (error) {
            console.error('Error copying folder:', error);
        }
    });
}
exports.copyS3Folder = copyS3Folder;
function writeFile(filePath, fileData) {
    return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
        yield createFolder(path_1.default.dirname(filePath));
        fs_1.default.writeFile(filePath, fileData, (err) => {
            if (err) {
                reject(err);
            }
            else {
                resolve();
            }
        });
    }));
}
function createFolder(dirName) {
    return new Promise((resolve, reject) => {
        fs_1.default.mkdir(dirName, { recursive: true }, (err) => {
            if (err) {
                return reject(err);
            }
            resolve();
        });
    });
}
const saveToS3 = (key, filePath, content) => __awaiter(void 0, void 0, void 0, function* () {
    var _c;
    const params = {
        Bucket: (_c = process.env.S3_BUCKET) !== null && _c !== void 0 ? _c : "",
        Key: `${key}${filePath}`,
        Body: content
    };
    const putObjectCommand = new client_s3_1.PutObjectAclCommand(params);
    yield s3.send(putObjectCommand);
});
exports.saveToS3 = saveToS3;
