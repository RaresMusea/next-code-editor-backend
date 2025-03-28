import { Router, Express, Request, Response } from "express";
import { copyS3Folder, folderExists, getFolderDetails } from "../aws/aws";
import { validateProjectCreation, ValidationResult } from "../validation/validators";
import { getProjectType } from "../utils/projectTypeRetriever";
import { logger } from "../logging/logger";


const router = Router();

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

    if (!projectType) {
        return response.status(404).json({ message: `The pair ${template} - ${framework ?? undefined } could not be found!` });
    }

    if (! await folderExists(projectType)) {
        console.error("Folderu nu exista gion");
        return response.status(404).json({ message: `The pair ${template} - ${framework ?? undefined } could not be found!` });
    }

    //Make sure sourceforopen gets changed with a real uuid
    await copyS3Folder(`base/${template}/${projectType}`, `code/sourceforopen/${projectName}`)
    
});

export default router;