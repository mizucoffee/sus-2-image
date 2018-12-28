const SusAnalyzer = require('sus-analyzer')
const bezier = require('simple-bezier')
const sharp = require('sharp')
const builder = require('xmlbuilder')

const short_color = {1: '#FF3333', 2: '#FFFF33', 3: '#33CCCC', 4: '#0033FF',5: '#FFFF33', 6: '#FFFF33', 7: '#77FF33'}
const long_color = {2: '#FFA500', 3: '#0033FF'}

module.exports.getImage = raw_sus => genSvg(raw_sus).end({ pretty: true, indent: '  ', newline: '\n', allowEmpty: false, spacebeforeslash: '' })

module.exports.getImages = raw_sus => {
  const svg = genSvg(raw_sus)
  const base = svg.children.filter(e => e.name === 'g')[0]
  const measure = (Number(svg.attributes.height.value.slice(0,-2)) - 32) / 768

  const images = []

  base.att('clip-path', 'url(#clip)')
  svg.att('height', '768px')
  for (var i = 0; i < measure; i++) {
    base.att('transform', `translate(0, ${-32 - 768 * i})`)
    const clip = svg.ele('clipPath', { id: 'clip' })
    clip.ele('rect', {x: 0, y: 32 + 768 * i , width: 272, height: 768})

    images.push(svg.end({ pretty: true, indent: '  ', newline: '\n', allowEmpty: false, spacebeforeslash: '' }))

    clip.remove()
    base.removeAttribute('transform')
  }
  return images.reverse()
}

function genSvg(raw_sus) {
  const sus = SusAnalyzer.getData(raw_sus)
  const height = 768 * sus.measure + 32

  const svg = builder.begin().ele('svg', { xmlns: 'http://www.w3.org/2000/svg', version: '1.1', width: '272px', height: `${height}px` })
  svg.ele('linearGradient', {id: 'hold', x1:'0', y1: '0', x2: '0', y2: '1'})
    .ele('stop', {'offset': '0%'  , 'stop-color': '#FF4CE1', 'stop-opacity': '0.7'}).up()
    .ele('stop', {'offset': '25%' , 'stop-color': '#F6FF4C', 'stop-opacity': '0.7'}).up()
    .ele('stop', {'offset': '75%' , 'stop-color': '#F6FF4C', 'stop-opacity': '0.7'}).up()
    .ele('stop', {'offset': '100%', 'stop-color': '#FF4CE1', 'stop-opacity': '0.7'}).up()
  svg.ele('linearGradient', {id: 'slide', x1:'0', y1: '0', x2: '0', y2: '1'})
    .ele('stop', {'offset': '0%'  , 'stop-color': '#FF4CE1', 'stop-opacity': '0.7'}).up()
    .ele('stop', {'offset': '25%' , 'stop-color': '#4CD5FF', 'stop-opacity': '0.7'}).up()
    .ele('stop', {'offset': '75%' , 'stop-color': '#4CD5FF', 'stop-opacity': '0.7'}).up()
    .ele('stop', {'offset': '100%', 'stop-color': '#FF4CE1', 'stop-opacity': '0.7'}).up()

  sus.shortNotes = sus.shortNotes.map(note => ({...note, position: note.position + 8}))
  sus.longNotes = sus.longNotes.map(long => ({...long, notes: long.notes.map(note => ({...note, position: note.position + 8}))}))

  const score = svg.ele('g', {id: 'score'})
  const base = score.ele('g', {id: 'base'})

  // ベース描画
  base.ele('rect', {id: 'base_black', x: '0', y: '0', width: '272px', height: `${height}px`, fill: '#000000'})

  // レーン描画
  const lane_line = base.ele('g', {id: 'lane_line'})
  for(let i = 0; i <= 8; i++)
    lane_line.ele('line', {x1: `${32*i + 8}px`, y1: '0px', x2: `${32*i + 8}px`, y2: `${height}px`, 'stroke-width': '1px', stroke: '#888888'})

  // 小節線描画
  const measure_line = base.ele('g', {id: 'measure_line'})
  for(let i = 0; i < sus.measure + 1; i++)
    measure_line.ele('line', {x1: `0px`, y1: `${height - (i * 768 + 16)}px`, x2: `272px`, y2: `${height - (i * 768 + 16)}px`, 'stroke-width': '2px', stroke: '#FFFFFF'})

  // 拍線描画
  const beat_line = base.ele('g', {id: 'beat_line'})
  sus.BEATs.forEach((beat, index) => {
    for(let i = 0; i < beat; i++)
      beat_line.ele('line', {x1: `0px`, y1: `${height - (768 * index + 768/beat*i + 16)}px`, x2: `272px`, y2: `${height - (768 * index + 768/beat*i + 16)}px`, 'stroke-width': '1px', stroke: '#FFFFFF'})
  })

  const notes = score.ele('g', {id: 'notes'})

  // HOLD SLIDE ベース
  const long = notes.ele('g', {id: 'long'})
  const long_base = long.ele('g', {id: 'long_base'})

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
        long_base.ele('path', {d: data, fill: `url(#${longNotes.type == 2 ? 'hold' : 'slide'})`})
      })
    })

  // SLIDE 線
  const long_line = long.ele('g', {id: 'long_line'})

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
        long_line.ele('path', {d: data, fill: `#4CD5FF`})
      })
    })

  // HOLD/SLIDE ノーツ
  const long_notes = long.ele('g', {id: 'long_notes'})

  sus.longNotes.filter(long => long.type !== 4).forEach(long => {  // AIR系でない
    long.notes.filter(note => ![4,5].includes(note.note_type)) // 不可視ノーツでない
      .forEach(note => {
        const x_pos = note.lane * 16 + 8
        const y_pos = height - (note.measure * 768 + note.position)

        drawNotes(long_notes,x_pos,y_pos,note.width, long_color[long.type],[1,4].includes(note.note_type))
      })
  })

  // 地を這うTAP系
  const short_notes = notes.ele('g', {id: 'short_notes'})
  const air = notes.ele('g', {id: 'air'})
  const air_notes = air.ele('g', {id: 'air_notes'})

  sus.shortNotes.filter(note => [1,5].includes(note.lane_type)).forEach(note => {
    const x_pos = note.lane * 16 + 8
    const y_pos = height - (note.measure * 768 + note.position)
    const h = note.lane_type == 1 ? 16 : note.width * 8

    switch (note.lane_type){
      case 1:
        drawNotes(short_notes,x_pos,y_pos,note.width, short_color[note.note_type],true)
        break
      case 5:
        const air_height = 16
        const top_y = y_pos - 40
        const btm_y = top_y + air_height
        const togari = 8
        const vector = [1,2,7].includes(note.note_type) ? 0 : [3,6,8].includes(note.note_type) ? -8 : 8

        if ([1,3,4,7,8,9].includes(note.note_type))
          air_notes.ele('path',{fill: `${[1,3,4,7,8,9].includes(note.note_type) ? '#77FF33' : '#FF55FF'}`, stroke: '#FFFFFF', 'stroke-width': '2px', d: `M${x_pos + 8 + vector},${top_y} L${x_pos + note.width * 8 + vector},${top_y - togari} L${x_pos - 8 + note.width * 16 + vector},${top_y} L${x_pos - 8 + note.width * 16},${btm_y} L${x_pos + note.width * 8 + vector / 2},${btm_y - togari} L${x_pos + 8},${btm_y} z`})
        else
          air_notes.ele('path',{fill: `${[1,3,4,7,8,9].includes(note.note_type) ? '#77FF33' : '#FF55FF'}`, stroke: '#FFFFFF', 'stroke-width': '2px', d: `M${x_pos + 8 + vector},${top_y - togari} L${x_pos + note.width * 8 + vector},${top_y} L${x_pos - 8 + note.width * 16 + vector},${top_y - togari} L${x_pos - 8 + note.width * 16 + vector / 2},${btm_y - togari} L${x_pos + note.width * 8},${btm_y} L${x_pos + 8 + vector / 2},${btm_y - togari} z`})

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

        drawNotes(air_notes,x_pos,y_pos,note.width, short_color[7])
        break
    }
  })

  // AIR線
  const air_lines = air.ele('g', {id: 'air_lines'})

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
        long_base.ele('path', {d: data, fill: '#4CFF51', style: 'fill-opacity: 0.7'})
      })
    })

  // AIR ACTIONノーツ
  const air_action_notes = air.ele('g', {id: 'air_action_notes'})

  sus.longNotes.filter(long => long.type === 4).forEach(long => {
    long.notes.filter(note => ![1,4,5].includes(note.note_type))
      .forEach(note => {
        const x_pos = note.lane * 16 + 8
        const y_pos = height - (note.measure * 768 + note.position)

        drawNotes(air_action_notes,x_pos,y_pos,note.width, '#FF55FF')
      })
  })

  return svg
}

function drawNotes(parent,x,y,width,color,line) {
  const notes = parent.ele('g', {class: 'notes'})
  notes.ele('rect', {x: x+2, y: y - 16, rx: '4px', ry: '4px', width: `${width * 16 - 4}px`, height: '16px', fill: color, stroke: '#FFFFFF', 'stroke-width': '3px'})
  if(line) notes.ele('path', {d: `M${x + 8},${y - 8} L${x + width * 16 - 8},${y - 8}`, stroke: '#FFFFFF', 'stroke-width': '3px'})
}
