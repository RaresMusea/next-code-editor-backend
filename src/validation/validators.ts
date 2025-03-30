import path from "path";
import fs from "fs/promises";

export interface RenameData {
    oldName: string;
    newName: string;
    type: string;
    parent: string | undefined;
}

export interface ProjectCreationData {
    projectName: string;
    description?: string;
    template: string;
    framework?: string;
}

export interface ValidationResult {
    isValid: boolean;
    message?: string;
}

const replId: string = 'sourceforopen'; //TO BE CHANGED
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

export const validateDeletion = (filePath: string, type: string): ValidationResult => {

    if (type === 'directory' && (filePath.split('/').length) === 2) {
        return {
            isValid: false,
            message: 'Root directory cannot be deleted. For that, please delete the entire project!'
        };
    }

    return { isValid: true }
}

export const validateProjectCreation = (data: ProjectCreationData): ValidationResult => {
    const { projectName, description, framework, template } = data;
    const availableTemplates: string[] = ['Java', 'C++', 'Empty project', 'Typescript'];
    const availableFrameworks: Record<string, string[]> = {
        Java: ["Spring", "No framework"],
        "C++": ["No frameworks"],
        "Empty project": [],
        Typescript: ["Next.js"]
    };

    const isValidProjectName: boolean = /^[a-zA-Z0-9_-]+$/.test(projectName);

    if (!projectName || !isValidProjectName) {
        return { isValid: false, message: 'Invalid project name! Use only letters, numbers, "-", and "_".' };
    }

    if (description && description.length > 3000) {
        return { isValid: false, message: "Description must not exceed 3000 characters." };
    }

    if (!template || !availableTemplates.includes(template)) {
        return { isValid: false, message: "Invalid template. Choose from: " + availableTemplates.join(", ") };
    }

    if (framework && (!availableFrameworks[template] || !availableFrameworks[template].includes(framework))) {
        return {
            isValid: false,
            message: `Invalid framework '${framework}' for template '${template}'. Choose from: ${availableFrameworks[template].join(", ") || "No framework"}`
        };
    }

    return { isValid: true };
}