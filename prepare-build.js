const fs = require('fs')

function deleteFolderRecursive(path) {
    if( fs.existsSync(path) ) {
        
        fs.readdirSync(path).forEach(function(file){
            var curPath = path + "/" + file
            if(fs.lstatSync(curPath).isDirectory()) {
                deleteFolderRecursive(curPath)
            } else {
                fs.unlinkSync(curPath)
            }
        })

        fs.rmdirSync(path)
    }
}

// delete /dist
deleteFolderRecursive('./dist')
