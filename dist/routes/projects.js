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
const express_1 = require("express");
const aws_1 = require("../aws/aws");
const validators_1 = require("../validation/validators");
const projectTypeRetriever_1 = require("../utils/projectTypeRetriever");
const logger_1 = require("../logging/logger");
const cuid_1 = __importDefault(require("cuid"));
const router = (0, express_1.Router)();
router.head('/', (request, response) => __awaiter(void 0, void 0, void 0, function* () {
    const key = request.query.q;
    const tokens = key.split('/');
    const userId = tokens[1];
    const projectId = tokens[2];
    try {
        if (yield (0, aws_1.projectNameExists)(`${tokens[0]}/${userId}/`, projectId)) {
            return response.status(200).end();
        }
        return response.status(404).end();
    }
    catch (error) {
        console.log("Entered catch block");
        logger_1.logger.error(`An error occurred while ettempting to verify the existence of the project.\n${error}}`);
        return response.status(500).json({ message: `An error occurred while ettempting to verify the existence of the project.\n${error}` });
    }
}));
router.get("/", (request, response) => __awaiter(void 0, void 0, void 0, function* () {
    const key = request.query.q;
    if (typeof key !== "string") {
        return response.status(400).json({ error: "Invalid key parameter" });
    }
    const projects = yield (0, aws_1.getFolderDetails)(key);
    return response.status(200).json(projects);
}));
router.post('/', (request, response) => __awaiter(void 0, void 0, void 0, function* () {
    const { projectName, template, framework, description } = request.body;
    const validationResult = (0, validators_1.validateProjectCreation)({ projectName, template, framework: framework, description });
    if (!validationResult.isValid) {
        logger_1.logger.error(`Project creation failed.\nReason: ${validationResult.message}`);
        return response.status(400).json({ message: validationResult.message });
    }
    const projectType = (0, projectTypeRetriever_1.getProjectType)(template, framework);
    if (!projectType || !(yield (0, aws_1.folderExists)(`base/${template}/${projectType}`))) {
        return response.status(404).json({ message: `The pair ${template} - ${framework !== null && framework !== void 0 ? framework : 'no framework'} could not be found!` });
    }
    const projectId = (0, cuid_1.default)();
    try {
        yield (0, aws_1.copyS3Folder)(`base/${template}/${projectType}`, `code/sourceforopen/${projectId}/${projectName}`);
    }
    catch (error) {
        logger_1.logger.error(`Failed to copy project files.\nReason: ${error}`);
        return response.status(500).json({ message: 'An error has occurred while attempting to copy the project files. Please try again.' });
    }
    return response.status(201).json({ projectPath: `code/sourceforopen/${projectId}/${projectName}` });
}));
exports.default = router;
