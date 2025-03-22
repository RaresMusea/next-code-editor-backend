import fs from "fs";
import path from "path";

interface File {
    type: "file" | "dir";
    name: string;
    path: string;
}

export const fetchDir = async (dir: string, baseDir: string): Promise<File[]>  => {
    return new Promise((resolve, reject) => {
        fs.readdir(dir, { withFileTypes: true }, (err, files) => {
            if (err) {
                reject(err);
            } else {
                resolve(files.map(file => ({ type: file.isDirectory() ? "dir" : "file", name: file.name, path: `${baseDir}/${file.name}`})));
            }
        });       
    });

    // try {
    //     const files = await fs.promises.readdir(dir, { withFileTypes: true });

    //     return files.map((file) => ({
    //         type: file.isDirectory() ? "dir" : "file",
    //         name: file.name,
    //         path: path.join(baseDir, file.name)
    //     }));
    // }
    // catch (error) {
    //     console.error(error);
    //     throw error;
    // }
}

export const fileExists = (absolutefilePath: string): boolean => {
    if (!absolutefilePath) {
        return false;
    }
    
    if (fs.existsSync(absolutefilePath)) {
        return true;
    }
    
    return false;
}

export const fetchFileContent = (file: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        fs.readFile(file, "utf8", (err, data) => {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        });
    })
}

export const deleteFile = async (filePath: string): Promise<string> => {
    if (!fs.existsSync(filePath)) {
        console.error(`The specified path does not exist - ${filePath}`);
        return "Circ";
    }

    return new Promise((resolve, reject) => {
        fs.unlink(filePath, err => {
            if (err) {
                reject(err);
            }
            else {
                resolve(filePath);
            }
        })
    })
}

export const saveFile = async (file: string, content: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        fs.writeFile(file, content, "utf8", (err) => {
            if (err) {
                return reject(err);
            }
            resolve();
        });
    });
}