const SusAnalyzer = require('sus-analyzer')
const sharp = require('sharp')
const { createCanvas, loadImage } = require('canvas')
const fs = require('fs')
const path = require('path')

module.exports.getMeasures = async sus => {
  const images = (await module.exports.getImages(sus)).reverse()
  let process = []
  for(let i = 0; i < images.length; i++) {
    const image = await sharp(Buffer.from(images[i].split(',')[1], 'base64'))
    const m = ((await image.metadata()).height - 16) / 768
    for(let j = 0; j < m; j++)
      process.push(image.extract({ left: 0, top: j*768, width: 272, height: 768 }).toBuffer())
  }
  const buffers = await Promise.all(process)
  const measures = []
  for(let i = 0; i < buffers.length; i++)
    measures.push("data:image/png;base64," + buffers[i].toString('base64'))
  return measures
}

module.exports.getImages = async raw_sus => {
  const sus = SusAnalyzer.getData(raw_sus)

  const notes = {
    1: {
      left:   await loadImage(path.join(__dirname, 'asset', 'tap-left.png')),
      center: await loadImage(path.join(__dirname, 'asset', 'tap-center.png')),
      right:  await loadImage(path.join(__dirname, 'asset', 'tap-right.png'))
    },
    2: {
      left:   await loadImage(path.join(__dirname, 'asset', 'extap-left.png')),
      center: await loadImage(path.join(__dirname, 'asset', 'extap-center.png')),
      right:  await loadImage(path.join(__dirname, 'asset', 'extap-right.png'))
    },
    3: {
      left:   await loadImage(path.join(__dirname, 'asset', 'flick-left.png')),
      center: await loadImage(path.join(__dirname, 'asset', 'flick-center.png')),
      right:  await loadImage(path.join(__dirname, 'asset', 'flick-right.png'))
    },
    4: {
      left:   await loadImage(path.join(__dirname, 'asset', 'hell-left.png')),
      center: await loadImage(path.join(__dirname, 'asset', 'hell-center.png')),
      right:  await loadImage(path.join(__dirname, 'asset', 'hell-right.png'))
    },
    5: {
      left:   await loadImage(path.join(__dirname, 'asset', 'extap-left.png')),
      center: await loadImage(path.join(__dirname, 'asset', 'extap-center.png')),
      right:  await loadImage(path.join(__dirname, 'asset', 'extap-right.png'))
    },
    6: {
      left:   await loadImage(path.join(__dirname, 'asset', 'extap-left.png')),
      center: await loadImage(path.join(__dirname, 'asset', 'extap-center.png')),
      right:  await loadImage(path.join(__dirname, 'asset', 'extap-right.png'))
    },
    7: {
      left:   await loadImage(path.join(__dirname, 'asset', 'air-left.png')),
      center: await loadImage(path.join(__dirname, 'asset', 'air-center.png')),
      right:  await loadImage(path.join(__dirname, 'asset', 'air-right.png'))
    }
  }
  const air = {
    1: await loadImage(path.join(__dirname, 'asset', 'air-up.png')),
    2: await loadImage(path.join(__dirname, 'asset', 'air-down.png')),
    3: await loadImage(path.join(__dirname, 'asset', 'air-up-left.png')),
    4: await loadImage(path.join(__dirname, 'asset', 'air-up-right.png')),
    5: await loadImage(path.join(__dirname, 'asset', 'air-down-left.png')),
    6: await loadImage(path.join(__dirname, 'asset', 'air-down-right.png')),
    7: await loadImage(path.join(__dirname, 'asset', 'air-up.png')),
    8: await loadImage(path.join(__dirname, 'asset', 'air-up-left.png')),
    9: await loadImage(path.join(__dirname, 'asset', 'air-up-right.png'))
  }
  const LONG = {
    '2': {
      left:   await loadImage(path.join(__dirname, 'asset', 'hold-left.png')),
      center: await loadImage(path.join(__dirname, 'asset', 'hold-center.png')),
      step:   await loadImage(path.join(__dirname, 'asset', 'hold-step-center.png')),
      right:  await loadImage(path.join(__dirname, 'asset', 'hold-right.png'))
    },
    '3': {
      left:   await loadImage(path.join(__dirname, 'asset', 'slide-left.png')),
      center: await loadImage(path.join(__dirname, 'asset', 'slide-center.png')),
      step:   await loadImage(path.join(__dirname, 'asset', 'slide-step-center.png')),
      right:  await loadImage(path.join(__dirname, 'asset', 'slide-right.png'))
    },
    '4': {
      left:   await loadImage(path.join(__dirname, 'asset', 'air-action-left.png')),
      center: await loadImage(path.join(__dirname, 'asset', 'air-action-center.png')),
      right:  await loadImage(path.join(__dirname, 'asset', 'air-action-right.png'))
    }
  }

  const measure = await loadImage(path.join(__dirname, 'asset', 'measure.png'))
  const split = await loadImage(path.join(__dirname, 'asset', 'split.png'))

  const images = []
  sus.measure++

  for(let count = 0; count < Math.ceil(sus.measure / 40); count++){
    let a = ((count+1) * 40) > sus.measure ? sus.measure : (count+1) * 40
    let b = count*40

    const canvas = createCanvas(272, 768 * (a - b) + 16)
    const ctx = canvas.getContext('2d')

    ctx.scale(1, -1)
    ctx.translate(0,8+a*-768 )

    // 小節線描画
    for(let i = -1; i < sus.measure; i++) ctx.drawImage(measure, 0, i*768 + 8)

    // 拍線描画
    let drawedMeasure = sus.measure
    sus.BEATs.reverse().forEach(e => {
      for(let i = e.measure; i < drawedMeasure; i++){
        const startPos = i * 768
        const space = 768 / e.beat
        for(let j = 1; j < e.beat; j++)
          ctx.drawImage(split, 0, startPos + space*j + 8)
      }
      drawedMeasure = e.measure
    })

    // HOLD/SLIDE ベース
    sus.longNotes.filter(long => long.type != '4')
      .forEach(long => {
      let before = null
      let controls = []
      for(let i = 0; i < long.notes.length - 1; i++){
        const note = before || long.notes[i]
        const base = note.measure * 768
        const space = 768 / note.split

        const note2 = long.notes[i+1]
        const base2 = note2.measure * 768
        const space2 = 768 / note2.split

        if(note2.type == '3' || note2.type == '4' || note2.type == '5') {
          before = note
          controls.push(note2)
          continue
        }

        ctx.beginPath()
        ctx.moveTo(note.lane * 16 + 8 + 4, base + space * note.pos + 16)
        for(let i = 0; i < controls.length; i++)
          ctx.lineTo(controls[i].lane * 16 + 8 + 4, controls[i].measure * 768 + 768 / controls[i].split * controls[i].pos + 8)
        ctx.lineTo(note2.lane * 16 + 8 + 4,base2 + space2 * note2.pos)
        ctx.lineTo(note2.lane * 16 + 8 + note2.width * 16 - 4,base2 + space2 * note2.pos)
        for(let i = controls.length - 1; i >= 0; i--)
          ctx.lineTo(controls[i].lane * 16 + 8 + controls[i].width * 16 - 4, controls[i].measure * 768 + 768 / controls[i].split * controls[i].pos + 8)
        ctx.lineTo(note.lane * 16 + 8 + note.width * 16 - 4,base + space * note.pos + 16)
        ctx.closePath()

        let gradient = ctx.createLinearGradient(0,base + space * note.pos + 16, 0 ,base2 + space2 * note2.pos)
        gradient.addColorStop(0, '#ff4ce1bb')
        gradient.addColorStop(1, '#ff4ce1bb')
        switch(long.type) {
          case '2':
            gradient.addColorStop(0.2, '#f6ff4cbb')
            gradient.addColorStop(0.8, '#f6ff4cbb')
            break
          case '3':
            gradient.addColorStop(0.2, '#4cd5ffbb')
            gradient.addColorStop(0.8, '#4cd5ffbb')
            break
        }
        ctx.fillStyle = gradient
        ctx.fill()

        if(note2.type == '2' ) {
          before = null
          controls = []
        }
      }
    })

    // SLIDE 線
    sus.longNotes.filter(long => long.type == '3')
      .forEach(long => {
        let before = null
        let controls = []
        for(let i = 0; i < long.notes.length - 1; i++){
          const note = before || long.notes[i]
          const base = note.measure * 768
          const space = 768 / note.split

          const note2 = long.notes[i+1]
          const base2 = note2.measure * 768
          const space2 = 768 / note2.split

          if(note2.type == '3' || note2.type == '4' || note2.type == '5') {
            before = note
            controls.push(note2)
            continue
          }

          ctx.beginPath()
          ctx.moveTo(note.lane * 16 + 8 + ( note.width * 16 ) / 2, base + space * note.pos + 16)
          for(let i = 0; i < controls.length; i++)
            ctx.lineTo(controls[i].lane * 16 + 8 + ( controls[i].width * 16 ) / 2, controls[i].measure * 768 + 768 / controls[i].split * controls[i].pos + 8)
          ctx.lineTo(note2.lane * 16 + 8 + ( note2.width * 16 ) / 2 ,base2 + space2 * note2.pos)
          ctx.strokeStyle = '#4cd5ff'
          ctx.lineWidth = 4
          ctx.stroke()

          if(note2.type == '2' ) {
            before = null
            controls = []
          }
        }
      })

    // HOLD/SLIDE ノーツ
    sus.longNotes.filter(long => long.type != '4').forEach(long => {  // AIR系でない
      long.notes.filter(note => note.type != '4' && note.type != '5') // 不可視ノーツでない
        .forEach(note => {
          let base = note.measure * 768
          const space = 768 / note.split
          ctx.drawImage(LONG[long.type].left, note.lane * 16 + 8 , base + space * note.pos)
          if(note.type == '1' || long.type == '4')
            ctx.drawImage(LONG[long.type].center, note.lane * 16 + 8 + 4 , base + space * note.pos, note.width * 16 - 8, 16)
          else
            ctx.drawImage(LONG[long.type].step, note.lane * 16 + 8 + 4 , base + space * note.pos, note.width * 16 - 8, 16)
          ctx.drawImage(LONG[long.type].right, note.lane * 16 + 8 + note.width * 16 - 4, base + space * note.pos)
        })
    })

    // 地を這うTAP系
    sus.shortNoteLines.filter(measure => measure.type == '1').forEach(measure => {
      const base = measure.measure * 768
      const space = 768 / measure.split
      measure.data.filter(note => note.type != '0').forEach(note => {
        ctx.drawImage(notes[note.type].left   ,measure.lane * 16 + 8 , base + space * note.pos)
        ctx.drawImage(notes[note.type].center ,measure.lane * 16 + 8 + 4 , base + space * note.pos, note.width * 16 - 8, 16)
        ctx.drawImage(notes[note.type].right  ,measure.lane * 16 + 8 + note.width * 16 - 4, base + space * note.pos)
      })
    })

    // AIR
    sus.shortNoteLines.filter(measure => measure.type == '5').forEach(measure => {
      const base = measure.measure * 768
      const space = 768 / measure.split

      measure.data.filter(note => note.type != '0').forEach(note => {

        const a = sus.shortNoteLines
          .filter(m => m.type == '1')
          .filter(m => m.lane == measure.lane)
          .filter(m => m.measure == measure.measure)
          .some(m => {
            return 0 <  m.data
              .filter(n => n.type != '0')
              .filter(n => n.pos == note.pos)
              .filter(n => n.width == note.width).length
          })
        const b = sus.longNotes
          .filter(long => long.type != '4')
          .some(long => {
            return 0 < long.notes
              .filter(n => n.type != '2' && n.type != '4' && n.type != '5')
              .filter(n => n.measure == measure.measure)
              .filter(n => n.lane == measure.lane)
              .filter(n => n.pos == note.pos)
              .filter(n => n.width == note.width).length
          })

        if ((!a && !b) || note.type == '7' || note.type == '8' || note.type == '9') {
          ctx.drawImage(notes[7].left   ,measure.lane * 16 + 8 , base + space * note.pos)
          ctx.drawImage(notes[7].center ,measure.lane * 16 + 8 + 4 , base + space * note.pos, note.width * 16 - 8, 16)
          ctx.drawImage(notes[7].right  ,measure.lane * 16 + 8 + note.width * 16 - 4, base + space * note.pos)
        }

        if(note.type == '1' || note.type == '2' || note.type == '7')
          ctx.drawImage(air[note.type] ,measure.lane * 16 + 8 , base + space * note.pos + 20, note.width * 16, note.width * 8)
        if(note.type == '3' || note.type == '6' || note.type == '8')
          ctx.drawImage(air[note.type] ,measure.lane * 16 + 8 - 8 , base + space * note.pos + 20, note.width * 16, note.width * 8)
        if(note.type == '4' || note.type == '5' || note.type == '9')
          ctx.drawImage(air[note.type] ,measure.lane * 16 + 8 + 8 , base + space * note.pos + 20, note.width * 16, note.width * 8)
      })
    })

    // AIR線
    sus.longNotes.forEach(long => {
      let before = null
      let controls = []
      for(let i = 0; i < long.notes.length - 1; i++){
        if(long.type != '4') continue
        const note = before || long.notes[i]
        const base = note.measure * 768
        const space = 768 / note.split

        const note2 = long.notes[i+1]
        const base2 = note2.measure * 768
        const space2 = 768 / note2.split

        if(note2.type == '3' || note2.type == '4' || note2.type == '5') {
          before = note
          controls.push(note2)
          continue
        }

        ctx.beginPath()
        ctx.moveTo(note.lane * 16 + 8 + ( note.width * 16 ) / 2, base + space * note.pos + 8)
        for(let i = 0; i < controls.length; i++)
          ctx.lineTo(controls[i].lane * 16 + 8 + ( controls[i].width * 16 ) / 2, controls[i].measure * 768 + 768 / controls[i].split * controls[i].pos + 8)
        ctx.lineTo(note2.lane * 16 + 8 + ( note2.width * 16 ) / 2 ,base2 + space2 * note2.pos + 8)
        ctx.strokeStyle = '#4cff51bb'
        ctx.lineWidth = 8
        ctx.stroke()

        if(note2.type == '2') {
          before = null
          controls = []
        }
      }

      // AIR ACTION系ノーツ
      sus.longNotes.filter(long => long.type == '4')
        .forEach(long => {
          long.notes.filter(note => note.type != '1' && note.type != '4' && note.type != '5').forEach(note => {
            let base = note.measure * 768
            const space = 768 / note.split
            ctx.drawImage(LONG[long.type].left   ,note.lane * 16 + 8 , base + space * note.pos)
            ctx.drawImage(LONG[long.type].center ,note.lane * 16 + 8 + 4 , base + space * note.pos, note.width * 16 - 8, 16)
            ctx.drawImage(LONG[long.type].right  ,note.lane * 16 + 8 + note.width * 16 - 4, base + space * note.pos)
          })
        })
    })


    images.push(canvas.toDataURL())
  }
  return images
}

