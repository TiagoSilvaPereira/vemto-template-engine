export class TemplateErrorLogger {
    errors: any[];
    latestError: any;
    identifier: string;
    onLogCallback: any;
    onLog(callback: any): void;
    log(error: any): void;
    get(): any[];
    getLatest(): any;
    getIdentifier(): string;
    clear(): void;
    uniqueId(): string;
}
export default class Template {
    constructor(template: any, options?: {}, errorLogger?: any);
    latestError: {
        error: any;
        templateName: any;
        codeLine: number;
        templateLine: number;
        isChildrenExecution: any;
    };
    compiled: boolean;
    hasGeneratedCode: boolean;
    options: {};
    imports: any;
    require: any;
    templateName: any;
    isChildrenExecution: any;
    errorLogger: any;
    indentStep: number;
    indentSteps: {};
    indentBackSpaces: number;
    onIndentBackMode: boolean;
    isInsideIndentContainer: boolean;
    data: {};
    logger: any;
    setData(data: any): Template;
    getData(): {};
    getTemplate(): any;
    setTemplate(template: any): void;
    template: any;
    intermediateTemplate: any;
    addImportsToTemplate(template: any): any;
    addParamsToImportContent(template: any, codeImportContent: any, codeImportIndex: any, codeImport: any, importReplacementRegex: any): string;
    getImportedTemplates(): any;
    addImportsIndexes(template: any): any;
    addCorrectIndentationToImportContent(template: any, codeImportContent: any, codeImportIndex: any): any;
    initSettings(): void;
    settings: {
        blocksMatch: string;
        blocks: {
            logic: {
                index: number;
                match: string;
                type: string;
            };
            variable: {
                index: number;
                match: string;
                type: string;
            };
            logicLineUp: {
                index: number;
                match: string;
                type: string;
            };
        };
    };
    /**
     * Set all the blocks regular expressions to future search on the template
     */
    setAllBlocksMatching(): void;
    resetTemplate(): void;
    textBlocks: any[];
    generatedCode: string;
    actualLineIsLogic: boolean;
    previousLineIsLogic: boolean;
    compileWithErrorTreatment(): any;
    compileAsyncWithErrorTreatment(): Promise<any>;
    compile(): any;
    compileAsync(): Promise<any>;
    addDataHelpers(): void;
    getPreCompiledCode(): string;
    getGeneratedCodeFunctionAsString(): string;
    setLatestError(error: any): void;
    getLatestError(): {
        error: any;
        templateName: any;
        codeLine: number;
        templateLine: number;
        isChildrenExecution: any;
    };
    getErrorLine(error: any): any;
    getTemplateLineFromCodeLine(codeLine: any): string | 0;
    generateCode(): void;
    addHelperFunctions(): void;
    treatTemplateCodeBeforeStart(): void;
    separateTextFromCodeBlocks(): void;
    addJavaScriptBlock(templateMatch: any, lineNumber: any): {
        content: any;
        isJavascript: boolean;
        type: string;
        lineNumber: number;
        originalContent: any;
    };
    addTextBlock(content: any, isJavascript: boolean, type: string, lineNumber: number, originalContent: any): {
        content: any;
        isJavascript: boolean;
        type: string;
        lineNumber: number;
        originalContent: any;
    };
    registerIndentationSpaces(quantity: any): void;
    removeIndentationSpaces(): void;
    replaceModeTagsOnContent(content: any): any;
    checkCodeModes(content: any): void;
    addLine(block: any): void;
    convertTextSpecialCharacters(content: any): any;
    convertLineCharacters(line: any): any;
    getLineNumberForIndex(template: any, index: any): number;
    getTemplateLine(line: any): any;
    getStringOcurrenceIndexByOrder(string: any, subString: any, order: any): number;
    finishGeneratedCode(): void;
    codeIsValid(showErrors?: boolean): boolean;
    setupListeners(): void;
}
