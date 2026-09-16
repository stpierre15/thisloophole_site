import test from 'node:test';
import assert from 'node:assert/strict';
import { priceGapEntries } from '../assets/price-gaps.mjs';
import { rankPriceGaps,validatePriceGaps } from '../assets/price-gap-engine.mjs';
import { renderPriceBoard,renderMonthlyPick } from '../assets/price-gap-view.mjs';
import { retiredTool } from '../lib/retired-api.mjs';

test('published ten-product board matches models and UPCs across 39 orderable offers',()=>{
 const board=validatePriceGaps(priceGapEntries);
 assert.equal(board.length,10);assert.equal(board.reduce((n,e)=>n+e.offers.length,0),39);
 assert.equal(board[0].id,'harlee');assert.equal(board[0].highest.price,174);assert.equal(board[0].lowest.price,116.93);
 assert.equal(board[0].savings,57.07);
 for(let i=1;i<board.length;i++)assert.ok(board[i-1].premium>=board[i].premium);
});
test('ranking uses the cheaper-price denominator and excludes wrong identities and unavailable offers',()=>{
 const e=structuredClone(priceGapEntries[0]),base=e.offers[0];
 e.offers=[{...base,store:'A',price:200},{...base,store:'B',price:100},{...base,store:'Unavailable',price:1,acceptsOrders:false},{...base,store:'Wrong model',model:'OTHER',price:2},{...base,store:'Wrong UPC',barcode:'OTHER',price:3},{...base,store:'Wrong currency',currency:'CAD',price:4}];
 const r=rankPriceGaps([e])[0];assert.equal(r.premium,100);assert.equal(r.percentLess,50);assert.equal(r.offers.length,2);assert.equal(r.lowest.store,'B');
 e.offers=[{...base,store:'A',price:100},{...base,store:'A',price:50}];assert.deepEqual(rankPriceGaps([e]),[]);
});
test('ranking preserves cents and sorts by unrounded premium',()=>{
 const e=structuredClone(priceGapEntries[0]),base=e.offers[0];
 const first={...e,id:'first',offers:[{...base,store:'A',price:199.99},{...base,store:'B',price:100}]};
 const second={...e,id:'second',offers:[{...base,store:'A',price:200},{...base,store:'B',price:100}]};
 const board=rankPriceGaps([first,second]);assert.equal(board[0].id,'second');assert.equal(board[1].savings,99.99);
});
test('static HTML exposes every source and shares the same monthly winner',()=>{
 const html=renderPriceBoard(priceGapEntries);assert.equal((html.match(/class="gap-item"/g)||[]).length,10);
 assert.ok(html.includes('889048561236'));assert.ok(html.includes('Product page contains backorder wording'));
 assert.ok(renderMonthlyPick(priceGapEntries).includes('$57.07'));
 const bad=structuredClone(priceGapEntries[0]);bad.name='<script>alert(1)</script>';assert.ok(renderPriceBoard([bad]).includes('&lt;script&gt;'));assert.ok(!renderPriceBoard([bad]).includes('<script>'));
});
test('paused tools return a clear retirement response without calling paid providers',async()=>{
 const r=retiredTool();assert.equal(r.status,410);assert.ok((await r.json()).error.includes('paused'));
});
