import { convert } from 'convert-svg-to-png'
import * as sharp from 'sharp'
import * as bezier from 'simple-bezier'
import * as SusAnalyzer from 'sus-analyzer'
import * as builder from 'xmlbuilder'

enum LongNoteType {
  START = 1,
  END = 2,
  STEP = 3,
  CTRL = 4,
  ISTEP = 5
}

enum AirNoteType {
  U = 1,
  D = 2,
  U_L = 3,
  U_R = 4,
  D_L = 5,
  D_R = 6,
  U_G = 7,
  U_G_L = 8,
  U_G_R = 9
}

interface ISusNotesAbs extends SusAnalyzer.ISusNotes {
  absY: number
  absMeasure: number
}

interface ILongPoint {
  x: number
  y: number
}

interface INote {
  g: {
    '@class': string
    path?: {
      '@d': string
      '@stroke': string
      '@stroke-width': string
    }
    rect: {
      '@fill': string
      '@height': string
      '@rx': string
      '@ry': string
      '@stroke': string
      '@stroke-width': string
      '@width': string
      '@x': number
      '@y': number
    }
  }
}

interface IAir {
  path: {
    '@d': string
    '@fill': string
    '@stroke': string
    '@stroke-width': string
  }
}

const ShortColor = new Map<number, string>([
  [1, '#FF3333'],
  [2, '#FFFF33'],
  [3, '#33CCCC'],
  [4, '#0033FF'],
  [5, '#FFFF33'],
  [6, '#FFFF33'],
  [7, '#77FF33']
])
const LongColor = new Map<number, string>([
  [2, '#FFA500'],
  [3, '#0033FF'],
  [4, '#FF55FF']
])

export async function getPNG(rawSus: string): Promise<Buffer> {
  return await convert(await getSVG(rawSus), {
    puppeteer: { args: ['--no-sandbox'] }
  })
}

export async function getPNGs(rawSus: string) {
  const png = await getPNG(rawSus)
  const process = []
  const image = await sharp(png)
  const meta = await image.metadata()
  if (meta.height == null) {
    return null
  }
  const m = Math.floor(meta.height / 768)
  for (let i = 0; i < m; i++) {
    process.push(
      image
        .extract({
          height: 768,
          left: 0,
          top: meta.height - (i + 1) * 768,
          width: 272
        })
        .toBuffer()
    )
  }
  process.push(
    image
      .extract({
        height: meta.height % 768,
        left: 0,
        top: 0,
        width: 272
      })
      .extend({
        bottom: 0,
        left: 0,
        right: 0,
        top: 768 - (meta.height % 768)
      })
      .toBuffer()
  )
  return await Promise.all(process)
}

export async function getSVG(rawSus: string) {
  const sus = SusAnalyzer.getScore(rawSus)

  const absMeasure: number[] = []
  let prev = 0
  for (let i = 0; i <= sus.measure; i++) {
    let abs = prev + 192 * sus.BEATs[i - 1] * (sus.BPMs[0] / sus.BPMs[i - 1])
    if (i === 0) {
      abs = 0
    }
    absMeasure.push(abs)
    prev = abs
  }
  const height = absMeasure[absMeasure.length - 1] + 32

  const svg = builder.begin().ele('svg', {
    height: `${height}px`,
    version: '1.1',
    width: '272px',
    xmlns: 'http://www.w3.org/2000/svg'
  })
  svg
    .ele('linearGradient', { id: 'hold', x1: '0', y1: '0', x2: '0', y2: '1' })
    .ele('stop', {
      offset: '0%',
      'stop-color': '#FF4CE1',
      'stop-opacity': '0.7'
    })
    .up()
    .ele('stop', {
      offset: '25%',
      'stop-color': '#F6FF4C',
      'stop-opacity': '0.7'
    })
    .up()
    .ele('stop', {
      offset: '75%',
      'stop-color': '#F6FF4C',
      'stop-opacity': '0.7'
    })
    .up()
    .ele('stop', {
      offset: '100%',
      'stop-color': '#FF4CE1',
      'stop-opacity': '0.7'
    })
    .up()
  svg
    .ele('linearGradient', { id: 'slide', x1: '0', y1: '0', x2: '0', y2: '1' })
    .ele('stop', {
      offset: '0%',
      'stop-color': '#FF4CE1',
      'stop-opacity': '0.7'
    })
    .up()
    .ele('stop', {
      offset: '25%',
      'stop-color': '#4CD5FF',
      'stop-opacity': '0.7'
    })
    .up()
    .ele('stop', {
      offset: '75%',
      'stop-color': '#4CD5FF',
      'stop-opacity': '0.7'
    })
    .up()
    .ele('stop', {
      offset: '100%',
      'stop-color': '#FF4CE1',
      'stop-opacity': '0.7'
    })
    .up()

  const score = svg.ele('g', { id: 'score' })
  const base = score.ele('g', { id: 'base' })

  // ベース描画
  base.ele('rect', {
    fill: '#000000',
    height: `${height}px`,
    id: 'base_black',
    width: '272px',
    x: '0',
    y: '0'
  })

  // レーン描画
  const laneLine = base.ele('g', { id: 'laneLine' })
  for (let i = 0; i <= 8; i++) {
    laneLine.ele('line', {
      stroke: '#888888',
      'stroke-width': '1px',
      x1: `${32 * i + 8}px`,
      x2: `${32 * i + 8}px`,
      y1: '0px',
      y2: `${height}px`
    })
  }

  // 小節線描画
  const measureLine = base.ele('g', { id: 'measureLine' })
  for (let i = 0; i <= sus.measure; i++) {
    measureLine.ele('line', {
      stroke: '#FFFFFF',
      'stroke-width': '2px',
      x1: `0px`,
      x2: `272px`,
      y1: `${height - absMeasure[i] - 16}px`,
      y2: `${height - absMeasure[i] - 16}px`
    })
  }

  // 拍線描画
  const beatLine = base.ele('g', { id: 'beatLine' })
  sus.BEATs.forEach((beat, mea) => {
    for (let i = 0; i < beat; i++) {
      beatLine.ele('line', {
        stroke: '#FFFFFF',
        'stroke-width': '1px',
        x1: `0px`,
        x2: `272px`,
        y1: `${height -
          (absMeasure[mea] +
            ((192 * sus.BEATs[mea] * (sus.BPMs[0] / sus.BPMs[mea])) / beat) *
              i +
            16)}px`,
        y2: `${height -
          (absMeasure[mea] +
            ((192 * sus.BEATs[mea] * (sus.BPMs[0] / sus.BPMs[mea])) / beat) *
              i +
            16)}px`
      })
    }
  })

  const shortAbs = (note: SusAnalyzer.ISusNotes) => ({
    absMeasure: absMeasure[note.measure],
    absY:
      height -
      (absMeasure[note.measure] +
        note.tick * (sus.BPMs[0] / sus.BPMs[note.measure])) -
      8,
    ...note,
    tick: note.tick + 8
  })

  const longAbs = (ln: SusAnalyzer.ISusNotes[]) =>
    ln.map(note => ({
      absMeasure: absMeasure[note.measure],
      absY:
        height -
        (absMeasure[note.measure] +
          note.tick * (sus.BPMs[0] / sus.BPMs[note.measure])) -
        8,
      ...note,
      tick: note.tick + 8
    }))

  const short: ISusNotesAbs[] = sus.shortNotes.map(shortAbs)
  const hold: ISusNotesAbs[][] = sus.holdNotes.map(longAbs)
  const slide: ISusNotesAbs[][] = sus.slideNotes.map(longAbs)
  const airAction: ISusNotesAbs[][] = sus.airActionNotes.map(longAbs)
  const airN: ISusNotesAbs[] = sus.airNotes.map(shortAbs)

  const long = score.ele('g', { id: 'long' })
  const notes = score.ele('g', { id: 'notes' })

  // HOLD/SLIDE ベース
  const longBase = long.ele('g', { id: 'longBase' })
  const longBaseHold = longBase.ele('g', { id: 'longBaseHold' })
  const longBaseSlide = longBase.ele('g', { id: 'longBaseSlide' })
  drawLongBase(hold).forEach(d =>
    longBaseHold.ele('path', { d, fill: 'url(#hold)' })
  )
  drawLongBase(slide).forEach(d =>
    longBaseSlide.ele('path', { d, fill: 'url(#slide)' })
  )

  // SLIDE 線
  const longLine = long.ele('g', { id: 'longLine' })
  drawLongLine(slide).forEach(d => longLine.ele('path', { d, fill: '#4CD5FF' }))

  // HOLD/SLIDE ノーツ
  const longNotes = long.ele('g', { id: 'longNotes' })
  const longNotesHold = longNotes.ele('g', { id: 'longNotesHold' })
  const longNotesSlide = longNotes.ele('g', { id: 'longNotesSlide' })
  drawLongNotes(hold).forEach(d => longNotesHold.ele(d))
  drawLongNotes(slide).forEach(d => longNotesSlide.ele(d))

  // 地を這うTAP系
  const shortNotes = notes.ele('g', { id: 'shortNotes' })
  drawShortNotes(short).forEach(d => shortNotes.ele(d))

  // AIRノーツ/地面付き
  const air = score.ele('g', { id: 'air' })
  const airNotes = air.ele('g', { id: 'airNotes' })
  const airGround = air.ele('g', { id: 'airGround' })
  drawAirNotes(airN).forEach(d => airNotes.ele(d))
  drawAirGround(short, hold, slide, airN).forEach(d => airGround.ele(d))

  // AIR ACTION 線
  const airActionLines = air.ele('g', { id: 'airActionLines' })
  drawLongLine(airAction).forEach(d =>
    airActionLines.ele('path', {
      d,
      fill: '#4CFF51',
      style: 'fill-opacity: 0.7'
    })
  )

  // AIR ACTION ノーツ
  const airActionNotes = air.ele('g', { id: 'airActionNotes' })
  drawLongNotes(airAction).forEach(d => airActionNotes.ele(d))

  return svg.end({
    allowEmpty: false,
    indent: '  ',
    newline: '\n',
    pretty: true,
    spacebeforeslash: ''
  })
}

function drawLongBase(laneNotes: ISusNotesAbs[][]): string[] {
  const d: string[] = []
  laneNotes.forEach(longNotes => {
    // 可視中継点で分割（色分けの為）
    const colorBlocks = longNotes.reduce(
      (list, note) => {
        list[list.length - 1].push({ ...note })
        if (note.noteType !== LongNoteType.STEP) {
          return list
        }
        list.push([])
        list[list.length - 1].push({ ...note })
        return list
      },
      [[]] as ISusNotesAbs[][]
    )

    colorBlocks.forEach(colorBlock => {
      // ノーツがある場合ベースの位置を8pxずらす
      if (
        [LongNoteType.START, LongNoteType.STEP].indexOf(
          colorBlock[0].noteType
        ) > -1
      ) {
        colorBlock[0].absY -= 8
      }
      if (
        [LongNoteType.END, LongNoteType.STEP].indexOf(
          colorBlock[colorBlock.length - 1].noteType
        ) > -1
      ) {
        colorBlock[colorBlock.length - 1].absY += 8
      }

      // 不可視中継点で分割（ベジェ判定の為）
      const bases = colorBlock.reduce(
        (list, note) => {
          list[list.length - 1].push({ ...note })
          if (note.noteType !== LongNoteType.ISTEP) {
            return list
          }
          list.push([])
          list[list.length - 1].push({ ...note })
          return list
        },
        [[]] as ISusNotesAbs[][]
      )

      const points = bases.reduce(
        (list, notes) => {
          if (
            notes.length > 2 &&
            notes.some(n => n.noteType === LongNoteType.CTRL)
          ) {
            // ベジェ
            const n1 = notes.map(n => [n.lane * 16 + 8 + 4, n.absY - 8])
            const n2 = notes.map(n => [
              n.lane * 16 + 8 + n.width * 16 - 4,
              n.absY - 8
            ])

            bezier(n1, 100).forEach((c: number[]) =>
              list[0].push({ x: c[0], y: c[1] })
            )
            bezier(n2, 100).forEach((c: number[]) =>
              list[1].push({ x: c[0], y: c[1] })
            )
          } else {
            // 直線
            notes.forEach(note => {
              list[0].push({
                x: note.lane * 16 + 8 + 4,
                y: note.absY - 8
              })
              list[1].push({
                x: note.lane * 16 + 8 + note.width * 16 - 4,
                y: note.absY - 8
              })
            })
          }
          return list
        },
        [[], []] as ILongPoint[][]
      )

      let data = 'M'

      points[0].forEach(point => (data += `${point.x} ${point.y} L`))
      points[1].reverse().forEach(point => (data += `${point.x} ${point.y} L`))

      d.push(data.slice(0, -1) + 'z')
    })
  })
  return d
}

function drawLongLine(laneNotes: ISusNotesAbs[][]): string[] {
  const d: string[] = []
  laneNotes.forEach(longNotes => {
    // 可視中継点で分割（色分けの為）
    const colorBlocks = longNotes.reduce(
      (list, note) => {
        list[list.length - 1].push({ ...note })
        if (note.noteType !== LongNoteType.STEP) {
          return list
        }
        list.push([])
        list[list.length - 1].push({ ...note })
        return list
      },
      [[]] as ISusNotesAbs[][]
    )

    colorBlocks.forEach(colorBlock => {
      // ノーツがある場合ベースの位置を8pxずらす
      if (
        [LongNoteType.START, LongNoteType.STEP].indexOf(
          colorBlock[0].noteType
        ) > -1
      ) {
        colorBlock[0].absY -= 8
      }
      if (
        [LongNoteType.END, LongNoteType.STEP].indexOf(
          colorBlock[colorBlock.length - 1].noteType
        ) > -1
      ) {
        colorBlock[colorBlock.length - 1].absY += 8
      }

      // 不可視中継点で分割（ベジェ判定の為）
      const bases = colorBlock.reduce(
        (list, note) => {
          list[list.length - 1].push({ ...note })
          if (note.noteType !== LongNoteType.ISTEP) {
            return list
          }
          list.push([])
          list[list.length - 1].push({ ...note })
          return list
        },
        [[]] as ISusNotesAbs[][]
      )

      const points = bases.reduce(
        (list, notes) => {
          if (notes.length > 2 && notes.some(n => n.noteType === 4)) {
            // ベジェ
            const n1 = notes.map(n => [
              n.lane * 16 + 8 + (n.width * 16) / 2 - 3,
              n.absY - 8
            ])
            const n2 = notes.map(n => [
              n.lane * 16 + 8 + (n.width * 16) / 2 + 3,
              n.absY - 8
            ])

            const b1: number[][] = bezier(n1, 100)
            const b2: number[][] = bezier(n2, 100)
            b1.forEach(c => list[0].push({ x: c[0], y: c[1] }))
            b2.forEach(c => list[1].push({ x: c[0], y: c[1] }))
          } else {
            // 直線
            notes.forEach(note => {
              list[0].push({
                x: note.lane * 16 + 8 + (note.width * 16) / 2 - 3,
                y: note.absY - 8
              })
              list[1].push({
                x: note.lane * 16 + 8 + (note.width * 16) / 2 + 3,
                y: note.absY - 8
              })
            })
          }
          return list
        },
        [[], []] as ILongPoint[][]
      )

      let data = 'M'

      points[0].forEach(point => (data += `${point.x} ${point.y} L`))
      points[1].reverse().forEach(point => (data += `${point.x} ${point.y} L`))

      d.push(data.slice(0, -1) + 'z')
    })
  })
  return d
}

function drawLongNotes(longNotes: ISusNotesAbs[][]): INote[] {
  const d: INote[] = []

  longNotes.forEach(notes => {
    notes
      .filter(note => {
        if (note.laneType === 4) {
          return (
            [LongNoteType.END, LongNoteType.STEP].indexOf(note.noteType) > -1
          )
        } else {
          return (
            [LongNoteType.CTRL, LongNoteType.ISTEP].indexOf(note.noteType) < 0
          )
        }
      }) // 不可視ノーツでない
      .forEach(note => {
        const xPos = note.lane * 16 + 8
        d.push(
          getNotes(
            xPos,
            note.absY,
            note.width,
            `${LongColor.get(note.laneType)}`,
            note.noteType === 1
          )
        )
      })
  })

  return d
}

function drawShortNotes(shortNotes: ISusNotesAbs[]): INote[] {
  return shortNotes.map(note =>
    getNotes(
      note.lane * 16 + 8,
      note.absY,
      note.width,
      ShortColor.get(note.noteType) as string,
      true
    )
  )
}

const AirUp = [
  AirNoteType.U,
  AirNoteType.U_L,
  AirNoteType.U_R,
  AirNoteType.U_G,
  AirNoteType.U_G_L,
  AirNoteType.U_G_R
]

function getVector(type: number) {
  switch (type) {
    case AirNoteType.U:
    case AirNoteType.D:
    case AirNoteType.U_G:
      return 0
    case AirNoteType.U_R:
    case AirNoteType.D_R:
    case AirNoteType.U_G_R:
      return 8
    case AirNoteType.U_L:
    case AirNoteType.D_L:
    case AirNoteType.U_G_L:
      return -8
    default:
      return 0
  }
}

function drawAirNotes(airNotes: ISusNotesAbs[]): IAir[] {
  const d: IAir[] = []

  airNotes.forEach(note => {
    const xPos = note.lane * 16 + 8

    const topY = note.absY - 40
    const btmY = topY + 16
    const togari = 8
    const vector = getVector(note.noteType)

    if (AirUp.indexOf(note.noteType) > -1) {
      d.push({
        path: {
          '@d': `M${xPos + 8 + vector},${topY} L${xPos +
            note.width * 8 +
            vector},${topY - togari} L${xPos -
            8 +
            note.width * 16 +
            vector},${topY} L${xPos - 8 + note.width * 16},${btmY} L${xPos +
            note.width * 8 +
            vector / 2},${btmY - togari} L${xPos + 8},${btmY} z`,
          '@fill': `${
            AirUp.indexOf(note.noteType) > -1 ? '#77FF33' : '#FF55FF'
          }`,
          '@stroke': '#FFFFFF',
          '@stroke-width': '2px'
        }
      })
    } else {
      d.push({
        path: {
          '@d': `M${xPos + 8 + vector},${topY - togari} L${xPos +
            note.width * 8 +
            vector},${topY} L${xPos - 8 + note.width * 16 + vector},${topY -
            togari} L${xPos - 8 + note.width * 16 + vector / 2},${btmY -
            togari} L${xPos + note.width * 8},${btmY} L${xPos +
            8 +
            vector / 2},${btmY - togari} z`,
          '@fill': `${
            AirUp.indexOf(note.noteType) > -1 ? '#77FF33' : '#FF55FF'
          }`,
          '@stroke': '#FFFFFF',
          '@stroke-width': '2px'
        }
      })
    }
  })
  return d
}

function drawAirGround(
  shortNotes: ISusNotesAbs[],
  holdNotes: ISusNotesAbs[][],
  slideNotes: ISusNotesAbs[][],
  airNotes: ISusNotesAbs[]
) {
  const d: INote[] = []
  airNotes.forEach(note => {
    const xPos = note.lane * 16 + 8

    const short = shortNotes
      .filter(n => n.lane === note.lane)
      .filter(n => n.measure === note.measure)
      .filter(n => n.tick === note.tick)
      .filter(n => n.width === note.width).length

    const long = holdNotes
      .concat(slideNotes)
      .reduce((list, l) => list.concat(l), [])
      .filter(n => n.noteType === LongNoteType.END)
      .filter(n => n.lane === note.lane)
      .filter(n => n.measure === note.measure)
      .filter(n => n.tick === note.tick)
      .filter(n => n.width === note.width).length

    if (
      [AirNoteType.U_G, AirNoteType.U_G_L, AirNoteType.U_G_R].indexOf(
        note.noteType
      ) > -1 ||
      0 < long ||
      0 === short
    ) {
      d.push(getNotes(xPos, note.absY, note.width, '#77FF33', false))
    }
  })
  return d
}

function getNotes(
  x: number,
  y: number,
  width: number,
  color: string,
  line: boolean
): INote {
  const d: INote = {
    g: {
      '@class': 'notes',
      rect: {
        '@fill': color,
        '@height': '16px',
        '@rx': '4px',
        '@ry': '4px',
        '@stroke': '#FFFFFF',
        '@stroke-width': '3px',
        '@width': `${width * 16 - 4}px`,
        '@x': x + 2,
        '@y': y - 16
      }
    }
  }
  if (line) {
    d.g.path = {
      '@d': `M${x + 8},${y - 8} L${x + width * 16 - 8},${y - 8}`,
      '@stroke': '#FFFFFF',
      '@stroke-width': '3px'
    }
  }
  return d
}
