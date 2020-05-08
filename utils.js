const path = require('path');
const fs = require('fs-extra');

function writeOut(filename, contents, force=false) {
    let outpath = path.resolve(__dirname, 'out/', filename);
    if (fs.existsSync(outpath) && force || !fs.existsSync(outpath)) {
        fs.writeFileSync(outpath, contents);
        console.log(`Wrote ${outpath}`);
    }
    else {
        console.log(`ERROR: Cannot overwrite existing file of the same name:\n ${outpath}\nUse --force.\n`);
    }
}



module.exports = {writeOut}