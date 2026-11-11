#!/bin/sh
# Re-export palettes and crest glyphs for the website after editing src/engine/themes.js
node -e "
const SERIF='Cinzel',SANS='Barlow Condensed',TECH='Orbitron',BOLD='Bebas Neue',H=1080,W=1920,P0=7.5;
$(cat src/engine/themes.js)
const o={};for(const[k,v]of Object.entries(THEMES))o[k]={metal:v.metal,hi:v.hi,mid:v.mid,glow:v.glow,flash:v.flash,ink:v.ink,nicheTop:v.nicheTop,hot:v.hot,font:v.disp,weight:v.dw,glyph:v.glyph};
require('fs').writeFileSync('site/data/themes.json',JSON.stringify(o));console.log(Object.keys(o).length,'themes exported')"
