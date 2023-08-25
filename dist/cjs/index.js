'use strict';
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateErrorLogger = void 0;
class TemplateErrorLogger {
    constructor() {
        this.errors = [];
        this.latestError = null;
        this.identifier = this.uniqueId();
        this.onLogCallback = null;
    }
    onLog(callback) {
        this.onLogCallback = callback;
    }
    log(error) {
        const newErrorId = this.uniqueId(), newError = JSON.parse(JSON.stringify(error));
        newError.id = newErrorId;
        newError.error = error.error.toString();
        this.errors.push(newError);
        this.latestError = newError;
        if (this.onLogCallback) {
            this.onLogCallback(newError);
        }
    }
    get() {
        return this.errors;
    }
    getLatest() {
        return this.latestError;
    }
    getIdentifier() {
        return this.identifier;
    }
    clear() {
        this.errors = [];
        this.latestError = null;
    }
    uniqueId() {
        return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    }
}
exports.TemplateErrorLogger = TemplateErrorLogger;
class Template {
    constructor(template, options = {}, errorLogger = null) {
        this.latestError = null;
        this.compiled = false;
        this.hasGeneratedCode = false;
        this.options = options;
        this.imports = options.imports || {};
        this.require = options.require || {};
        this.templateName = options.templateName || '(anonymous template)';
        this.isChildrenExecution = options.isChildrenExecution || false;
        this.errorLogger = errorLogger;
        this.indentStep = 0;
        this.indentSteps = {};
        this.indentBackSpaces = 0;
        this.onIndentBackMode = false;
        this.isInsideIndentContainer = false;
        this.data = {};
        this.setTemplate(template);
        if (this.options.logger) {
            this.logger = this.options.logger;
        }
        this.initSettings();
        this.resetTemplate();
    }
    setData(data) {
        this.data = data;
        return this;
    }
    getData() {
        return this.data;
    }
    getTemplate() {
        return this.template;
    }
    setTemplate(template) {
        let completeTemplate = template;
        if (!this.options.disableImportsProcessing) {
            completeTemplate = this.addImportsToTemplate(template);
        }
        this.template = completeTemplate;
        this.intermediateTemplate = completeTemplate;
    }
    addImportsToTemplate(template) {
        template = this.addImportsIndexes(template);
        let importsRegex = /(?<=(<import(\s*)template\[\d+\]="))(.*?)(?=")/g, codeImports = template.match(importsRegex);
        if (!codeImports)
            return template;
        codeImports.forEach((codeImport, codeImportIndex) => {
            let importReplacementRegex = new RegExp(`(<import(\\s*)template\\[${codeImportIndex}\\]=")(${codeImport})(.*>)`, 'g');
            let codeImportContent = this.imports[codeImport];
            if (!codeImportContent)
                throw new Error(`Please provide the import ${codeImport} content on the options.imports settings`);
            codeImportContent = this.addImportsToTemplate(codeImportContent);
            codeImportContent = this.addParamsToImportContent(template, codeImportContent, codeImportIndex, codeImport, importReplacementRegex);
            codeImportContent = this.addCorrectIndentationToImportContent(template, codeImportContent, codeImportIndex);
            template = template.replace(importReplacementRegex, codeImportContent);
        });
        return template;
    }
    addParamsToImportContent(template, codeImportContent, codeImportIndex, codeImport, importReplacementRegex) {
        let paramsRegex = new RegExp(`(?<=(<import(\\s*)template\\[${codeImportIndex}\\]="${codeImport}"))(.*)(?=(>))`, 'g'), importTagContent = template.match(importReplacementRegex)[0], paramsContent = importTagContent.match(paramsRegex), params = [];
        if (paramsContent) {
            let singleParamRegex = /(\w+)="(.+?)"/g, paramsKeyValue = paramsContent[0].match(singleParamRegex) || [];
            paramsKeyValue.forEach(param => {
                let paramKeyValue = param.split('=');
                if (paramKeyValue.length > 1) {
                    let paramKey = paramKeyValue[0], paramValue = paramKeyValue[1].replace(/"/g, '');
                    params.push({ key: paramKey, value: paramValue });
                }
            });
        }
        let templateParamsContentLines = [];
        templateParamsContentLines.push('<% this.templateParams = {} %>');
        params.forEach(param => {
            templateParamsContentLines.push(`<% this.templateParams.${param.key} = ${param.value} %>`);
        });
        return templateParamsContentLines.join('\n') + '\n' + codeImportContent;
    }
    getImportedTemplates() {
        let template = this.addImportsIndexes(this.template);
        let importsRegex = /(?<=(<import(\s*)template\[\d+\]="))(.*?)(?=")/g, codeImports = template.match(importsRegex);
        if (!codeImports)
            return [];
        return codeImports;
    }
    addImportsIndexes(template) {
        let importsRegex = /(<import(\s*)template=")(.*)("(\s*)>)/g, codeImports = template.match(importsRegex);
        if (!codeImports)
            return template;
        codeImports.forEach((codeImport, index) => {
            let codeImportWithIndex = codeImport.replace('template=', `template[${index}]=`);
            template = template.replace(codeImport, codeImportWithIndex);
        });
        return template;
    }
    addCorrectIndentationToImportContent(template, codeImportContent, codeImportIndex) {
        let codeImportTemplateIndex = template.indexOf(`<import template[${codeImportIndex}]`), codeImportLine = this.getLineNumberForIndex(template, codeImportTemplateIndex), templateLines = template.split('\n'), templateLine = templateLines[codeImportLine - 1], quantityOfSpaces = templateLine.search(/\S|$/);
        let codeImportLines = codeImportContent.split('\n');
        codeImportLines = codeImportLines.map((line, index) => {
            if (index > 0) {
                line = `${' '.repeat(quantityOfSpaces)}${line}`;
            }
            return line;
        });
        return codeImportLines.join('\n');
    }
    initSettings() {
        this.settings = {
            blocksMatch: '',
            blocks: {
                logic: {
                    // Used to get the correct position on a composed regex (rgx|rgx|rgx)
                    index: 1,
                    match: '<%(.+?)%>',
                    type: 'LOGIC'
                },
                variable: {
                    // Used to get the correct position on a composed regex (rgx|rgx|rgx)
                    index: 2,
                    match: '<\\$(.+?)\\$>',
                    type: 'VARIABLE'
                },
                logicLineUp: {
                    // Used to get the correct position on a composed regex (rgx|rgx|rgx)
                    index: 3,
                    match: '<up(.+?)up>',
                    type: 'LOGIC'
                },
            }
        };
        this.setAllBlocksMatching();
    }
    /**
     * Set all the blocks regular expressions to future search on the template
     */
    setAllBlocksMatching() {
        let matches = [];
        for (const [index, block] of Object.entries(this.settings.blocks)) {
            matches.push(block.match);
        }
        this.settings.blocksMatch = matches.join('|');
    }
    resetTemplate() {
        this.textBlocks = [];
        this.latestError = null;
        this.compiled = false;
        this.hasGeneratedCode = false;
        this.generatedCode = '"use strict";\nlet codeBlocks = [];\nthis.templateParams = {};\n';
        this.actualLineIsLogic = false;
        this.previousLineIsLogic = false;
        this.addHelperFunctions();
    }
    compileWithErrorTreatment() {
        try {
            return this.compile();
        }
        catch (error) {
            this.setLatestError(error);
            throw error;
        }
    }
    compileAsyncWithErrorTreatment() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield this.compileAsync();
            }
            catch (error) {
                yield this.setLatestError(error);
                throw error;
            }
        });
    }
    compile() {
        this.generateCode();
        this.compiled = true;
        this.addDataHelpers();
        return new Function(this.generatedCode).apply(this.data);
    }
    compileAsync() {
        return __awaiter(this, void 0, void 0, function* () {
            this.generateCode();
            this.compiled = true;
            this.addDataHelpers();
            const AsyncFunction = function () {
                return __awaiter(this, void 0, void 0, function* () { });
            }.constructor;
            const generatedFunction = new AsyncFunction(this.generatedCode);
            return generatedFunction.apply(this.data);
        });
    }
    addDataHelpers() {
        this.data.require = (module) => this.require[module];
    }
    getPreCompiledCode() {
        if (!this.hasGeneratedCode) {
            this.generateCode();
        }
        return this.getGeneratedCodeFunctionAsString();
    }
    getGeneratedCodeFunctionAsString() {
        return new Function(this.generatedCode).toString();
    }
    setLatestError(error) {
        let codeLine = this.getErrorLine(error), templateLine = this.getTemplateLineFromCodeLine(codeLine);
        this.latestError = {
            error: error,
            templateName: this.templateName,
            codeLine: parseInt(codeLine, 10),
            templateLine: parseInt(templateLine, 10),
            isChildrenExecution: this.isChildrenExecution
        };
        if (this.errorLogger) {
            this.errorLogger.log(this.latestError);
        }
    }
    getLatestError() {
        return this.latestError;
    }
    getErrorLine(error) {
        let codeLinesRegex = /(?<=(<anonymous>)(:{1}))([0-9]+)(:{1})([0-9]+)/g, matches = error.stack.match(codeLinesRegex);
        return matches ? matches[0].split(':')[0] : 0;
    }
    getTemplateLineFromCodeLine(codeLine) {
        try {
            if (!codeLine)
                return 0;
            let generatedCode = this.getGeneratedCodeFunctionAsString();
            let codeLines = generatedCode.split('\n'), code = codeLines[codeLine - 1];
            let templateLine = code.replace(/(.*)(TEMPLATE_LINE:)/, '');
            return templateLine || 0;
        }
        catch (error) {
            return 0;
        }
    }
    generateCode() {
        this.resetTemplate();
        this.treatTemplateCodeBeforeStart();
        this.separateTextFromCodeBlocks();
        this.textBlocks.forEach(block => {
            this.addLine(block);
        });
        this.finishGeneratedCode();
        this.hasGeneratedCode = true;
    }
    addHelperFunctions() {
        // Can be used inside a template to conditionally remove the last breakline
        const removeLastLineBreak = function () {
            let lastCodeBlockIndex = codeBlocks.length - 1;
            if (!lastCodeBlockIndex || lastCodeBlockIndex < 0)
                return;
            codeBlocks[lastCodeBlockIndex - 1] = codeBlocks[lastCodeBlockIndex - 1].replace(/(\r\n|\n|\r|\u2028|\u2029){1}(\t| )*$/, '');
        };
        this.generatedCode += 'this.removeLastLineBreak = ' + removeLastLineBreak.toString() + ';\n';
    }
    treatTemplateCodeBeforeStart() {
        //TODO: maybe invert to remove the comment from the end, not from the start of the line
        // Remove comments
        this.intermediateTemplate = this.intermediateTemplate.replace(/(\r\n|\n|\r|\u2028|\u2029)?(\t| )*(<#)(.*)(#>)/g, '');
        // Remove line-breaks from logic blocks
        this.intermediateTemplate = this.intermediateTemplate.replace(/(\r\n|\n|\r|\u2028|\u2029){1}(\t| )*(<%)/g, '<%');
        this.intermediateTemplate = this.intermediateTemplate.replace(/(\r\n|\n|\r||\u2028|\u2029){1}(\t| )*(<up)/g, '<up');
        // Remove spaces and line-breaks after lineup logic block
        this.intermediateTemplate = this.intermediateTemplate.replace(/(up>)(\r\n|\n|\r|\u2028|\u2029){1}(\t| )*/g, 'up>');
    }
    separateTextFromCodeBlocks() {
        let matchBlocks = new RegExp(this.settings.blocksMatch, "g"), cursor = 0, match, matchesOcurrences = {};
        // While we find matches of the special code blocks (<$ $>, <up up>, etc)
        // When it match something, it returns the matches for all block types, as
        // it uses a composed regex (regex|regex|regex), so the result would be
        // something like: 
        //
        // - ['<$ foo $>', undefined, ' foo ', undefined] or
        //
        // - ['<up foo up>', undefined, undefined, ' foo ']
        //
        //  
        while (match = matchBlocks.exec(this.intermediateTemplate)) {
            // Add a whole text block from the latest cursor position
            // to the start of the special block position
            let contentBeforeNextBlock = this.intermediateTemplate.slice(cursor, match.index);
            this.addTextBlock(contentBeforeNextBlock);
            // Saves the quantity of ocurrences of the same block appeared in the template
            matchesOcurrences[match[0]] = !matchesOcurrences[match[0]] ? 1 : matchesOcurrences[match[0]] + 1;
            let matchPositionOnOriginalTemplate = this.getStringOcurrenceIndexByOrder(this.template, match[0], matchesOcurrences[match[0]]);
            let templateLineNumber = this.getLineNumberForIndex(this.template, matchPositionOnOriginalTemplate);
            // Add the correct javascript blocks considering the
            // regex matches
            this.addJavaScriptBlock(match, templateLineNumber);
            // Put the cursor in the end of all javascript blocks
            // It uses the position 0, as it is the primary result
            // of the regex, Ex: ['<$ foo $>', undefined, ' foo ', undefined]
            cursor = match.index + match[0].length;
        }
        let finalContent = this.intermediateTemplate.substr(cursor, this.intermediateTemplate.length - cursor);
        this.addTextBlock(finalContent);
    }
    addJavaScriptBlock(templateMatch, lineNumber) {
        for (const [index, block] of Object.entries(this.settings.blocks)) {
            // It needs to use the block index because the regex is composed (regex|regex|regex),
            // so it can return null values in some options, but valid options on other. For
            // example: [null, ' something ', null]
            if (templateMatch[block.index]) {
                return this.addTextBlock(templateMatch[block.index], true, block.type, lineNumber, templateMatch[0]);
            }
        }
    }
    addTextBlock(content, isJavascript = false, type = 'TEXT', lineNumber = 0, originalContent) {
        originalContent = originalContent || content;
        if (!isJavascript) {
            this.checkCodeModes(content);
        }
        if (isJavascript && this.onIndentBackMode) {
            let templateLine = this.getTemplateLine(lineNumber), spacesQuantity = parseInt(templateLine.search(/\S|$/), 10);
            if (/((<%|<up)(\s*)(}|break;)(\s*)(%>|up>))/.test(originalContent)) {
                this.removeIndentationSpaces(spacesQuantity);
            }
            else if (/(<%|<up)(\s*)(if|for|while|else|switch|case)(.*)(%>|up>)/.test(originalContent)) {
                this.registerIndentationSpaces(spacesQuantity);
            }
        }
        // Remove spaces from logic blocks indentation
        if (content.length && this.onIndentBackMode && this.isInsideIndentContainer && !isJavascript) {
            let contentLines = content.split('\n');
            // It needs to break a text block into lines because each
            // block may have multiple lines and it needs to remove the
            // spaces from each line start
            contentLines = contentLines.map(line => {
                let lineSpacesQuantity = parseInt(line.replace('\n', '').search(/\S|$/), 10), currentStep = this.indentSteps[this.indentStep] || {}, extraSpaces = lineSpacesQuantity - (currentStep.spaces || 0), diffOfSpaces = lineSpacesQuantity - this.indentBackSpaces - extraSpaces;
                diffOfSpaces = diffOfSpaces >= 0 ? diffOfSpaces : 0;
                let initialSpacesRegex = new RegExp(`(?<!\\w|[ ])([ ]{${diffOfSpaces}})`, 'g');
                return line.replace(initialSpacesRegex, '');
            });
            content = contentLines.join('\n');
        }
        content = this.replaceModeTagsOnContent(content);
        if (type == 'TEXT') {
            content = this.convertTextSpecialCharacters(content);
        }
        let textBlock = {
            content,
            isJavascript,
            type,
            lineNumber,
            originalContent,
        };
        this.textBlocks.push(textBlock);
        return textBlock;
    }
    registerIndentationSpaces(quantity) {
        quantity = quantity || 0;
        if (!this.indentStep) {
            this.indentBackSpaces = quantity;
            this.isInsideIndentContainer = true;
        }
        this.indentStep++;
        this.indentSteps[this.indentStep] = {
            spaces: quantity
        };
    }
    removeIndentationSpaces() {
        this.indentStep--;
        if (this.indentStep <= 0) {
            this.indentStep = 0;
            this.indentBackSpaces = 0;
            this.isInsideIndentContainer = false;
        }
    }
    replaceModeTagsOnContent(content) {
        content = content.replace(/(\r\n|\n|\r|\u2028|\u2029)?(\t| )*<\*(.*)\*>/g, '');
        return content;
    }
    checkCodeModes(content) {
        if (content.includes('<* end:indent-back *>')) {
            this.onIndentBackMode = false;
        }
        if (content.includes('<* indent-back *>')) {
            this.onIndentBackMode = true;
        }
    }
    addLine(block) {
        if (block.isJavascript) {
            this.generatedCode += (block.type === 'LOGIC')
                ? block.content + ` // TEMPLATE_LINE:${block.lineNumber}\n`
                : `codeBlocks.push(` + block.content + `); // TEMPLATE_LINE:${block.lineNumber}\n`;
        }
        else {
            this.generatedCode += 'codeBlocks.push("' + this.convertLineCharacters(block.content) + '");\n';
        }
    }
    convertTextSpecialCharacters(content) {
        content = content.replace(/\\/g, '\\\\');
        return content;
    }
    convertLineCharacters(line) {
        line = line.replace(/"/g, '\\"')
            .replace(/\n/g, '\\n')
            .replace(/\t/g, '\\t')
            .replace(/\r/g, '\\r');
        return line;
    }
    getLineNumberForIndex(template, index) {
        let perLine = template.split('\n'), totalLength = 0, position = index + 1, i = 0;
        for (i = 0; i < perLine.length; i++) {
            // Needs to concatenate with the removed \n charactere
            totalLength += (perLine[i] + '\n').length;
            if (totalLength >= position)
                return i + 1;
        }
        return 0;
    }
    getTemplateLine(line) {
        let lines = this.template.split('\n'), lineIndex = line - 1;
        return lines[lineIndex];
    }
    getStringOcurrenceIndexByOrder(string, subString, order) {
        var stringLength = string.length, i = -1;
        while (order-- && i++ < stringLength) {
            i = string.indexOf(subString, i);
            if (i < 0)
                break;
        }
        return i;
    }
    finishGeneratedCode() {
        this.generatedCode += 'return codeBlocks.join("");';
        this.generatedCode.replace(/[\r\t\n]/g, '');
    }
    codeIsValid(showErrors = true) {
        try {
            this.addDataHelpers();
            new Function(this.generatedCode).apply(this.data);
        }
        catch (error) {
            if (showErrors) {
                console.error('TEMPLATE SYNTAX - ERROR DETECTED'.red);
                console.error(error);
                console.error(Array(76).join('-')); //-----...
            }
            return false;
        }
        return true;
    }
}
exports.default = Template;
