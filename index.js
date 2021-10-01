'use strict';

const
    check = require('syntax-error');

class Template {

    constructor(template, options = {}) {
        this.latestError = null;

        this.compiled = false;
        this.hasGeneratedCode = false;

        this.options = options;
        this.imports = options.imports || {}

        this.indentStep = 0
        this.indentSteps = {}
        this.indentBackSpaces = 0
        this.onIndentBackMode = false
        this.isInsideIndentContainer = false

        this.setTemplate(template)

        if(this.options.logger) {
            this.logger = this.options.logger
        }

        this.initSettings();
        this.resetTemplate();
    }

    getTemplate() {
        return this.template
    }

    setTemplate(template) {
        let completeTemplate = this.addImportsToTemplate(template);

        this.template = completeTemplate;
        this.intermediateTemplate = completeTemplate;
    }

    addImportsToTemplate(template) {
        template = this.addImportsIndexes(template)

        let importsRegex = /(?<=(<import(\s*)template\[\d+\]="))(.*)(?=("(\s*)>))/g,
            codeImports = template.match(importsRegex)

        if(!codeImports) return template

        codeImports.forEach((codeImport, codeImportIndex) => {
            let importReplacementRegex = new RegExp(`(<import(\\s*)template\\[${codeImportIndex}\\]=")(${codeImport})("(\\s*)>)`, 'g')

            let codeImportContent = this.imports[codeImport]
            if(!codeImportContent) throw new Error(`Please provide the import ${codeImport} content on the options.imports settings`)

            codeImportContent = this.addImportsToTemplate(codeImportContent)

            codeImportContent = this.addCorrectIndentationToImportContent(template, codeImportContent, codeImportIndex)

            template = template.replace(importReplacementRegex, codeImportContent)
        })

        return template
    }

    addImportsIndexes(template) {
        let importsRegex = /(<import(\s*)template=")(.*)("(\s*)>)/g,
            codeImports = template.match(importsRegex)

        if(!codeImports) return template
        
        codeImports.forEach((codeImport, index) => {
            let codeImportWithIndex = codeImport.replace('template=', `template[${index}]=`)

            template = template.replace(codeImport, codeImportWithIndex)
        })

        return template
    }

    addCorrectIndentationToImportContent(template, codeImportContent, codeImportIndex) {
        let codeImportTemplateIndex = template.indexOf(`<import template[${codeImportIndex}]`),
            codeImportLine = this.getLineNumberForIndex(template, codeImportTemplateIndex),
            templateLines = template.split('\n'),
            templateLine = templateLines[codeImportLine - 1],
            quantityOfSpaces = templateLine.search(/\S|$/)

        let codeImportLines = codeImportContent.split('\n')

        codeImportLines = codeImportLines.map((line, index) => {
            if(index > 0) {
                line = `${' '.repeat(quantityOfSpaces)}${line}`
            }

            return line
        })

        return codeImportLines.join('\n')
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
        this.generatedCode = '"use strict";\nvar codeBlocks = [];\n';
        this.actualLineIsLogic = false;
        this.previousLineIsLogic = false;
        this.addHelperFunctions();
    }

    compileWithErrorTreatment(data) {
        try {
            return this.compile(data);
        } catch (error) {
            this.setLatestError(error);

            throw error;
        }
    }

    compile(data) {
        this.generateCode();

        this.compiled = true;

        return new Function(this.generatedCode).apply(data);
    }

    getPreCompiledCode() {
        if(!this.hasGeneratedCode) {
            this.generateCode();
        }

        return this.getGeneratedCodeFunctionAsString()
    }

    getGeneratedCodeFunctionAsString() {
        return new Function(this.generatedCode).toString()
    }

    setLatestError(error) {
        let codeLine = this.getErrorLine(error),
            templateLine = this.getTemplateLineFromCodeLine(codeLine)

        this.latestError = {
            error,
            codeLine: parseInt(codeLine, 10),
            templateLine: parseInt(templateLine, 10)
        }
    }

    getLatestError() {
        return this.latestError
    }

    getErrorLine(error) {
        let codeLinesRegex = /(?<=(<anonymous>)(:{1}))([0-9]+)(:{1})([0-9]+)/g,
            matches = error.stack.match(codeLinesRegex)
    
        return matches ? matches[0].split(':')[0] : 0
    }

    getTemplateLineFromCodeLine(codeLine) {
        if(!codeLine) return 0

        let generatedCode = this.options.onBrowser 
            ? this.getGeneratedCodeFunctionAsString() 
            : this.generatedCode
            
        let codeLines = generatedCode.split('\n'),
            code = codeLines[codeLine - 1]

        let templateLine = code.replace(/(codeBlocks)(.*)(TEMPLATE_LINE:)/, '')

        return templateLine || 0
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
        let removeLastLineBreak = function() {
            let lastCodeBlockIndex = codeBlocks.length - 1;

            if(!lastCodeBlockIndex || lastCodeBlockIndex < 0) return

            codeBlocks[lastCodeBlockIndex - 1] = codeBlocks[lastCodeBlockIndex - 1].replace(/(\r\n|\n|\r|\u2028|\u2029){1}(\t| )*$/, '')
        }
        
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
        let matchBlocks = new RegExp(this.settings.blocksMatch, "g"),
            cursor = 0,
            match,
            matchesOcurrences = {};

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
        while(match = matchBlocks.exec(this.intermediateTemplate)) {
            // Add a whole text block from the latest cursor position
            // to the start of the special block position
            let contentBeforeNextBlock = this.intermediateTemplate.slice(cursor, match.index);
            this.addTextBlock(contentBeforeNextBlock);

            // Saves the quantity of ocurrences of the same block appeared in the template
            matchesOcurrences[match[0]] = !matchesOcurrences[match[0]] ? 1 : matchesOcurrences[match[0]] + 1; 

            let matchPositionOnOriginalTemplate = this.getStringOcurrenceIndexByOrder(
                this.template, 
                match[0], 
                matchesOcurrences[match[0]]
            )

            let templateLineNumber = this.getLineNumberForIndex(this.template, matchPositionOnOriginalTemplate)

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
            if(templateMatch[block.index]) {
                return this.addTextBlock(
                    templateMatch[block.index], 
                    true, 
                    block.type, 
                    lineNumber, 
                    templateMatch[0]
                );
            }

        }
    }

    addTextBlock(content, isJavascript = false, type = 'TEXT', lineNumber = 0, originalContent) {

        originalContent = originalContent || content
        
        if(!isJavascript) {
            this.checkCodeModes(content)
        }

        if(isJavascript && this.onIndentBackMode) {
            let templateLine = this.getTemplateLine(lineNumber),
                spacesQuantity = parseInt(templateLine.search(/\S|$/), 10)

            if(/((<%|<up)(\s*)(}|break;)(\s*)(%>|up>))/.test(originalContent)) {
                this.removeIndentationSpaces(spacesQuantity)
            } else if(/(<%|<up)(\s*)(if|for|while|else|switch|case)(.*)(%>|up>)/.test(originalContent)) {
                this.registerIndentationSpaces(spacesQuantity)
            }
        }

        // Remove spaces from logic blocks indentation
        if(content.length && this.onIndentBackMode && this.isInsideIndentContainer && !isJavascript) {
            let contentLines = content.split('\n')

            // It needs to break a text block into lines because each
            // block may have multiple lines and it needs to remove the
            // spaces from each line start
            contentLines = contentLines.map(line => {
                let lineSpacesQuantity = parseInt(line.replace('\n', '').search(/\S|$/), 10),
                    currentStep = this.indentSteps[this.indentStep] || {},
                    extraSpaces = lineSpacesQuantity - (currentStep.spaces || 0),
                    diffOfSpaces = lineSpacesQuantity - this.indentBackSpaces - extraSpaces
    
                diffOfSpaces = diffOfSpaces >= 0 ? diffOfSpaces : 0
    
                let initialSpacesRegex = new RegExp(`(?<!\\w|[ ])([ ]{${diffOfSpaces}})`, 'g')
                
                return line.replace(initialSpacesRegex, '')
            })

            content = contentLines.join('\n')
        }

        content = this.replaceModeTagsOnContent(content)

        if(type == 'TEXT') {
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
        quantity = quantity || 0

        if(!this.indentStep) {
            this.indentBackSpaces = quantity
            this.isInsideIndentContainer = true
        }

        this.indentStep++
        this.indentSteps[this.indentStep] = {
            spaces: quantity
        }

    }

    removeIndentationSpaces() {
        this.indentStep--

        if(this.indentStep <= 0) {
            this.indentStep = 0
            this.indentBackSpaces = 0
            this.isInsideIndentContainer = false
        }
    }

    replaceModeTagsOnContent(content) {
        content = content.replace(/(\r\n|\n|\r|\u2028|\u2029)?(\t| )*<\*(.*)\*>/, '')

        return content
    }

    checkCodeModes(content) {
        if(content.includes('<* indent-back *>')) {
            this.onIndentBackMode = ! this.onIndentBackMode
        }
    }

    addLine(block) {
        if(block.isJavascript) {
            this.generatedCode += (block.type === 'LOGIC') 
                ? block.content + ` // TEMPLATE_LINE:${block.lineNumber}\n` 
                : `codeBlocks.push(` + block.content + `); // TEMPLATE_LINE:${block.lineNumber}\n`;
        } else {
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
        let perLine = template.split('\n'),
            totalLength = 0,
            position = index + 1,
            i = 0;

        for (i = 0; i < perLine.length; i++) {

            // Needs to concatenate with the removed \n charactere
            totalLength += (perLine[i] + '\n').length;
            
            if (totalLength >= position)
                return i + 1;

        }

        return 0;
    }

    getTemplateLine(line) {
        let lines = this.template.split('\n'),
            lineIndex = line - 1

        return lines[lineIndex]
    }

    getStringOcurrenceIndexByOrder(string, subString, order) {
        var stringLength = string.length, 
            i = -1;
        
        while(order-- && i++ < stringLength){
            i = string.indexOf(subString, i);
            if (i < 0) break;
        }

        return i;
    }

    finishGeneratedCode() {
        this.generatedCode += 'return codeBlocks.join("");';
        this.generatedCode.replace(/[\r\t\n]/g, '');
        this.checkGeneratedCode();
    }

    checkGeneratedCode() {
        let error = check(this.generatedCode);
        if(error) {
            console.error('TEMPLATE SYNTAX - ERROR DETECTED'.red);
            console.error(error);
            console.error(Array(76).join('-')); //-----...
        }
    }

}

module.exports = Template;