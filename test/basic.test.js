const SilverB = require('silverb')

test('renders a simple template', () => {

    let data = {
        name: 'Tiago Silva Pereira Rodrigues',
        projects: [
            'PWC', 'SilverB', 'Rapid Mockup', 'Stop It'
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

    let result = new SilverB(template).compile(data); 
    
    expect(result.includes(`Hi, I'm Tiago Silva Pereira Rodrigues`)).toBe(true)
    expect(result.includes(`- PWC`)).toBe(true)
    expect(result.includes(`- SilverB`)).toBe(true)
    expect(result.includes(`- Rapid Mockup`)).toBe(true)
    expect(result.includes(`- Stop It`)).toBe(true)

    expect(result.includes(`<$ this.name $>`)).toBe(false)
    expect(result.includes(`<% for (let project of this.projects) { %>`)).toBe(false)
    expect(result.includes(`<% } %>`)).toBe(false)
    expect(result.includes(`Some other thing`)).toBe(false)
})

test('it shows the correct template error position', () => {

    let data = {};

    let template = `Hi, I'm <$ this.user.name $>`;

    let result = new SilverB(template).compile(data);
    
})