# Vemto Template Engine

## Introduction

Vemto Template Engine (VTE, former SilverB) is a template engine for code and text generation. It was initially created to be used with [PWC Code Generator](https://github.com/pwc-code-generator/pwc). In the past, I tested some template engines with PWC, like Handlebars, Dot, and others. However, these engines are made for another purpose (HTML templates), and because of this, I decided to make my own.

VTE can be used for any dynamic text generation and accepts all Javascript syntaxes inside its special tags.

## Installation

To use VTE in your project, install it using npm or yarn:

```
npm install @tiago_silva_pereira/vemto-template-engine --save
```
Then you can import it on your code:

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

## Helpers

Helpers are methods on the template scope that you can call conditionally to make specific text operations. The currently available helpers are:

**removeLastLineBreak** - It will remove the last line break on the text. Eg:

```

var data = true;

...

<# Template #>

Something here...

<% if(this.data == true) { %>
    <% this.removeLastBreakLine(); %> <# Will remove the line break after "Something here..." #>
<% } %>
```

## Template Data

```
<####>
<# TEMPLATE DATA #>
<# DATA:MODEL [ project = Project ] #>
<# DATA:MODEL [ column = Column ] #>
<# DATA:EXPOSE_LOCAL [ exposed_variables = column ] #>
<# DATA:RENDERABLE [ renderable = CustomRenderable() ] #>
<####>
```

## Syntax Highlighter

We have a simple Syntax Highlighter for VSCode [here](https://github.com/TiagoSilvaPereira/vemto-template-engine-syntax-vscode). If you want, you can create a syntax highlighter for your preferred editor and add to this Readme.

The syntax highlighter will work on files with **.vemtl** extension.

## License
MIT