'use strict';

const
    check = require('syntax-error');

class Template {

    constructor(template, name = 'UNKNOWN') {
        this.name = name;
        this.latestError = null;

        this.compiled = false;
        this.template = template;
        this.intermediateTemplate = template;

        this.initSettings();
        this.resetTemplate();
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

        for (const [index,block] of Object.entries(this.settings.blocks)) {
            matches.push(block.match);
        }

        this.settings.blocksMatch = matches.join('|');
    }

    resetTemplate() {
        this.textBlocks = [];
        this.latestError = null;
        this.generatedCode = 'var codeBlocks = [];\n';
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
        let generatedCode = this.getGeneratedCode()
        
        return new Function(generatedCode).toString()
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

        let codeLines = this.generatedCode.split('\n'),
            code = codeLines[codeLine - 1],
            templateLine = code.replace(/(codeBlocks)(.*)(TEMPLATE_LINE:)/, '')

        return templateLine || 0
    }

    generateCode() {
        this.resetTemplate();
        this.treatTemplateCode();
        this.separateTextFromCodeBlocks();

        this.textBlocks.forEach(block => {
            this.addLine(block);
        });
        
        this.finishGeneratedCode();
    }

    getGeneratedCode() {
        if(this.compiled) {
            return this.generatedCode;
        }

        this.generateCode();

        return this.generatedCode;
    }

    addHelperFunctions() {
        
        // Can be used inside a template to conditionally remove the last breakline
        let removeLastBreakLine = function() {
            let lastCodeBlockIndex = codeBlocks.length - 1;
            codeBlocks[lastCodeBlockIndex - 1] = codeBlocks[lastCodeBlockIndex - 1].replace(/(\r\n|\n|\r|\u2028|\u2029){1}(\t| )*$/, '')
        }
        
        this.generatedCode += 'this.removeLastBreakLine = ' + removeLastBreakLine.toString() + ';\n';

    }

    treatTemplateCode() {
        // Remove comments
        this.intermediateTemplate = this.intermediateTemplate.replace(/(\r\n|\n|\r|\u2028|\u2029)?(\t| )*(<#)(.*)(#>)/g, '');

        // Remove breaklines from logic blocks
        this.intermediateTemplate = this.intermediateTemplate.replace(/(\r\n|\n|\r|\u2028|\u2029){1}(\t| )*(<%)/g, '<%');
        this.intermediateTemplate = this.intermediateTemplate.replace(/(\r\n|\n|\r||\u2028|\u2029){1}(\t| )*(<up)/g, '<up');

        // Remove spaces and breaklines after lineup logic block
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

            let templateLineNumber = this.getLineNumberForIndex(matchPositionOnOriginalTemplate)

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
                this.addTextBlock(templateMatch[block.index], true, block.type, lineNumber);
            }
        }
    }

    addTextBlock(content, isJavascript = false, type = 'TEXT', lineNumber = 0) {
        if(type == 'TEXT') {
            content = this.convertTextSpecialCharacters(content);
        }

        let textBlock = {
            content,
            isJavascript,
            type,
            lineNumber
        };

        this.textBlocks.push(textBlock);
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

    getLineNumberForIndex(index) {
        let perLine = this.template.split('\n'),
            totalLength = 0,
            i = 0;

        for (i = 0; i < perLine.length; i++) {

            // Needs to sum with 1 because it removes the \n charactere
            totalLength += perLine[i].length + 1;
            
            if (totalLength >= index)
                return i + 1;

        }
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