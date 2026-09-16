const norm=v=>String(v||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const uniq=a=>[...new Set((a||[]).map(norm).filter(Boolean))];
const overlap=(a,b)=>{a=uniq(a);b=uniq(b);if(!a.length||!b.length)return null;const hit=a.filter(x=>b.some(y=>x.includes(y)||y.includes(x))).length;return hit/Math.max(a.length,b.length)};
const dimensionScore=(a,b)=>{const keys=['width','height','depth'];const pairs=keys.flatMap(k=>Number.isFinite(a?.[k])&&Number.isFinite(b?.[k])?[[a[k],b[k]]]:[]);if(!pairs.length)return null;return pairs.reduce((sum,[x,y])=>sum+Math.max(0,1-Math.abs(x-y)/Math.max(x,y)),0)/pairs.length};
const categoryScore=(a,b)=>a.category!=='unknown'&&b.category!=='unknown'?(a.category===b.category?1:0):null;
const featureScore=(a,b)=>overlap([...a.styleDescriptors,...a.notableFeatures,...a.construction],[...b.styleDescriptors,...b.notableFeatures,...b.construction]);
export function scoreProducts(original,candidate,{visualSimilarity=null}={}){
 const parts=[{key:'attributes',weight:35,value:featureScore(original,candidate)??categoryScore(original,candidate)},{key:'dimensions',weight:25,value:dimensionScore(original.dimensions,candidate.dimensions)},{key:'materials',weight:20,value:overlap([...original.materials,...original.construction],[...candidate.materials,...candidate.construction])},{key:'visual',weight:20,value:Number.isFinite(visualSimilarity)?Math.max(0,Math.min(1,visualSimilarity/100)):null}];
 const known=parts.filter(p=>p.value!==null);const available=known.reduce((n,p)=>n+p.weight,0);const similarity=available?Math.round(known.reduce((n,p)=>n+p.value*p.weight,0)/available*100):null;const confidence=Math.round(available*(candidate.evidence?.length?0.9:1));
 const matchType=similarity===null?'NO_SUPPORTED_MATCH':similarity>=85&&confidence>=75?'STRONG_MATCH':similarity>=65?'SIMILAR_ALTERNATIVE':'DESIGN_ALTERNATIVE';
 return {similarityScore:similarity,confidenceScore:confidence,matchType,dimensions:dimensionScore(original.dimensions,candidate.dimensions),materials:parts[2].value,attributes:parts[0].value,visual:parts[3].value};
}
const inch=n=>Number.isFinite(n)?`${n} in`:null;
export function explainComparison(original,alternative,score){
 const similarities=[],differences=[];
 if(original.category!=='unknown'&&original.category===alternative.category)similarities.push(`Both are presented as ${original.category==='lighting'?'lighting':original.category+'s'}.`);
 if(score.dimensions!==null){const a=original.dimensions,b=alternative.dimensions;const known=['width','height','depth'].filter(k=>Number.isFinite(a[k])&&Number.isFinite(b[k]));if(score.dimensions>=.9)similarities.push(`Known dimensions are close (${known.map(k=>`${k}: ${inch(a[k])} vs ${inch(b[k])}`).join('; ')}).`);else differences.push(`Known dimensions differ (${known.map(k=>`${k}: ${inch(a[k])} vs ${inch(b[k])}`).join('; ')}).`)}else differences.push('Comparable dimensions were not available from both sources.');
 const shared=uniq(original.materials).filter(x=>uniq(alternative.materials).some(y=>x.includes(y)||y.includes(x)));if(shared.length)similarities.push(`Both sources mention ${shared.slice(0,3).join(', ')}.`);else differences.push('The available sources do not establish matching primary materials.');
 const features=uniq([...original.styleDescriptors,...original.notableFeatures]).filter(x=>uniq([...alternative.styleDescriptors,...alternative.notableFeatures]).some(y=>x.includes(y)||y.includes(x)));if(features.length)similarities.push(`Shared described features include ${features.slice(0,3).join(', ')}.`);
 if(score.visual===null)differences.push('No independent visual-similarity score was used for this live comparison.');
 if(original.warranty&&alternative.warranty&&norm(original.warranty)!==norm(alternative.warranty))differences.push('The stated warranties differ.');else if(!original.warranty||!alternative.warranty)differences.push('Warranty coverage is not documented for both products.');
 differences.push('We found no evidence that these products share a manufacturer, factory, quality standard or origin.');
 return {similarities,differences:[...new Set(differences)]};
}
