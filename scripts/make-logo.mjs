

import sharp from 'sharp'
import { readFileSync } from 'fs'

const svg = readFileSync('./public/icon.svg')
await sharp(svg).resize(180, 180).png().toFile('./public/apple-icon.png')
await sharp(svg).resize(512, 512).png().toFile('./public/logo.png')
console.log('Logo PNGs created')