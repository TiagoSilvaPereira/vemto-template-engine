const fs = require('fs')

let cjsContent = {type: "commonjs"},
    esmContent = {type: "module"}

// write dist/cjs/package.json with cjsContent
fs.writeFileSync('./dist/cjs/package.json', JSON.stringify(cjsContent, null, 4))
fs.writeFileSync('./dist/esm/package.json', JSON.stringify(esmContent, null, 4))
