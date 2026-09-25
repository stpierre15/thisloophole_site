import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

// These deliberately depict a vehicle class, not a particular make or model.
// A research record must never borrow an approved model-specific render.
const profiles={
  suv:{roof:'M52 104 L86 63 Q98 52 123 50 L276 48 Q301 48 317 64 L350 102',window:'M91 102 L113 62 L278 60 Q296 60 306 73 L326 102 Z',rear:350},
  minivan:{roof:'M47 104 L80 62 Q90 50 112 49 L284 48 Q305 49 324 67 L353 103',window:'M85 102 L105 61 L283 60 Q301 61 315 76 L330 102 Z',rear:353},
  wagon:{roof:'M58 104 L98 72 Q108 61 132 60 L274 60 Q297 60 310 76 L341 103',window:'M103 102 L127 72 L273 72 Q291 72 302 83 L319 102 Z',rear:341},
  electric:{roof:'M53 104 L88 63 Q99 52 125 50 L279 49 Q302 50 317 67 L349 102',window:'M92 102 L114 63 L279 62 Q297 62 307 75 L325 102 Z',rear:349},
};
for(const [name,p] of Object.entries(profiles)){
  const battery=name==='electric';
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 240" role="img" aria-label="Generic ${name} structural diagram">
  <defs><linearGradient id="bg" x2="0" y2="1"><stop stop-color="#f3f4f3"/><stop offset="1" stop-color="#d9dcd9"/></linearGradient><linearGradient id="shell" x2="0" y2="1"><stop stop-color="#eef0ef" stop-opacity=".67"/><stop offset="1" stop-color="#aeb8b4" stop-opacity=".28"/></linearGradient><pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="#aeb6b2" stroke-width=".45" opacity=".45"/></pattern></defs>
  <rect width="400" height="240" fill="url(#bg)"/><rect width="400" height="240" fill="url(#grid)"/>
  <ellipse cx="201" cy="189" rx="171" ry="14" fill="#69716e" opacity=".15"/>
  <path d="M32 110 Q34 102 51 102 L${p.rear} 102 Q369 104 371 116 L376 153 Q376 163 365 165 H35 Q22 165 24 153 Z" fill="url(#shell)" stroke="#59645f" stroke-width="2"/>
  <path d="${p.roof}" fill="none" stroke="#59645f" stroke-width="2.5" stroke-linecap="round"/>
  <path d="${p.window}" fill="#72817b" opacity=".21" stroke="#59645f" stroke-width="2"/>
  <path d="M164 61 L164 103 M239 61 L239 103 M32 137 H373 M43 151 H361" fill="none" stroke="#59645f" stroke-width="1.7" opacity=".82"/>
  <path d="M105 113 v-18 q0-8 8-8 h11 q8 0 8 8 v18 h8 v28 h-43 v-28z M174 113 v-18 q0-8 8-8 h11 q8 0 8 8 v18 h8 v28 h-43 v-28z M244 113 v-18 q0-8 8-8 h11 q8 0 8 8 v18 h8 v28 h-43 v-28z" fill="#7d8983" opacity=".54" stroke="#4d5b55" stroke-width="1.4"/>
  <path d="M90 145 H307" stroke="#303d37" stroke-width="5" stroke-linecap="round"/>
  ${battery?'<rect x="110" y="147" width="184" height="17" rx="3" fill="#576a61" stroke="#293b32" stroke-width="1.5"/><path d="M132 150v11m34-11v11m34-11v11m34-11v11m34-11v11" stroke="#b6c7bd" stroke-width="1.2"/>':'<rect x="38" y="136" width="49" height="23" rx="4" fill="#697872" stroke="#3e4d46" stroke-width="1.5"/><path d="M45 142h35m-35 7h35m-35 7h35" stroke="#c4d0ca" stroke-width="1"/>'}
  <g fill="#303a35" stroke="#d7ddda" stroke-width="4"><circle cx="91" cy="165" r="25"/><circle cx="308" cy="165" r="25"/></g><g fill="#8c9992" stroke="#d7ddda" stroke-width="2"><circle cx="91" cy="165" r="10"/><circle cx="308" cy="165" r="10"/></g>
  <path d="M27 170 H374" stroke="#717b76" stroke-width="1" opacity=".6"/>
  <text x="24" y="219" fill="#58655e" font-family="Arial,sans-serif" font-size="12" letter-spacing="2">ILLUSTRATIVE CLASS DIAGRAM</text>
  </svg>`;
  writeFileSync(resolve(`assets/dealership/anonymous/class-${name}.svg`),svg);
}
