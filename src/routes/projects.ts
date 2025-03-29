import { Router, Express, Request, Response } from "express";
import { copyS3Folder, folderExists, getFolderDetails } from "../aws/aws";
import { validateProjectCreation, ValidationResult } from "../validation/validators";
import { getProjectType } from "../utils/projectTypeRetriever";
import { logger } from "../logging/logger";


const router = Router();

router.head('/', async (request: Request, response: Response) => {
    const key = request.query.q as string;

    console.log("KEY", key);

    try {
        if (await folderExists(`${key}`)) {
            console.log("FILE EXISTS");
            return response.status(200).end();
        }
        console.log("FILE DOES NOT EXIST");
        return response.status(404).end();
    } catch (error) {
        console.log("Entered catch block");
        logger.error(`An error occurred while ettempting to verify the existence of the project.\n${error}}`);
        return response.status(500).json({ message: `An error occurred while ettempting to verify the existence of the project.\n${error}` });
    }
});

router.get("/", async (request: Request, response: Response) => {
    const key = request.query.q as string;

    if (typeof key !== "string") {
        return response.status(400).json({ error: "Invalid key parameter" });
    }

    const projects = await getFolderDetails(key);

    return response.status(200).json(projects);
});

router.post('/', async (request: Request, response: Response) => {
    const { projectName, template, framework, description } = request.body;

    const validationResult: ValidationResult = validateProjectCreation({ projectName, template, framework: framework, description });

    if (!validationResult.isValid) {
        logger.error(`Project creation failed.\nReason: ${validationResult.message}`);
        return response.status(400).json({ message: validationResult.message });
    }

    const projectType: string | undefined = getProjectType(template, framework);

    if (!projectType || !(await folderExists(`base/${template}/${projectType}`))) {
        return response.status(404).json({ message: `The pair ${template} - ${framework ?? 'no framework'} could not be found!` });
    }

    try {
        //Make sure sourceforopen gets changed with a real uuid once hitting a database
        await copyS3Folder(`base/${template}/${projectType}`, `code/sourceforopen/${projectName}`);
    } catch (error) {
        logger.error(`Failed to copy project files.\nReason: ${error}`);
        return response.status(500).json({ message: 'An error has occurred while attempting to copy the project files. Please try again.' });
    }

    return response.status(201).json({ projectPath: `code/sourceforopen/${projectName}` });
});

export default router;