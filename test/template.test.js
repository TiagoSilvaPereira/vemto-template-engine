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

