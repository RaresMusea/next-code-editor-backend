"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProjectType = void 0;
const getProjectType = (template, framework) => {
    var _a;
    const projectTypes = {
        Java: {
            "Spring": "java-spring",
            "No framework": "java-basic"
        },
        "C++": {
            "No framework": "cpp-basic"
        },
        "Empty project": {
            "": "empty"
        },
        "Typescript": { 'Next.js': 'nextjs-basic' }
    };
    return ((_a = projectTypes[template]) === null || _a === void 0 ? void 0 : _a[framework || ""]) || undefined;
};
exports.getProjectType = getProjectType;
