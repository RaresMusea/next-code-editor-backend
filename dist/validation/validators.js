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
exports.validateProjectCreation = exports.validateDeletion = exports.validateRenaming = void 0;
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const replId = 'sourceforopen'; //TO BE CHANGED
const localRootPath = `../tmp/${replId}`;
const codeExecEngineRoot = path_1.default.join(__dirname, localRootPath);
const entityExistsAtParentLevel = (parentPath, newEntityName) => __awaiter(void 0, void 0, void 0, function* () {
    const fullParentPath = path_1.default.join(codeExecEngineRoot, parentPath);
    const fullPath = path_1.default.join(fullParentPath, newEntityName);
    try {
        yield promises_1.default.access(fullPath);
    }
    catch (error) {
        return false;
    }
    return true;
});
const validateRenaming = (data) => __awaiter(void 0, void 0, void 0, function* () {
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
    const getExtension = (name) => { var _a; return (_a = name.split(".").pop()) !== null && _a !== void 0 ? _a : ""; };
    const oldExtension = getExtension(oldName);
    const newExtension = getExtension(newName);
    if (type === "file") {
        if (!oldExtension || !newExtension || oldName === oldExtension || newName === newExtension) {
            return { isValid: false, message: "File renaming requires an extension at the end of the file name!" };
        }
    }
    if (type === "directory") {
        if (oldName.startsWith(".") || newName.startsWith(".")) {
        }
        else if (!oldName.includes(".") && !newName.includes(".")) {
        }
        else {
            const oldBaseName = oldName.split(".")[0];
            const newBaseName = newName.split(".")[0];
            if (!oldBaseName || !newBaseName) {
                return { isValid: false, message: "Invalid directory name!" };
            }
        }
    }
    if (yield entityExistsAtParentLevel(parent, newName)) {
        return { isValid: false, message: `A ${type === "directory" ? 'directory' : 'file'} with the same name (${newName}) already exists!` };
    }
    return { isValid: true };
});
exports.validateRenaming = validateRenaming;
const validateDeletion = (filePath, type) => {
    if (type === 'directory' && (filePath.split('/').length) === 2) {
        return {
            isValid: false,
            message: 'Root directory cannot be deleted. For that, please delete the entire project!'
        };
    }
    return { isValid: true };
};
exports.validateDeletion = validateDeletion;
const validateProjectCreation = (data) => {
    const { projectName, description, framework, template } = data;
    const availableTemplates = ['Java', 'C++', 'Empty project', 'Typescript'];
    const availableFrameworks = {
        Java: ["Spring", "No framework"],
        "C++": ["No frameworks"],
        "Empty project": [],
        Typescript: ["Next.js"]
    };
    const isValidProjectName = /^[a-zA-Z0-9_-]+$/.test(projectName);
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
};
exports.validateProjectCreation = validateProjectCreation;
