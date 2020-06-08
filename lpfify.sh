#!/bin/bash
if [ -z "$1" ]
  then
    echo "Error: No directory supplied"
    exit 1
fi

if [ ! -d "$1" ]; then
  echo "$1 does not exist"
  exit 1  
fi

cd $1; zip -r ../$1.zip *; mv ../$1.zip ../$1.lpf

echo "Wrote ../$1.lpf"


