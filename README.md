# sus-2-image
SeaUrchinScore to Image for node

[![npm](https://img.shields.io/npm/v/sus-2-image.svg)](https://www.npmjs.com/package/sus-2-image)
![sus:v2.17.0](https://img.shields.io/badge/sus-v2.17.0-blue.svg)

## Description

\*.sus to Image.

## Installation

```
$ yarn add sus-2-image
```

## How to use

```js
const Sus2Image = require('sus-2-image')
const fs = require('fs')

const sus = fs.readFileSync('example.sus','utf8')

Sus2Image.getSVG(sus).then(image => {
  fs.writeFileSync(`score.svg` , image)
})

Sus2Image.getPNG(sus).then(image => {
  fs.writeFileSync(`score.png` , image)
})

Sus2Image.getPNGs(sus).then(images => {
  images.forEach((image, index) => {
    fs.writeFileSync(`score_${index}.png` , image)
  })
})
```
