# audiobooks-tools
Utility scripts for audiobooks

## get the code

1. Clone this repository or download the zip.
2. Make sure you have a reasonably recent version of Node JS installed
3. `npm i`

## calculate durations

`npm run add-durations -- --input manifestFile --output outdir`

Input:
* Local manifest file (embedded in HTML or as a separate JSON file)

Output:
* Manifest with durations added (saved in same format as input -- HTML or JSON)


Run the included example:

`npm run durations-example`


## add synchronized narration

`npm run add-syncnarr --html localHtmlFile --audio anyAudioFileOrURL --labels localLabelsFile --output outdir`

Input:
* HTML file (local)
* Audio filepath (URL or local file)
* Text file containing label markers exported from Audacity (see example/syncnarr/sample-audacity-labels.txt)

Output:
* Sync narration JSON file
* HTML file with required IDs added
* Snippet to paste into your manifest as the "alternate" property

Run the included example:

`npm run syncnarr-example`
