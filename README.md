# sus-2-image
SeaUrchinScore to Image for node

[![npm](https://img.shields.io/npm/v/sus-2-image.svg)](https://www.npmjs.com/package/sus-2-image)
![sus:v2.17.0](https://img.shields.io/badge/sus-v2.17.0-blue.svg)

## Description

\*.sus to Image.

**Not supported: Bezier Curve**

## Installation

```
$ yarn add sus-2-image
```

or

```
$ npm i sus-2-image
```

## How to use

```
const Sus2Image = require('sus-2-image'),
  fs = require('fs')

const sus = fs.readFileSync('example.sus','utf8')

Sus2Image.getImages(sus)
  .then(images =>
    images.forEach((image,index) =>
      fs.writeFileSync(`data${index}.png` , new Buffer(image.split(',')[1], 'base64'))
    )
  )
```
