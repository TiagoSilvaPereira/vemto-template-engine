const VET = require('../index')

test('renders a simple template', () => {

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

    let result = new VET(template).compile(data); 
    
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

    expect(() => compiler.compileWithErrorTreatment(data)).toThrow();

    let latestError = compiler.getLatestError()

    expect(latestError.codeLine).toBe(8)
    expect(latestError.templateLine).toBe(2)
})

test('it shows the correct template error positions with a more complex scenario', () => {

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
    
    expect(() => compiler.compileWithErrorTreatment(data))
        .toThrow(`Cannot read property 'name' of undefined`);

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

    expect(() => compiler.compileWithErrorTreatment(data))
        .toThrow(`Cannot read property 'name' of undefined`);

    let latestError = compiler.getLatestError()

    expect(latestError.templateLine).toBe(2)
})

test('it can import other pieces of data', () => {
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
    }).compile(data);
    
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
    }).compile(data);
    
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
    }).compile(data);

    expect(result.includes(`Hi, I'm Tiago Rodrigues`)).toBe(true)
    expect(result.includes(`Happy Coding for You!!`)).toBe(true)
    expect(result.includes(`Other Template. Hello!!`)).toBe(true)

    expect(result.includes(`<$ this.name $>`)).toBe(false)
    expect(result.includes(`<$ this.greetings $>`)).toBe(false)
    expect(result.includes(`<import template="OtherTemplate.vemtl">`)).toBe(false)
    expect(result.includes(`<import template="Greetings.vemtl">`)).toBe(false)
})