# audiobooks-tools
Utility scripts for audiobooks

## get the code

1. Clone this repository or download the zip.
2. Make sure you have a reasonably recent version of Node JS installed
3. `npm i`

## make an LPF

Make sure you have run permissions on this script (you just have to do this once):

`chmod u+x lpfify.sh`

Create the LPF:

`./lpfify.sh bookdir`

Creates `bookdir.lpf`.

Unzip it to see if it worked how you expected:

```
mkdir tmp
unzip bookdir.lpf -d tmp
```

Then look in `tmp`.

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
* Text file containing label markers exported from Audacity (see [example](https://github.com/marisademeglio/audiobooks-tools/blob/master/example/syncnarr/sample-audacity-labels.txt))

Output:
* Sync narration JSON file
* HTML file with required IDs added
* Snippet to paste into your manifest as the "alternate" property

Run the included example:

`npm run syncnarr-example`
