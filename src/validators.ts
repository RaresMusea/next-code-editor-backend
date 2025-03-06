export interface RenameData {
    oldName: string;
    newName: string;
    type: string;
} 

export interface ValidationResult {
    isValid: boolean;
    message?: string;
}

export const validateRenaming = (data: RenameData): ValidationResult => {
    const {oldName, newName, type} = data;

    if (!oldName || !newName) {
        return { isValid: false, message: "File names could not be empty!" };
    }

    if (type !== "file" && type !== "directory") {
        return { isValid: false, message: "The type should be either file or directory!" };
    }

    const oldNameHasExtension = oldName.includes(".");
    const newNameHasExtension = newName.includes(".");
    if (type === "file") {

        if (!oldNameHasExtension || !newNameHasExtension) {
            return { isValid: false, message: "File renaming requires an extension at the end of the file name!" };
        }

        const isValidExtension = (name: string) => {
            const extension = name.split(".").pop();
            return extension && extension.length > 0;
        };

        if (!isValidExtension(oldName) || !isValidExtension(newName)) {
            return { isValid: false, message: "Invalid file extension" };
        }
    }

    if (type === "directory") {

        if (oldNameHasExtension || newNameHasExtension) {
            return { isValid: false, message: "A directory cannot have an extension!" };
        }
    }

    return { isValid: true };
}