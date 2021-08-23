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

    expect(latestError.codeLine).toBe(7)
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