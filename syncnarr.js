/* start with 
1. an HTML file
2. a txt file of audacity start-position labels

The HTML file will be processed according to these rules:
1. if any element has class="syncnarr", then use only elements with class="syncnarr". Remove this class at the end.
2. If no element has class="syncnarr", then use child elements of <body>. Start with the first child and proceed through the siblings.

end result:
1. HTML file with IDs added
2. synchronized narration json file
3. metadata for "alternate" property
*/
        
const fs = require('fs-extra');
const path = require('path');
const program = require('commander');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const utils = require('./utils');

program.version('0.1.0');
program
    .requiredOption('-h, --html <file>', 'HTML input file')
    .requiredOption('-a, --audio <file>', 'Audio file')
    .requiredOption('-l, --labels <file>', 'Audacity labels file')
    .requiredOption('-o, --output <folder', 'Output folder')
    .option('-f, --force', "Force overwriting output");
program.parse(process.argv);

let htmlInput = path.resolve(process.cwd(), program.html);
let labelsInput = path.resolve(process.cwd(), program.labels);
let outputDir = path.resolve(process.cwd(), program.output);

if (!fs.existsSync(outputDir)){
    fs.mkdirSync(outputDir);
}
// parse the HTML file and prepare the elements
let filedata = fs.readFileSync(htmlInput);
if (!filedata) {
    console.log(`Error: could not read html file ${htmlInput}`);
    process.exit(1);
}
const dom = new JSDOM(filedata);
const doc = dom.window.document;
let body = doc.querySelector("body");

// are we using class='syncnarr' ? 
let elms = doc.querySelectorAll("*[class='syncnarr']");
if (elms) {
    elms = Array.from(elms);
}
// else we're using body element children
else {
    let elm = body.firstElementChild;
    while (elm != null) {
        elms.push(elm);
        elm = elm.nextElementSibling;
    }
}

if (elms.length == 0) {
    console.log("Error: did not identify any elements in the HTML file to use for synchronization.");
    process.exit(1);
}

let pairs = parseSyncPoints(labelsInput);

if (pairs.length == 0) {
    console.log("Error: did not identify any timeestamps in the labels file to use for synchronization.");
    process.exit(1);
}

let narration = [];
let count = 0;
let idx = 0;
elms.map(elm => {
    if (!elm.hasAttribute('id')) {
        elm.setAttribute('id', `sn-${count}`);
    }
    count++;
    // this approach depends on the number of elements and number of sync points lining up
    if (idx < pairs.length ) {
        narration.push({
            text: `#${elm.getAttribute('id')}`,
            audio: `#t=${pairs[idx].start.toFixed(2)},${pairs[idx].end.toFixed(2)}`
        });
    }
    else {
        console.log("Warning: more elms than pairs ", elm.getAttribute('id'));
    }
    idx++;
});

// remove class="syncnarr"
elms.map(elm => elm.classList.remove("syncnarr"));

let syncnarr = {
    properties: {
        text: `${path.basename(program.html)}`,
        audio: `${program.audio.indexOf("://") != -1 ? program.audio : path.basename(program.audio)}`,
        "sync-media-css-class-active": "-active-element",
        "sync-media-css-class-playing": "-document-playing"
    }, 
    role: 'document', 
    narration
};
let syncnarrFilename = path.basename(htmlInput).replace('.html', '.json');

// save html file
utils.writeOut(path.resolve(outputDir, path.basename(program.html)), dom.serialize(), program.force);

// save sync narr file
utils.writeOut(path.resolve(outputDir, syncnarrFilename), JSON.stringify(syncnarr), program.force);

console.log(`Done!

Now add this property to the corresponding reading order entry in the manifest:

"alternate": {
    "url": "${syncnarrFilename}",
    "encodingFormat": "application/vnd.syncnarr+json",
    "type": "LinkedResource"
}

Note that URLs may need to be adjusted above and ALSO in ${syncnarrFilename}'s "properties" section, depending on the location of the files in your publication. 

`)

function parseSyncPoints(filepath) {
    let labels = fs.readFileSync(filepath);
    let lines = labels.toString().split("\n");

    let i;
    let points = [];
    for (i=0; i<lines.length; i++) {
        if (lines[i].trim() != "") {
            let [start, end] = lines[i].trim().split("\t");
            if (start != end) {
                console.error("ERROR: label ranges not supported. Use them like single points.");
            }
            points.push(parseFloat(start));
        }
    }
    
    let pairs = [];
    for (i = 0; i<points.length; i++) {
        if (i < points.length - 1) {
            let newPair = {
                start: points[i],
                end: points[i+1]
            };
            //console.log("pair ", newPair);
            pairs.push(newPair);
        }
    }

    return pairs;
}

