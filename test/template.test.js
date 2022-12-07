import VET from "../index.js";

test('it renders a simple template', () => {

    let data = {
        name: 'Tiago Silva Pereira Rodrigues',
        projects: [
            'PWC', 'VET', 'Rapid Mockup', 'Stop It'
        ]
    };

    let template = `
    Hi, I'm <$ this.name $>.

    I created these projects:

    <# It is a comment #>
    <% for (let project of this.projects) { %>
        - <$ project $>
    <% } %>
    `;

    let result = new VET(template).setData(data).compile(); 
    
    expect(result.includes(`Hi, I'm Tiago Silva Pereira Rodrigues`)).toBe(true)
    expect(result.includes(`- PWC`)).toBe(true)
    expect(result.includes(`- VET`)).toBe(true)
    expect(result.includes(`- Rapid Mockup`)).toBe(true)
    expect(result.includes(`- Stop It`)).toBe(true)

    expect(result.includes(`<$ this.name $>`)).toBe(false)
    expect(result.includes(`<% for (let project of this.projects) { %>`)).toBe(false)
    expect(result.includes(`<% } %>`)).toBe(false)
    expect(result.includes(`Some other thing`)).toBe(false)
})

test('it shows the correct template error position', () => {

    let data = {};

    let template = `
    Hi, I'm <$ this.user.name $>
    Other Line
    `;

    let compiler = new VET(template);

    expect(() => compiler.setData(data).compileWithErrorTreatment()).toThrow();

    let latestError = compiler.getLatestError()

    expect(latestError.codeLine).toBe(12)
    expect(latestError.templateLine).toBe(2)
})

test('it shows the correct template error - positions with a more complex scenario', () => {

    let data = {
        name: 'Tiago Silva Pereira Rodrigues',
        projects: [
            'PWC', 'VET', 'Rapid Mockup', 'Stop It'
        ]
    };

    let template = `
    Hi, I'm <$ this.name $>.

    I created these projects:

    <# It is a comment #>
    <% for (let project of this.projects) { %>
        - <$ project $>
    <% } %>

    Try to throw the error here: 
    <% if(this.name) { %><$ this.user.name $><% } %>

    Showing the name again: <$ this.name $>

    `;

    let compiler = new VET(template);
    
    expect(() => compiler.setData(data).compileWithErrorTreatment())
        .toThrow(`Cannot read properties of undefined (reading 'name')`);

    let latestError = compiler.getLatestError()
    
    expect(latestError.templateLine).toBe(12)
})

test('it shows the correct error positions with a php template', () => {
    let data = {};

let template = `<?php
<$ this.user.name.status $>
namespace <$ this.namespace $>;

<% let valuesForCompactReturn = []; %>
<% let needsRoles = this.generatorSettings.modules.permissions && this.model.isAuthModel() %>
`;

    let compiler = new VET(template);

    expect(() => compiler.setData(data).compileWithErrorTreatment())
        .toThrow(`Cannot read properties of undefined (reading 'name')`);

    let latestError = compiler.getLatestError()

    expect(latestError.templateLine).toBe(2)
})

test('it shows the correct error positions for logic sections', () => {
    let data = {};

let template = `<?php
// A comment here
// Another comment

<% if(foo) { %>
// Something here
<% } %>
`;

    let compiler = new VET(template);

    expect(() => compiler.setData(data).compileWithErrorTreatment())
        .toThrow(`foo is not defined`);

    let latestError = compiler.getLatestError()

    expect(latestError.templateLine).toBe(5)
})

test('it can import other templates', () => {
    let data = {
        name: 'Tiago Silva Pereira Rodrigues',
        projects: [
            'PWC', 'VET', 'Rapid Mockup', 'Stop It'
        ],
        greetings: 'Happy Coding for You!!'
    };

    let forLoopTemplate = 
    `<% for (let project of this.projects) { %>
        - <$ project $>
    <% } %>`

    let greetingsTemplate = `<$ this.greetings $>`

    let template = `
    Hi, I'm <$ this.name $>.

    I created these projects:
    
    <import template="ForLoop.vemtl">

    <import template="Greetings.vemtl">

    <import template="ForLoop.vemtl">
    `;

    let result = new VET(template, {
        imports: {
            'ForLoop.vemtl': forLoopTemplate,
            'Greetings.vemtl': greetingsTemplate,
        }
    }).setData(data).compile();
    
    expect(result.includes(`Hi, I'm Tiago Silva Pereira Rodrigues`)).toBe(true)
    expect(result.includes(`- PWC`)).toBe(true)
    expect(result.includes(`- VET`)).toBe(true)
    expect(result.includes(`- Rapid Mockup`)).toBe(true)
    expect(result.includes(`- Stop It`)).toBe(true)
    expect(result.includes(`Happy Coding for You!!`)).toBe(true)

    expect(result.includes(`<$ this.name $>`)).toBe(false)
    expect(result.includes(`<% for (let project of this.projects) { %>`)).toBe(false)
    expect(result.includes(`<% } %>`)).toBe(false)
    expect(result.includes(`Some other thing`)).toBe(false)
    expect(result.includes(`<$ this.greetings $>`)).toBe(false)
    expect(result.includes(`<import template="ForLoop.vemtl">`)).toBe(false)
    expect(result.includes(`<import template="Greetings.vemtl">`)).toBe(false)
})

test('it import code with correct indentation', () => {
    let data = {
        name: 'Tiago Rodrigues',
        greetings: 'Happy Coding for You!!',
    };

    let greetingsTemplate = 
`<$ this.greetings $>
<$ this.greetings $> Again!!`

    let template =
`Hi, I'm <$ this.name $>.

    <import template="Greetings.vemtl">
    
Something

        <import template="Greetings.vemtl">`;

    let result = new VET(template, {
        imports: {
            'Greetings.vemtl': greetingsTemplate,
        }
    }).setData(data).compile();
    
    let resultLines = result.split('\n')

    // Needs to have the initial 4 spaces
    expect(resultLines[2].search('    ') !== -1).toBe(true)
    expect(resultLines[3].search('    ') !== -1).toBe(true)

    // Needs to have the initial 8 spaces
    expect(resultLines[7].search('        ') !== -1).toBe(true)
    expect(resultLines[8].search('        ') !== -1).toBe(true)
})

test('it allows to import code on sub-templates', () => {
    let data = {
        name: 'Tiago Rodrigues',
        greetings: 'Happy Coding for You!!',
        hello: 'Hello!!'
    };

    let otherTemplate = `Other Template. <$ this.hello $>`

    let greetingsTemplate = `
    <$ this.greetings $>
    
    <import template="OtherTemplate.vemtl">
    `

    let template = `
    Hi, I'm <$ this.name $>.

    I created these projects:
    
    <import template="Greetings.vemtl">
    `;

    let result = new VET(template, {
        imports: {
            'OtherTemplate.vemtl': otherTemplate,
            'Greetings.vemtl': greetingsTemplate,
        }
    }).setData(data).compile();

    expect(result.includes(`Hi, I'm Tiago Rodrigues`)).toBe(true)
    expect(result.includes(`Happy Coding for You!!`)).toBe(true)
    expect(result.includes(`Other Template. Hello!!`)).toBe(true)

    expect(result.includes(`<$ this.name $>`)).toBe(false)
    expect(result.includes(`<$ this.greetings $>`)).toBe(false)
    expect(result.includes(`<import template="OtherTemplate.vemtl">`)).toBe(false)
    expect(result.includes(`<import template="Greetings.vemtl">`)).toBe(false)
})

test('it can get all template imports names', () => {
    let template = `
    Hi, I'm <$ this.name $>.

    I created these projects:
    
    <import template="Greetings.vemtl" message="'Hello'">
    `;

    let result = new VET(template, {
        disableImportsProcessing: true
    }).getImportedTemplates();

    expect(result.includes(`Greetings.vemtl`)).toBe(true)
    expect(result.includes(`OtherTemplate.vemtl`)).toBe(false)
})

test('it can import templates with params', () => {
    let data = {}

    let importedTemplate = `
    Testing imported template

    <% if(this.templateParams.showMessage) { %>
        <$ this.templateParams.message $>
    <% } %>
    `

    let template = `
    Hi!!
    
    <import template="ImportedTemplate.vemtl" message="'Hello World'" showMessage="true">
    `;

    let result = new VET(template, {
        imports: {
            'ImportedTemplate.vemtl': importedTemplate,
        }
    }).setData(data).compile();
    
    expect(result.includes(`Hi!!`)).toBe(true)
    expect(result.includes(`Testing imported template`)).toBe(true)
    expect(result.includes(`Hello World`)).toBe(true)
})

test('it can use templateParams with undefined params', () => {
    let data = {}

    let importedTemplate = `
    Testing imported template

    <% if(this.templateParams.showMessage) { %>
        <$ this.templateParams.message $>
    <% } %>
    `

    let template = `
    Hi!!
    
    <import template="ImportedTemplate.vemtl">
    `;

    let result = new VET(template, {
        imports: {
            'ImportedTemplate.vemtl': importedTemplate,
        }
    }).setData(data).compile();
    
    expect(result.includes(`Hi!!`)).toBe(true)
    expect(result.includes(`Testing imported template`)).toBe(true)
    expect(result.includes(`Hello World`)).toBe(false)
})

test('it can remove the last line break from a code block', () => {
    let template = `Hi, I'm <$ this.name $>.
    <% if(true) { %>
    test
    <% } %>
    <% this.removeLastLineBreak() %>`;

    let result = new VET(template).setData({}).compile(),
        lines = result.split('\n');
    
    expect(lines.length).toBe(2)
})

test('it ignores code blocks indentation by default', () => {
    let template = [
        '<% if (true) { %>',
        '    <% if (true) { %>',
        '        <% if (true) { %>',
        '        <% let text = "Text here"  %>',
        '        <$ text $>',
        '        <% } %>',
        '    <% } %>',
        '<% } %>',
    ].join('\n')

    let result = new VET(template).setData({}).compile();

    expect(result.length).toBe(18)
})

test('it can remove code blocks indentation if necessary', () => {
    let template = [
        '<* indent-back *>',
        'Hello world!',
        'Hello world!',
        '    <% if (true) { %>',
        '        <% if (true) { %>',
        '            <% if (true) { %>',
        '            <% let text = "Text here"  %>',
        '            <$ text $>',
        '            Second Text Here',
        '            <% } %>',
        '        Third Text Here',
        '        <% } %>',
        '    Hello World!!',
        '    Other!!',
        '    <% } %>',
        'Other Text here',
        '    <% if (true) { %>',
        '    Another text',
        '        Another text',
        '    <% } %>',
        '    <% if (true) { %>',
        '    Text with four spaces',
        '        Text with eight spaces',
        '    <% } %>',
        '<% if (true) { %>',
        'Text in the border',
        '<% } %>',
        '<* indent-back *>',
    ].join('\n')

    
    let result = new VET(template).setData({}).compile(),
        lines = result.split('\n')

    expect(lines[1].search(/\S|$/)).toBe(0)
    expect(lines[2].search(/\S|$/)).toBe(0)
    expect(lines[3].search(/\S|$/)).toBe(4)
    expect(lines[4].search(/\S|$/)).toBe(4)
    expect(lines[5].search(/\S|$/)).toBe(4)
    expect(lines[6].search(/\S|$/)).toBe(4)
    expect(lines[7].search(/\S|$/)).toBe(4)
    expect(lines[8].search(/\S|$/)).toBe(0)
    expect(lines[9].search(/\S|$/)).toBe(4)
    expect(lines[10].search(/\S|$/)).toBe(8)
    expect(lines[11].search(/\S|$/)).toBe(4)
    expect(lines[12].search(/\S|$/)).toBe(8)

})

test('it can remove code blocks indentation for html code', () => {
    let template = [
        '<* indent-back *>',
        '<html>',
        '    <body>',
        '        <% if(true) { %>',
        '            <% if(true) { %>',
        '            Teste', // it goes to the same level of the opening if, because the first indentation level is always carried back
        '                Teste', 
        '            <% } %>',
        '        <% } %>',
        '    </body>',
        '</html>',
    ].join('\n')

    let result = new VET(template).setData({}).compile(),
        lines = result.split('\n')    

    expect(lines[1].search(/\S|$/)).toBe(0)
    expect(lines[2].search(/\S|$/)).toBe(4)
    expect(lines[3].search(/\S|$/)).toBe(8)
    expect(lines[4].search(/\S|$/)).toBe(12)
    expect(lines[5].search(/\S|$/)).toBe(4)
    expect(lines[6].search(/\S|$/)).toBe(0)

})

test('it correctly remove code blocks indentation for multiple text blocks', () => {
    let template = [
        '<* indent-back *>',
        '<html>',
        '    <body>',
        '        <% if(true) { %>',
        '            <% if(true) { %>',
        '            <% let name = "Tiago Rodrigues" %>',
        '            Test test test <$ name $> test asdasdasd',
        '            Hello <$ name $> how are you!!!',
        '                Hello again <$ name $> how are you???',
        '            <% } %>',
        '        <% } %>',
        '    </body>',
        '</html>',
    ].join('\n')

    
    let result = new VET(template).setData({}).compile(),
        lines = result.split('\n')

    expect(lines[1].search(/\S|$/)).toBe(0)
    expect(lines[2].search(/\S|$/)).toBe(4)
    expect(lines[3].search(/\S|$/)).toBe(8)
    expect(lines[4].search(/\S|$/)).toBe(8)
    expect(lines[5].search(/\S|$/)).toBe(12)
    expect(lines[6].search(/\S|$/)).toBe(4)
    expect(lines[7].search(/\S|$/)).toBe(0)

})

test('it can disable code blocks indentation', () => {
    let template = [
        '<html>',
        '    <body>',
        '<* indent-back *>',
        '        <% if(true) { %>',
        '            <% if(true) { %>',
        '            <% let name = "Tiago Rodrigues" %>',
        '            Test test test <$ name $> test asdasdasd',
        '            Hello <$ name $> how are you!!!',
        '                Hello again <$ name $> how are you???',
        '            <% } %>',
        '        <% } %>',
        '<* end:indent-back *>',
        '        <% if(true) { %>',
        '            <% if(true) { %>',
        '            <% let name = "Tiago Rodrigues" %>',
        '            Test test test <$ name $> test asdasdasd',
        '            Hello <$ name $> how are you!!!',
        '                Hello again <$ name $> how are you???',
        '            <% } %>',
        '        <% } %>',
        '    </body>',
        '</html>',
    ].join('\n')

    
    let result = new VET(template).setData({}).compile(),
        lines = result.split('\n')

    expect(lines[0].search(/\S|$/)).toBe(0)
    expect(lines[1].search(/\S|$/)).toBe(4)
    expect(lines[2].search(/\S|$/)).toBe(8)
    expect(lines[3].search(/\S|$/)).toBe(8)
    expect(lines[4].search(/\S|$/)).toBe(12)
    expect(lines[5].search(/\S|$/)).toBe(12)
    expect(lines[6].search(/\S|$/)).toBe(12)
    expect(lines[7].search(/\S|$/)).toBe(16)
    expect(lines[8].search(/\S|$/)).toBe(4)
    expect(lines[9].search(/\S|$/)).toBe(0)

})

test('it can catch template errors separately', () => {
    let template = `
    Hi, I'm <$ user.name $>
    Other Line
    `;

    let compiler = new VET(template);

    compiler.generateCode();

    const validCode = compiler.codeIsValid(false);

    expect(validCode).toBe(false);
})