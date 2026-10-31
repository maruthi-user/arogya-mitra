const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL,fileURLToPath}=require('node:url');
const src=path.resolve(__dirname,'../../src');
function moduleLoader(context){
  const cache=new Map();
  function load(filename){
    const absolute=path.resolve(filename);
    if(!absolute.startsWith(src+path.sep))throw new Error('Module outside frontend source');
    if(cache.has(absolute))return cache.get(absolute);
    const module=new vm.SourceTextModule(fs.readFileSync(absolute,'utf8'),{context,identifier:pathToFileURL(absolute).href});
    cache.set(absolute,module);
    return module;
  }
  return async relative=>{
    const module=load(path.join(src,relative));
    if(module.status==='unlinked')await module.link((specifier,referencing)=>load(fileURLToPath(new URL(specifier,referencing.identifier))));
    if(module.status!=='evaluated')await module.evaluate();
    return module.namespace;
  };
}
module.exports={moduleLoader};
