export const getProjectType = (template: string, framework?: string): string | undefined => {
    const projectTypes: Record<string, Record<string, string>> = {
        Java: {
            "Spring": "java-spring",
            "No framework": "java-basic"
        },
        "C++": {
            "No framework": "cpp-basic"
        },
        "Empty project": {
            "": "empty"
        }
    };

    return projectTypes[template]?.[framework || ""] || undefined;
};