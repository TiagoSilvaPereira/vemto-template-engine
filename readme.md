# SilverB - Code and Text Template Engine

## Introduction

SilverB is a template engine, but made for code and text generation and to be used with [PWC Code Generator](https://github.com/pwc-code-generator/pwc). In the past, I tested some template engines with PWC, like Handlebars, Dot and others. But these template engines are made for another purpose (HTML templates) and, because of it, I decided to make my own template engine.

SilverB can be used for any dynamic text generation and accepts all Javascript syntaxes inside your special tags.

## License

SilverB is dual-license:

- FREE for non-commercial use
- PAID for commercial use

Please see the [License File](LICENSE.md) and e-mail me at <contact@vemto.app> if you want to buy a license for commercial usage. 

You can see the prices for commercial usage [here](prices.md).

## Installation

To use SilverB in your own project, install it using npm:

```
npm install silverb --save
```

And import it on your script:

```Javascript
const SilverB = require('silverb');

```

Finally, build something amazing! :D

## Example

Let's consider we have this data:

```Javascript
var data = {
    name: 'Tiago Silva Pereira Rodrigues',
    projects: [
        'PWC', 'SilverB', 'Rapid Mockup', 'Stop It'
    ]
}
```

And we have this text template:

```Javascript
var template = `
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
const SilverB = require('silverb');

// The data object can be passed to the template on the compile method
var result = new SilverB(template).compile(data); 

```

The **result** will be:

```
Hi, I'm Tiago Silva Pereira Rodrigues.

I created these projects:

    - PWC
    - SilverB
    - Rapid Mockup
    - Stop It
```

See this example running [here](https://runkit.com/embed/rg5rwen7nmdt).

## Tags

At this moment, SilverB has four different tags that can be used. All the text outside these tags will be generated without modifications, keeping the indentation and break lines.

The tags are:

- ```<# #>``` - Used for line comments
- ```<$ $>``` - Used to show variables or expression values. Commands inside these tags will be executed and transformed into text
- ```<up up>``` - It is like <$ $>, but will put the result on the previous line (only if the tags are at the start of a new line)
- ```<% %>``` - Used for javascript logic blocks like **if**, **for**, etc. Commands inside these tags will not be transformed to text. Accepts all javascript syntax.

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

**removeLastBreakLine** - It will remove the last break line on the text. Eg:

```

var data = true;

...

<# Template #>

Something here...

<% if(this.data == true) { %>
    <% this.removeLastBreakLine(); %> <# Will remove the break line after "Something here..." #>
<% } %>
```

## Syntax Highlighter

SilverB has a simple Syntax Highlighter for VSCode [here](https://github.com/TiagoSilvaPereira/silverb_syntax_vscode). If you want, you can create a syntax highlighter for your preferred editor and add on this Readme.

The syntax highlighter will work on files with **.silverb** extension.

## Prices for Commercial Usage

- Up to 1M generated lines - **$799 yearly**
- Up to 10M generated lines - **$999 yearly**
- Unlimited generated lines - **$1199 yearly**