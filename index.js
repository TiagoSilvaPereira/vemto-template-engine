'use strict';

const
    check = require('syntax-error');

class Template {

    constructor(template, name = 'UNKNOWN') {
        this.template = template;
        this.name = name;
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
        this.generatedCode = 'var codeBlocks = [];\n';
        this.actualLineIsLogic = false;
        this.previousLineIsLogic = false;
        this.addHelperFunctions();
    }

    compileWithErrorTreatment(data) {
        try {
            this.compile(data)
        } catch (error) {
            console.log(this.getErrorLine(error), error)
        }
    }

    compile(data) {
        this.generateCode();

        console.log(this.generatedCode)
        
        return new Function(this.generatedCode).apply(data);
    }

    getErrorLine(error) {
        let codeLinesRegex = /(?<=(<anonymous>)(:{1}))([0-9]+)(:{1})([0-9]+)/g,
            matches = error.stack.match(codeLinesRegex)
    
        return matches ? matches[0] : '0:0'
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
        this.template = this.template.replace(/(\r\n|\n|\r|\u2028|\u2029)?(\t| )*(<#)(.*)(#>)/g, '');

        // Remove breaklines from logic blocks
        this.template = this.template.replace(/(\r\n|\n|\r|\u2028|\u2029){1}(\t| )*(<%)/g, '<%');
        this.template = this.template.replace(/(\r\n|\n|\r||\u2028|\u2029){1}(\t| )*(<up)/g, '<up');

        // Remove spaces and breaklines after lineup logic block
        this.template = this.template.replace(/(up>)(\r\n|\n|\r|\u2028|\u2029){1}(\t| )*/g, 'up>');
    }

    separateTextFromCodeBlocks() {
        let matchBlocks = new RegExp(this.settings.blocksMatch, "g"),
            cursor = 0,
            match;

        // While we find matches of the special code blocks (<$ $>, <up up>, etc)
        // When it match something, it returns the matches for all block types, as
        // it uses a composed regex (regex|regex|regex), so the result would be
        // something like: 
        //
        // - ['<$ foo $>', null, '<$ foo $>', null] or
        //
        // - ['<up foo up>', null, null, '<up foo up>']
        //
        //  
        while(match = matchBlocks.exec(this.template)) {
            // Add a whole text block from the latest cursor position
            // to the start of the special block position
            let contentBeforeNextBlock = this.template.slice(cursor, match.index);
            this.addTextBlock(contentBeforeNextBlock);

            let templateLineNumber = this.getLineNumberForIndex(match.index)

            // Add the correct javascript blocks considering the
            // regex matches
            this.addAvailableJavascriptBlocks(match, templateLineNumber);

            // Put the cursor in the end of all javascript blocks
            // It uses the position 0, as it is the primary result
            // of the regex, Ex: ['<$ foo $>', null, '<$ foo $>', null]
            cursor = match.index + match[0].length;
        }

        let finalContent = this.template.substr(cursor, this.template.length - cursor);

        this.addTextBlock(finalContent);
    }

    addAvailableJavascriptBlocks(templateMatch, lineNumber) {
        for (const [index,block] of Object.entries(this.settings.blocks)) {

            // It needs to use the block index because the regex is composed (regex|regex|regex),
            // so it can return null values in some options, but valid options on other. For
            // example: [null, '<$ something $>', null]
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
                ? block.content + ` // TEMPLATE_LINE: ${block.lineNumber}\n` 
                : `codeBlocks.push(` + block.content + `); // TEMPLATE_LINE: ${block.lineNumber}\n`;
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
            total_length = 0,
            i = 0;

        for (i = 0; i < perLine.length; i++) {
            total_length += perLine[i].length;
            if (total_length >= index)
                return i + 1;
        }
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