import path from "path";
import fs from "fs/promises";

export interface RenameData {
    oldName: string;
    newName: string;
    type: string;
    parent: string | undefined;
}

export interface ValidationResult {
    isValid: boolean;
    message?: string;
}

const replId: string = 'sourceforopen'; //TO BE CHANGED
const projectName = 'Project';
const localRootPath: string = `../tmp/${replId}`
const codeExecEngineRoot: string = path.join(__dirname, localRootPath);

const entityExistsAtParentLevel = async (parentPath: string, newEntityName: string): Promise<boolean> => {
    const fullParentPath: string = path.join(codeExecEngineRoot, parentPath);
    const fullPath: string = path.join(fullParentPath, newEntityName);

    try {
        await fs.access(fullPath);
    }
    catch (error) {
        return false;
    }

    return true;
}

export const validateRenaming = async (data: RenameData): Promise<ValidationResult> => {
    const { oldName, newName, type, parent } = data;

    if (!parent) {
        return { isValid: false, message: "The root directory cannot be renamed!" };
    }

    if (!oldName || !newName) {
        return { isValid: false, message: "File names cannot be empty!" };
    }

    if (type !== "file" && type !== "directory") {
        return { isValid: false, message: "The type should be either file or directory!" };
    }

    const getExtension = (name: string) => name.split(".").pop() ?? "";
    const oldExtension = getExtension(oldName);
    const newExtension = getExtension(newName);

    if (type === "file") {
        if (!oldExtension || !newExtension || oldName === oldExtension || newName === newExtension) {
            return { isValid: false, message: "File renaming requires an extension at the end of the file name!" };
        }
    }

    if (type === "directory") {
        if (oldName.startsWith(".") || newName.startsWith(".")) {
        } else if (!oldName.includes(".") && !newName.includes(".")) {
        } else {
            const oldBaseName = oldName.split(".")[0];
            const newBaseName = newName.split(".")[0];
            if (!oldBaseName || !newBaseName) {
                return { isValid: false, message: "Invalid directory name!" };
            }
        }
    }

    if (await entityExistsAtParentLevel(parent, newName)) {
        return { isValid: false, message: `A ${type === "directory" ? 'directory' : 'file'} with the same name (${newName}) already exists!` };
    }

    return { isValid: true };
};