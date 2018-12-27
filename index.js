const SusAnalyzer = require('sus-analyzer')
const bezier = require('simple-bezier')
const sharp = require('sharp')
const { createCanvas, loadImage } = require('canvas')
const fs = require('fs')
const path = require('path')
const jsdom = require('jsdom')
const { JSDOM } = jsdom
const d3 = require('d3')

const short_color = {1: '#FF3333', 2: '#FF3', 3: '#3cc', 4: '#0033FF',5: '#FF3', 6: '#FF3', 7: '#77ff33'}
const long_color = {2: '#FFA500', 3: '#0033FF'}

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

  const height = 768 * sus.measure + 32
  let dom = new JSDOM('<html><body></body></html>')

  d3.select(dom.window.document.body)
    .append('svg')
    .attr('xmlns', 'http://www.w3.org/2000/svg')
    .attr('version', '1.1')
    .attr('id', 'score')
    .attr('width', '272px')
    .attr('height', `${height}px`)

  // グラデーション定義
  d3.select(dom.window.document.body.querySelector('#score')).append('linearGradient').attr('id', 'hold').attr('x1', '0').attr('y1', '0').attr('x2', '0').attr('y2', '1')
  d3.select(dom.window.document.body.querySelector('#score')).append('linearGradient').attr('id', 'slide').attr('x1', '0').attr('y1', '0').attr('x2', '0').attr('y2', '1')

  d3.select(dom.window.document.body.querySelector('#hold' )).append('stop').attr('offset', '0%'  ).attr('stop-color', '#ff4ce1').attr('stop-opacity', '0.7')
  d3.select(dom.window.document.body.querySelector('#hold' )).append('stop').attr('offset', '25%' ).attr('stop-color', '#f6ff4c').attr('stop-opacity', '0.7')
  d3.select(dom.window.document.body.querySelector('#hold' )).append('stop').attr('offset', '75%' ).attr('stop-color', '#f6ff4c').attr('stop-opacity', '0.7')
  d3.select(dom.window.document.body.querySelector('#hold' )).append('stop').attr('offset', '100%').attr('stop-color', '#ff4ce1').attr('stop-opacity', '0.7')
  d3.select(dom.window.document.body.querySelector('#slide')).append('stop').attr('offset', '0%'  ).attr('stop-color', '#ff4ce1').attr('stop-opacity', '0.7')
  d3.select(dom.window.document.body.querySelector('#slide')).append('stop').attr('offset', '25%' ).attr('stop-color', '#4cd5ff').attr('stop-opacity', '0.7')
  d3.select(dom.window.document.body.querySelector('#slide')).append('stop').attr('offset', '75%' ).attr('stop-color', '#4cd5ff').attr('stop-opacity', '0.7')
  d3.select(dom.window.document.body.querySelector('#slide')).append('stop').attr('offset', '100%').attr('stop-color', '#ff4ce1').attr('stop-opacity', '0.7')


  sus.shortNotes = sus.shortNotes.map(note => {
    note.position = 768 / sus.BEATs[note.measure] / 192 * note.position + 8
    return note
  })

  sus.longNotes = sus.longNotes.map(long => {
    long.notes = long.notes.map(note => {
      note.position = 768 / sus.BEATs[note.measure] / 192 * note.position + 8
      return note
    })
    return long
  })

  // ベース描画
  d3.select(dom.window.document.body.querySelector('#score'))
    .append('g')
    .attr('id', 'base')

  d3.select(dom.window.document.body.querySelector('#base'))
    .append('rect')
    .attr('id', 'base_black')
    .attr('x', '0')
    .attr('y', '0')
    .attr('width', '272px')
    .attr('height', `${height}px`)
    .attr('fill', '#000000')

  // レーン描画
  d3.select(dom.window.document.body.querySelector('#base'))
    .append('g')
    .attr('id', 'lane_line')

  for(let i = 0; i <= 8; i++)
    d3.select(dom.window.document.body.querySelector('#lane_line'))
      .append('line')
      .attr('x1', `${32*i + 8}px`)
      .attr('y1', `0px`)
      .attr('x2', `${32*i + 8}px`)
      .attr('y2', `${height}px`)
      .attr('stroke-width', '1px')
      .attr('stroke', '#888')

  // 小節線描画
  d3.select(dom.window.document.body.querySelector('#base'))
    .append('g')
    .attr('id', 'measure_line')

  for(let i = 0; i < sus.measure + 1; i++)
    d3.select(dom.window.document.body.querySelector('#measure_line'))
      .append('line')
      .attr('x1', '0px')
      .attr('y1', `${height - (i * 768 + 16)}px`)
      .attr('x2', '272px')
      .attr('y2', `${height - (i * 768 + 16)}px`)
      .attr('stroke-width', '2px')
      .attr('stroke', '#fff')

  // 拍線描画
  d3.select(dom.window.document.body.querySelector('#base'))
    .append('g')
    .attr('id', 'beat_line')

  sus.BEATs.forEach((beat, index) => {
    const base = 768 * index
    for(let i = 1; i < beat; i++)
      d3.select(dom.window.document.body.querySelector('#beat_line'))
        .append('line')
        .attr('x1', '0px')
        .attr('y1', `${height - (768 * index + 768/beat*i + 16)}px`)
        .attr('x2', '272px')
        .attr('y2', `${height - (768 * index + 768/beat*i + 16)}px`)
        .attr('stroke-width', '1px')
        .attr('stroke', '#fff')
  })

  // HOLD SLIDE ベース
  d3.select(dom.window.document.body.querySelector('#score'))
    .append('g')
    .attr('id', 'long')

  d3.select(dom.window.document.body.querySelector('#long'))
    .append('g')
    .attr('id', 'long_base')

  sus.longNotes.filter(long => long.type !== 4)
    .forEach(longNotes => {

      // 可視中継点で分割（色分けの為）
      const colorBlocks = longNotes.notes.reduce((list,note) => {
        list[list.length - 1].push(Object.assign({},note))
        if(note.note_type !== 3) return list
        list.push([])
        list[list.length - 1].push(Object.assign({},note))
        return list
      },[[]])

      colorBlocks.forEach(colorBlock => {

        // 不可視中継点で分割（ベジェ判定の為）
        const bases = colorBlock.reduce((list,note) => {
          list[list.length - 1].push(Object.assign({},note))
          if(![5].includes(note.note_type)) return list
          list.push([])
          list[list.length - 1].push(Object.assign({},note))
          return list
        },[[]])

        const points = bases.reduce((list,notes) => {
          // ノーツがある場合ベースの位置を8pxずらす
          if([1,2,3].includes(notes[0].note_type)) notes[0].position += 8
          if([1,2,3].includes(notes[notes.length - 1].note_type)) notes[notes.length - 1].position -= 8

          if(notes.length > 2 && notes.some(n => n.note_type === 4)){
            // ベジェ
            const n1 = notes.map(n => ([n.lane * 16 + 8 + 4               , n.measure * 768 + n.position + 8]))
            const n2 = notes.map(n => ([n.lane * 16 + 8 + n.width * 16 - 4, n.measure * 768 + n.position + 8]))

            bezier(n1, 100).forEach(c => list[0].push({x: c[0], y: height - c[1]}))
            bezier(n2, 100).forEach(c => list[1].push({x: c[0], y: height - c[1]}))
          } else {
            // 直線
            notes.forEach(note => {
              list[0].push({x: note.lane * 16 + 8 + 4,                   y: height - (note.measure * 768 + note.position + 8)})
              list[1].push({x: note.lane * 16 + 8 + note.width * 16 - 4, y: height - (note.measure * 768 + note.position + 8)})
            })
          }
          return list
        },[[],[]])

        let data = "M"

        points[0].forEach(point => data += `${point.x} ${point.y} L`)
        points[1].reverse().forEach(point => data += `${point.x} ${point.y} L`)

        data = data.slice(0,-1) + 'z'
        d3.select(dom.window.document.body.querySelector('#long_base'))
          .append('path')
          .attr('d', data)
          .attr('fill', `url(#${longNotes.type == 2 ? 'hold' : 'slide'})`)
      })
    })


  // SLIDE 線
  d3.select(dom.window.document.body.querySelector('#long'))
    .append('g')
    .attr('id', 'long_line')

  sus.longNotes.filter(long => long.type === 3)
    .forEach(longNotes => {

      // 可視中継点で分割（色分けの為）
      const colorBlocks = longNotes.notes.reduce((list,note) => {
        list[list.length - 1].push(Object.assign({},note))
        if(note.note_type !== 3) return list
        list.push([])
        list[list.length - 1].push(Object.assign({},note))
        return list
      },[[]])

      colorBlocks.forEach(colorBlock => {

        // 不可視中継点で分割（ベジェ判定の為）
        const bases = colorBlock.reduce((list,note) => {
          list[list.length - 1].push(Object.assign({},note))
          if(![5].includes(note.note_type)) return list
          list.push([])
          list[list.length - 1].push(Object.assign({},note))
          return list
        },[[]])


        const points = bases.reduce((list,notes) => {
          // ノーツがある場合ベースの位置を8pxずらす
          if([1,2,3].includes(notes[0].note_type)) notes[0].position += 8
          if([1,2,3].includes(notes[notes.length - 1].note_type)) notes[notes.length - 1].position -= 8

          if(notes.length > 2 && notes.some(n => n.note_type === 4)){
            // ベジェ
            const n1 = notes.map(n => ([n.lane * 16 + 8 + ( n.width * 16 ) / 2 - 3, n.measure * 768 + n.position + 8]))
            const n2 = notes.map(n => ([n.lane * 16 + 8 + ( n.width * 16 ) / 2 + 3, n.measure * 768 + n.position + 8]))

            bezier(n1, 100).forEach(c => list[0].push({x: c[0], y: height - c[1]}))
            bezier(n2, 100).forEach(c => list[1].push({x: c[0], y: height - c[1]}))
          } else {
            // 直線
            notes.forEach(note => {
              list[0].push({x: note.lane * 16 + 8 + ( note.width * 16 ) / 2 - 3, y: height - (note.measure * 768 + note.position + 8)})
              list[1].push({x: note.lane * 16 + 8 + ( note.width * 16 ) / 2 + 3, y: height - (note.measure * 768 + note.position + 8)})
            })
          }
          return list
        },[[],[]])

        let data = "M"

        points[0].forEach(point => data += `${point.x} ${point.y} L`)
        points[1].reverse().forEach(point => data += `${point.x} ${point.y} L`)

        data = data.slice(0,-1) + 'z'
        d3.select(dom.window.document.body.querySelector('#long_line'))
          .append('path')
          .attr('d', data)
          .attr('fill', `#4cd5ff`)
      })
    })

  // HOLD/SLIDE ノーツ
  d3.select(dom.window.document.body.querySelector('#long'))
    .append('g')
    .attr('id', 'long_notes')

  sus.longNotes.filter(long => long.type !== 4).forEach(long => {  // AIR系でない
    long.notes.filter(note => ![4,5].includes(note.note_type)) // 不可視ノーツでない
      .forEach(note => {
        const x_pos = note.lane * 16 + 8
        const y_pos = height - (note.measure * 768 + note.position)

        drawNotes(dom,x_pos,y_pos,note.width,"#long_notes",long_color[long.type],[1,4].includes(note.note_type))
      })
  })

  // 地を這うTAP系
  d3.select(dom.window.document.body.querySelector('#score'))
    .append('g')
    .attr('id', 'short_notes')

  d3.select(dom.window.document.body.querySelector('#score'))
    .append('g')
    .attr('id', 'air_notes')

  sus.shortNotes.filter(note => [1,5].includes(note.lane_type)).forEach(note => {
    const x_pos = note.lane * 16 + 8
    const y_pos = height - (note.measure * 768 + note.position)
    const h = note.lane_type == 1 ? 16 : note.width * 8

    switch (note.lane_type){
      case 1:
        drawNotes(dom,x_pos,y_pos,note.width,"#short_notes",short_color[note.note_type],true)
        break
      case 5:
        const air_height = 16
        const top_y = y_pos - 40
        const btm_y = top_y + air_height
        const togari = 8
        const vector = [1,2,7].includes(note.note_type) ? 0 : [3,6,8].includes(note.note_type) ? -8 : 8

        if ([1,3,4,7,8,9].includes(note.note_type))
          d3.select(dom.window.document.body.querySelector('#air_notes'))
            .append('path')
            .attr('d', `M${x_pos + 8 + vector},${top_y} L${x_pos + note.width * 8 + vector},${top_y - togari} L${x_pos - 8 + note.width * 16 + vector},${top_y} L${x_pos - 8 + note.width * 16},${btm_y} L${x_pos + note.width * 8 + vector / 2},${btm_y - togari} L${x_pos + 8},${btm_y} z`)
            .attr('fill', `${[1,3,4,7,8,9].includes(note.note_type) ? '#77ff33' : '#ff55ff'}`)
            .attr('stroke', '#fff')
            .attr('stroke-width', '2px')
        else
          d3.select(dom.window.document.body.querySelector('#air_notes'))
            .append('path')
            .attr('d', `M${x_pos + 8 + vector},${top_y - togari} L${x_pos + note.width * 8 + vector},${top_y} L${x_pos - 8 + note.width * 16 + vector},${top_y - togari} L${x_pos - 8 + note.width * 16 + vector / 2},${btm_y - togari} L${x_pos + note.width * 8},${btm_y} L${x_pos + 8 + vector / 2},${btm_y - togari} z`)
            .attr('fill', `${[1,3,4,7,8,9].includes(note.note_type) ? '#77ff33' : '#ff55ff'}`)
            .attr('stroke', '#fff')
            .attr('stroke-width', '2px')

        const short = sus.shortNotes
          .filter(n => n.lane_type === 1)
          .filter(n => n.lane === note.lane)
          .filter(n => n.measure === note.measure)
          .filter(n => n.position === note.position)
          .filter(n => n.width === note.width).length

        const long = sus.longNotes
          .filter(long => long.type !== 4)
          .reduce((list, long) => list.concat(long.notes),[])
          .filter(n => [1,3].includes(n.note_type))
          .filter(n => n.lane === note.lane)
          .filter(n => n.measure === note.measure)
          .filter(n => n.position === note.position)
          .filter(n => n.width === note.width).length

        if((0 < short || 0 < long) && ![7,8,9].includes(note.note_type)) break

        drawNotes(dom,x_pos,y_pos,note.width,"#air_notes",short_color[7])
        break
    }
  })

  return dom.window.document.body.innerHTML

  const images = []

  for(let count = 0; count < Math.ceil(sus.measure / 40); count++){
    let a = ((count+1) * 40) > sus.measure ? sus.measure : (count+1) * 40
    let b = count*40

    const canvas = createCanvas(272, 768 * (a - b) + 16)
    const ctx = canvas.getContext('2d')


    // AIR線
    sus.longNotes.filter(long => long.type === 4)
      .forEach(longNotes => {
        // 可視中継点で分割（色分けの為）
        const colorBlocks = longNotes.notes.reduce((list,note) => {
          list[list.length - 1].push(Object.assign({},note))
          if(note.note_type !== 3) return list
          list.push([])
          list[list.length - 1].push(Object.assign({},note))
          return list
        },[[]])

        colorBlocks.forEach(colorBlock => {

          // 不可視中継点で分割（ベジェ判定の為）
          const bases = colorBlock.reduce((list,note) => {
            list[list.length - 1].push(Object.assign({},note))
            if(![5].includes(note.note_type)) return list
            list.push([])
            list[list.length - 1].push(Object.assign({},note))
            return list
          },[[]])

          bases.forEach(notes => {

            ctx.beginPath()

            if([1,2,3].includes(notes[0].note_type)) notes[0].position += 8
            if([1,2,3].includes(notes[notes.length - 1].note_type)) notes[notes.length - 1].position -= 8

            if(notes.length > 2 && notes.some(n => n.note_type === 4)){
              const n1 = notes.map(n => ([n.lane * 16 + 8 + ( n.width * 16 ) / 2 - 3, n.measure * 768 + n.position + 8]))
              const n2 = notes.map(n => ([n.lane * 16 + 8 + ( n.width * 16 ) / 2 + 3, n.measure * 768 + n.position + 8]))

              const curve1 = bezier(n1, 100)
              const curve2 = bezier(n2, 100)
              ctx.moveTo(curve1[0][0], curve1[0][1])
              for(let i = 1; i < curve1.length; i++)      ctx.lineTo(curve1[i][0], curve1[i][1])
              for(let i = curve2.length - 1; i >= 0; i--) ctx.lineTo(curve2[i][0], curve2[i][1])
            } else {
              ctx.moveTo(notes[0].lane * 16 + 8 + ( notes[0].width * 16 ) / 2 - 3, notes[0].measure * 768 + notes[0].position + 8)
              for(let i = 1; i < notes.length; i++) {
                ctx.lineTo(notes[i].lane * 16 + 8 + ( notes[i].width * 16 ) / 2 - 3, notes[i].measure * 768 + notes[i].position + 8)
                if([2,3].includes(notes[i].note_type)) ctx.lineTo(notes[i].lane * 16 + 8 + ( notes[i].width * 16 ) / 2 - 3, notes[i].measure * 768 + notes[i].position + 8)
              }
              for(let i = notes.length - 1; i >= 1; i--) {
                ctx.lineTo(notes[i].lane * 16 + 8 + ( notes[i].width * 16 ) / 2 + 3, notes[i].measure * 768 + notes[i].position + 8)
                if([2,3].includes(notes[i].note_type)) ctx.lineTo(notes[i].lane * 16 + 8 + ( notes[i].width * 16 ) / 2 + 3, notes[i].measure * 768 + notes[i].position + 8)
              }
              ctx.lineTo(notes[0].lane * 16 + 8 + ( notes[0].width * 16 ) / 2 + 3,notes[0].measure * 768 + notes[0].position + 8)
            }
            ctx.closePath()
            ctx.fillStyle = '#4cff51bb'
            ctx.fill()
          })
        })
      })

    // AIR ACTIONノーツ
    sus.longNotes.filter(long => long.type === 4).forEach(long => {
      long.notes.filter(note => ![1,4,5].includes(note.note_type))
        .forEach(note => {
          const x_pos = note.lane * 16 + 8
          const y_pos = note.measure * 768 + note.position

          ctx.drawImage(image[long.type].left   ,x_pos                                             ,y_pos )
          ctx.drawImage(image[long.type].center ,x_pos + 4 ,y_pos ,note.width * 16 - 8 ,16 )
          ctx.drawImage(image[long.type].right  ,x_pos + note.width * 16 - 4                       ,y_pos )
        })
    })

    images.push(canvas.toDataURL())
  }
  return dom.window.document.body.innerHTML
}

function drawNotes(dom,x,y,width,parent,color,line) {
  const group = d3.select(dom.window.document.body.querySelector(parent))
    .append('g')
    .attr('class', 'notes')

  group.append('rect')
    .attr('x', x)
    .attr('y', y - 16)
    .attr('rx', '4px')
    .attr('ry', '4px')
    .attr('width', width * 16)
    .attr('height', `16px`)
    .attr('fill', color)
    .attr('stroke', '#fff')
    .attr('stroke-width', '3px')

  if(!line) return
  group.append('path')
    .attr('d', `M${x + 8},${y - 8} L${x + width * 16 - 8},${y - 8}`)
    .attr('stroke', '#fff')
    .attr('stroke-width', '3px')
}
