import { S3Client, ListObjectsV2Command, GetObjectCommand, CopyObjectCommand, PutObjectAclCommand, ObjectCannedACL, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"
import { Upload } from "@aws-sdk/lib-storage";
import fs from "fs";
import path from "path";
import { Readable } from "stream";
import { logger } from "./logger";
import e from "express";

const replId = 'sourceforopen'; //TO BE CHANGED

const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
    },
    endpoint: process.env.S3_ENDPOINT
});


export const fetchS3Folder = async (key: string, localPath: string): Promise<void> => {
    try {
        const params = {
            Bucket: process.env.S3_BUCKET ?? "",
            Prefix: key
        };

        const command = new ListObjectsV2Command(params);
        const response = await s3.send(command);

        if (response.Contents) {
            // Use Promise.all to run getObject operations in parallel            
            await Promise.all(
                response.Contents.map(async (file) => {
                    const fileKey = file.Key;

                    if (fileKey) {
                        if (!fileKey.endsWith('/')) {
                            const getObjectParams = {
                                Bucket: process.env.S3_BUCKET ?? "",
                                Key: fileKey
                            };

                            const getObjectCommand = new GetObjectCommand(getObjectParams);
                            const data = await s3.send(getObjectCommand);

                            if (data.Body) {
                                const relativePath = fileKey.replace(key, '');
                                const filePath = path.join(localPath, relativePath);
                                const dirPath = path.dirname(filePath);

                                if (!fs.existsSync(dirPath)) {
                                    fs.mkdirSync(dirPath, { recursive: true });
                                }

                                const bodyStream = data.Body as Readable;
                                const writeStream = fs.createWriteStream(filePath);
                                bodyStream.pipe(writeStream);
                                logger.awsInfo(`Downloaded ${fileKey} to ${filePath.replace('\\', '/')}`);
                            }
                        } else {
                            const relativePath = fileKey.replace(key, '');
                            const dirPath = path.join(localPath, relativePath);

                            if (!fs.existsSync(dirPath)) {
                                fs.mkdirSync(dirPath, { recursive: true });
                                logger.awsInfo(`Dowloaded directory: ${dirPath}`);
                            }
                        }
                    }
                })
            );
        }
    } catch (error) {
        logger.awsError(`Error fetching folder.\n${error}`);
    }
};

export async function copyS3Folder(sourcePrefix: string, destinationPrefix: string, continuationToken?: string): Promise<void> {
    try {
        // List all objects in the source folder
        const listParams = {
            Bucket: process.env.S3_BUCKET ?? "",
            Prefix: sourcePrefix,
            ContinuationToken: continuationToken
        };

        const listCommand = new ListObjectsV2Command(listParams);
        const listedObjects = await s3.send(listCommand);

        if (!listedObjects.Contents || listedObjects.Contents.length === 0) return;

        // Copy each object to the new location
        await Promise.all(listedObjects.Contents.map(async (object) => {
            if (!object.Key) return;
            let destinationKey = object.Key.replace(sourcePrefix, destinationPrefix);
            let copyParams = {
                Bucket: process.env.S3_BUCKET ?? "",
                CopySource: `${process.env.S3_BUCKET}/${object.Key}`,
                Key: destinationKey,
                ACL: ObjectCannedACL.private
            };

            const copyCommand = new CopyObjectCommand(copyParams);
            await s3.send(copyCommand);
            logger.awsInfo(`Copied ${object.Key} to ${destinationKey}`);
        }));

        // Check if the list was truncated and continue copying if necessary
        if (listedObjects.IsTruncated) {
            await copyS3Folder(sourcePrefix, destinationPrefix, listedObjects.NextContinuationToken);
        }
    } catch (error) {
        logger.awsError(`Error copying folder.\n${error}`);
    }
}

export async function deleteS3File(sourceKey: string): Promise<void> {
    try {
        const deleteParams = {
            Bucket: process.env.S3_BUCKET ?? "",
            Key: `code/${replId}/${sourceKey}`
        };

        const deleteCommand = new DeleteObjectCommand(deleteParams);
        await s3.send(deleteCommand);
        logger.awsInfo(`Successfully deleted ${sourceKey} from S3.`);
    } catch (error) {
        logger.awsError(`Unable to delete S3 object ${sourceKey}.\n${error}`);
        throw error;
    }
}

export async function renameS3File(sourceKey: string, destinationKey: string): Promise<void> {
    try {
        const copyParams = {
            Bucket: process.env.S3_BUCKET ?? "",
            CopySource: `${process.env.S3_BUCKET}/code/${replId}/${sourceKey}`,
            Key: `code/${replId}/${destinationKey}`,
            ACL: ObjectCannedACL.private
        };

        const copyCommand = new CopyObjectCommand(copyParams);
        await s3.send(copyCommand);
        await deleteS3File(sourceKey);

        logger.awsInfo(`Successfully renamed ${sourceKey} to ${destinationKey}`);
    }
    catch (error) {
        logger.awsError(`Unable to rename object ${sourceKey}.\n${error}`);
        throw error;
    }
}

export async function renameS3Directory(oldPrefix: string, newPrefix: string): Promise<void> {
    try {
        const basePath: string = `code/${replId}`;

        await copyS3Folder(`${basePath}/${oldPrefix}`, `${basePath}/${newPrefix}`);
        await deleteS3Folder(oldPrefix);
        logger.awsInfo(`Renamed directory ${oldPrefix} to ${newPrefix}.`)
    }
    catch (error) {
        logger.awsInfo(`Unable to remove S3 directory ${oldPrefix}.\n${error}`);
        throw error;
    }
}

export async function deleteS3Folder(prefix: string | undefined, NextContinuationToken?: string | undefined): Promise<void> {
    try {
        const listParams = {
            Bucket: process.env.S3_BUCKET ?? "",
            Prefix: `code/${replId}/${prefix}`
        };

        const listCommand = new ListObjectsV2Command(listParams);
        const listedObjects = await s3.send(listCommand);

        if (!listedObjects.Contents || listedObjects.Contents.length === 0) return;

        await Promise.all(listedObjects.Contents.map(async (object) => {
            if (!object.Key) return;

            if (!object.Key.startsWith(listParams.Prefix + "/") && object.Key !== listParams.Prefix) {
                logger.awsTrace(`Skipping ${object.Key} - not an exact match for ${listParams.Prefix}.`);
                return;
            }

            const deleteParams = {
                Bucket: process.env.S3_BUCKET ?? "",
                Key: object.Key
            };

            const deleteCommand = new DeleteObjectCommand(deleteParams);
            await s3.send(deleteCommand);
            logger.awsInfo(`Deleted ${object.Key}`);
        }));

        if (listedObjects.IsTruncated) {
            await deleteS3Folder(prefix, listedObjects.NextContinuationToken);
        }
    } catch (error) {
        logger.awsError(`Unable to delete S3 folder ${prefix}.\n${error}`);
    }
}

function writeFile(filePath: string, fileData: Buffer): Promise<void> {
    return new Promise(async (resolve, reject) => {
        await createFolder(path.dirname(filePath));

        fs.writeFile(filePath, fileData, (err) => {
            if (err) {
                reject(err)
            } else {
                resolve()
            }
        })
    });
}

function createFolder(dirName: string) {
    return new Promise<void>((resolve, reject) => {
        fs.mkdir(dirName, { recursive: true }, (err) => {
            if (err) {
                return reject(err)
            }
            resolve()
        });
    })
}

// export const saveToS3 = async (key: string, filePath: string, content: string): Promise<void> => {
//     const params = {
//         Bucket: process.env.S3_BUCKET ?? "",
//         Key: `${key}${filePath}`,
//         Body: content,
//         ACL: ObjectCannedACL.private
//     }

//     const putObjectCommand = new PutObjectCommand(params);
//     await s3.send(putObjectCommand);
// }

export const saveToS3 = async (filePath: string, content: string | ReadableStream): Promise<void> => {
    const params = {
        Bucket: process.env.S3_BUCKET ?? "",
        Key: `code/sourceforopen${filePath}`,
        Body: content,
        ACL: ObjectCannedACL.private
    };


    const upload = new Upload({
        client: s3,
        params: params
    });

    try {
        await upload.done();
    }
    catch (error) {
        console.error(error);
    }
}
