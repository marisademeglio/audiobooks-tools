/* fill out all the duration values in readingOrder, resources, links; and also at the top level */

const fs = require('fs-extra');
const path = require('path');
const program = require('commander');
const jsdom = require("jsdom");
const tmp = require('tmp');
const mm = require('music-metadata');
const download = require('download');
const utils = require('./utils');

const { JSDOM } = jsdom;

const AUDIOMIMES = 
[
    'audio/wav', 'audio/mpeg',  'audio/ogg', 'audio/webm', 'audio/mp4', 'audio/aac', 'audio/aacp',
    'audio/flac', 'audio/ogg', 'audio/mp3'
];

program.version('0.0.1');
program
    .requiredOption('-i, --input <file>', 'audiobook manifest or primary entry page')
    .requiredOption('-o, --output <folder>', 'copy of input file with duration data added')
    .option('-f, --force', "Force overwriting output");;
program.parse(process.argv);

if (!fs.existsSync(path.join(process.cwd(), program.output))) {
    fs.mkdirSync(path.join(process.cwd(), program.output));
}

let isHtml = path.extname(program.input) === ".html";
let manifest = null;
let dom = null;
let inputFile = path.join(process.cwd(), program.input);
let base = '';
let manifestScript = null;
    
(async () => {
    
    let manifestText = '';
    // locate and parse the manifest json
    // input could be a primary entry page (html), in which case we look for the manifest via <link rel="publication" href="...">
    if (isHtml) {    
        let filedata = fs.readFileSync(inputFile);
        dom = new JSDOM(filedata);
        // use the same doc later to serialize the output as HTML, in the case of an embedded manifest
        let doc = dom.window.document;
        let publicationLink = doc.querySelector("link[rel=publication]");
        if (!publicationLink) {
            console.log("Error: Could not locate manifest (missing <link rel='publication'>).")
            process.exit(1);
        }
        let linkHref = publicationLink.getAttribute("href");
        // the manifest could be embedded
        if (linkHref[0] == "#") {
            base = inputFile;
            manifestScript = doc.querySelector(linkHref);
            if (!manifestScript) {
                console.log(`Error: Could not locate manifest (${linkHref} not found).`);
                process.exit(1);
            }
            manifestText = manifestScript.innerHTML;        
        }
        // or in another file (external to primary entry page) but linked from it;
        // in which case, we don't care that it originated in an HTML document
        // because when we save the output, we'll save it as JSON
        else {
            isHtml = false;
            base = path.resolve(inputFile, linkHref);
            manifestText = fs.readFileSync(path.resolve(inputFile, linkHref));
        }
    }
    // or the json file containing the manifest could be passed in directly
    else {
        base = path.join(process.cwd(), program.input);
        manifestText = fs.readFileSync(path.join(process.cwd(), program.input));
    }
    manifest = JSON.parse(manifestText);

    if (manifest.hasOwnProperty('readingOrder')) {    
        console.log("Processing reading order");
        manifest.readingOrder = await processLinkedResources(manifest.readingOrder);
    }
    if (manifest.hasOwnProperty("links")) {
        console.log("Processing links");
        manifest.links = await processLinkedResources(manifest.links);
    }
    if (manifest.hasOwnProperty("resources")) {
        console.log("Processing resources");
        manifest.resources = await processLinkedResources(manifest.resources);
    }

    // sum the reading order durations
    let dur = manifest.readingOrder.reduce((acc, curr) =>
        acc += parseFloat(curr.duration.replace("PT", "").replace("S", "")), 0);
    
    manifest.duration = `PT${dur.toFixed(3)}S`;
    
    let outputPath = path.join(process.cwd(), program.output, path.basename(program.input));
    if (isHtml) {
        manifestScript.innerHTML = JSON.stringify(manifest, null, 4);
        //fs.writeFileSync(outputPath, dom.serialize());
        utils.writeOut(outputPath, dom.serialize(), program.force);
    }
    else {
        //fs.writeFileSync(outputPath, JSON.stringify(manifest));
        utils.writeOut(outputPath, JSON.stringify(manifest), program.force);
    }

    console.log("Done. Wrote ", outputPath);

})();

async function processLinkedResources(linkedResources) {
    // make into an array of {url} objects
    let data = linkedResources;
    if (!(data instanceof Array)) {
        data = [data];
    }
    data = data.map(item => 
        typeof item == "string" ? {url: item} : item);
    
    data = data.map(item => {
        let fullurl = '';
        // is it remote and absolute?
        if (item.url.indexOf("://") != -1) {
            fullurl = item.url;
        }
        // else resolve it against the base
        else {
            fullurl = path.resolve(path.dirname(base), item.url);
        }
        return {...item, fullurl};
    });

    let retval = [];
    for (var i = 0; i<data.length; i++) {
        if (data[i].hasOwnProperty("encodingFormat") && 
            AUDIOMIMES.includes(data[i].encodingFormat)) {
            let duration = await getDuration(data[i]);
            retval.push({...data[i], duration});
        }
        else {
            retval.push(data[i]);
        }
    }
    return retval.map(item => {
        delete item.fullurl;
        return item;
    });
}

async function getDuration(linkedResource) {
    let filename = '';
    // remote
    if (linkedResource.fullurl.indexOf("://") != -1) {
        filename = await fetchFile(linkedResource.fullurl);
    }
    // local
    else {
        filename = linkedResource.fullurl;
    }
    try {
        let metadata = await mm.parseFile(filename, {duration: true, mimeType: linkedResource.encodingFormat});
        return `PT${metadata.format.duration.toFixed(3)}S`;
    }
    catch (err) {
        console.log(`Error could not parse metadata \n ${err}`);
        return null;
    }
}

async function fetchFile(url) {
    let tmpobj = tmp.fileSync();
    fs.writeFileSync(tmpobj.name, await download(url));
    return tmpobj.name;
}
