# Vemto Template Engine

## Introduction

Vemto Template Engine (VTE, former SilverB) is a template engine for code and text generation. It was initially created to be used with [PWC Code Generator](https://github.com/pwc-code-generator/pwc). In the past, I tested some template engines with PWC, like Handlebars, Dot, and others. However, these engines are made for another purpose (HTML templates), and because of this, I decided to make my own.

VTE can be used for any dynamic text generation and accepts all Javascript syntaxes inside its special tags.

> **Disclaimer:** This project was created in 2018 and has had few changes. The code style is a bit dated, but the engine works very well and rarely needs any updates.

## Installation

To use VTE in your project, install it using npm or yarn:

```
npm install @tiago_silva_pereira/vemto-template-engine --save
```
Then you can import it in your code:

```Javascript
const TemplateEngine = require('@tiago_silva_pereira/vemto-template-engine');

// Or as a module
import TemplateEngine, { TemplateErrorLogger } from "@tiago_silva_pereira/vemto-template-engine"

```

Finally, build something amazing! :D

## Example

Let's consider we have this data:

```Javascript
var data = {
    name: 'Tiago Silva Pereira Rodrigues',
    projects: [
        'PWC', 'Vemto Template Engine', 'Rapid Mockup', 'Stop It', 'Vemto', 'Vote Hub', 'Reading Light'
    ]
}
```

And we have this text template:

```Javascript
var templateContent = `
Hi, I'm <$ this.name $>.

I created these projects:

<# It is a comment #>
<% for (let project of this.projects) { %>
    - <$ project $>
<% } %>
`;
```

As you can see, we can attach the *data object* to the template scope and can access it using *this*. Any javascript command is accepted inside **<% %>** tags.

Then we can compile the template:

```Javascript
// The data object can be passed to the template on the compile method
var result = new TemplateEngine(templateContent)
    .setData(data)
    .compile()

```

The **result** will be:

```
Hi, I'm Tiago Silva Pereira Rodrigues.

I created these projects:

    - PWC
    - Vemto Template Engine
    - Rapid Mockup
    - Stop It
```

See this example running [here](https://runkit.com/embed/rg5rwen7nmdt).

## Tags

- ```<# #>``` - Used for line comments
- ```<$ $>``` - Used to show variables or expression values. Commands inside these tags will be executed and transformed into text
- ```<up up>``` - It is like <$ $>, but will put the result on the previous line (only if the tags are at the start of a new line)
- ```<% %>``` - Used for javascript logic blocks like **if**, **for**, etc. Commands inside these tags will not be transformed to text. Accepts all javascript syntax.
- ```<import template="">``` - Used to import other templates

Examples:

```
<# It is a comment and will not be transformed to text #>

<# Showing a value - will convert to something like "Tiago Rodrigues" #>
<$ this.name $>

---------------

<# Showing an expression return - will convert to something like "User", or "Role", etc #>
<$ this.model.getName() $>

---------------

<# The second sentence will be generated on the previous line - will result in something like "Tiago Rodrigues - Tiago Rodrigues" #>
<$ this.name $> -
<up this.name up>

---------------

var data = true;

...

<# If this.data is equal true #>
<% if(this.data == true) { %>
    Hi, I'm here!!
<% } %>

```

## Template Imports

VTE supports importing other templates, which helps with modularity and reusability. Templates can be imported using the `<import>` tag:

```
<import template="TemplateName.vemtl">
```

To use template imports, you must provide the templates when instantiating the TemplateEngine:

```Javascript
let mainTemplate = `
Hi, I'm <$ this.name $>.

My projects:
<import template="ProjectsList.vemtl">

<import template="Greetings.vemtl">
`;

let projectsListTemplate = `
<% for (let project of this.projects) { %>
    - <$ project $>
<% } %>
`;

let greetingsTemplate = `<$ this.greetings $>`;

let result = new TemplateEngine(mainTemplate, {
    imports: {
        'ProjectsList.vemtl': projectsListTemplate,
        'Greetings.vemtl': greetingsTemplate,
    }
}).setData({
    name: 'Tiago',
    projects: ['VTE', 'PWC'],
    greetings: 'Happy Coding!'
}).compile();
```

### Template Parameters

You can pass parameters to imported templates:

```
<import template="TemplateName.vemtl" param1="'value'" param2="true" param3="42">
```

Inside the imported template, you can access these parameters via `this.templateParams`:

```
<% if(this.templateParams.showMessage) { %>
    <$ this.templateParams.message $>
<% } %>
```

## Indentation Control

VTE can automatically handle indentation in generated code, which is especially useful for languages where indentation is important:

### Removing Indentation

You can use the `indent-back` directive to control indentation:

```
<* indent-back *>
<html>
    <body>
        <% if(true) { %>
            <div>Content</div>
        <% } %>
    </body>
</html>
<* end:indent-back *>
```

This feature will adjust indentation based on code blocks, making the generated code cleaner and properly indented. The result would be:

```html
<html>
    <body>
        <div>Content</div>
    </body>
</html>
```

Instead of:

```html
<html>
    <body>
            <div>Content</div>
    </body>
</html>
```

## Helpers

Helpers are methods on the template scope that you can call conditionally to make specific text operations:

### removeLastLineBreak

Removes the last line break in the generated text:

```
Something here...

<% if(this.condition) { %>
    <% this.removeLastLineBreak(); %> <# Will remove the line break after "Something here..." #>
<% } %>
```

## Error Handling

VTE provides robust error handling to help debug templates:

```Javascript
let compiler = new TemplateEngine(template);

try {
    compiler.setData(data).compileWithErrorTreatment();
} catch (e) {
    console.error(e);
    
    // Get the error details
    let latestError = compiler.getLatestError();
    console.log(`Error at template line: ${latestError.templateLine}`);
}
```

### TemplateErrorLogger

For more complex scenarios with nested templates, you can use the `TemplateErrorLogger`:

```Javascript
import TemplateEngine, { TemplateErrorLogger } from "@tiago_silva_pereira/vemto-template-engine";

const errorLogger = new TemplateErrorLogger();

// Pass the error logger to the template engine
const compiler = new TemplateEngine(template, {templateName: 'MainTemplate'}, errorLogger);

try {
    await compiler.setData(data).compileAsyncWithErrorTreatment();
} catch (e) {
    // Access all collected errors
    const errors = errorLogger.get();
    const lastError = errorLogger.getLatest();
    
    console.log(`Error in template ${lastError.templateName}: ${lastError.error}`);
}
```

## Async Template Compilation

VTE supports asynchronous template compilation, allowing you to use async/await in your templates:

```Javascript
let data = {
    name: 'Tiago',
    asyncFunction: async () => {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve('Rodrigues');
            }, 100);
        });
    }
};

let template = `Hi, I'm <$ this.name $> <$ await this.asyncFunction() $>`;

// Compile asynchronously
let result = await new TemplateEngine(template).setData(data).compileAsync();
// Result: "Hi, I'm Tiago Rodrigues"
```

## External Modules

You can provide modules to be used in your templates:

```Javascript
let template = `
<% const changeCase = this.require('changeCase') %>
Hi <$ changeCase('tiago') $>!
`;

// Provide the module implementation
const changeCase = (str) => str.toUpperCase();

let result = new TemplateEngine(template, {
    require: {
        'changeCase': changeCase,
    }
}).setData({}).compile();

// Result: "Hi TIAGO!"
```

## Template Data Definition

Templates can define their data requirements using special comments:

```
<# DATA:JSON [ json = {"name": "John"} ] #>
<# DATA:MODEL [ project = Project ] #>
<# DATA:STRING [ text = "Hello World" ] #>
<# DATA:NUMBER [ number = 10 ] #>
<# DATA:BOOLEAN [ active = true ] #>
<# DATA:CUSTOM [ something = abc ] #>
<# DATA:OTHER_TYPE [ other = def ] #>
```

You can extract this data definition:

```Javascript
let dataDefinition = new TemplateEngine(template).getDataDefinition();
// Returns an object with the data definitions
```

The returned object would look like:

```Javascript
{
  "json": {
    "name": "json",
    "type": "JSON",
    "value": {"name": "John"}
  },
  "project": {
    "name": "project",
    "type": "MODEL",
    "value": "Project"
  },
  "text": {
    "name": "text",
    "type": "STRING",
    "value": "Hello World"
  },
  "number": {
    "name": "number",
    "type": "NUMBER",
    "value": 10
  },
  "active": {
    "name": "active",
    "type": "BOOLEAN",
    "value": true
  },
  "something": {
    "name": "something",
    "type": "CUSTOM",
    "value": "abc"
  },
  "other": {
    "name": "other",
    "type": "OTHER_TYPE",
    "value": "def"
  }
}
```

## Syntax Highlighter

We have a simple Syntax Highlighter for VSCode [here](https://github.com/TiagoSilvaPereira/vemto-template-engine-syntax-vscode). If you want, you can create a syntax highlighter for your preferred editor and add it to this Readme.

The syntax highlighter works on files with the **.vemtl** extension.

## License
MIT