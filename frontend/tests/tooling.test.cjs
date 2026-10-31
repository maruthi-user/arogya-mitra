const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawn,execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
test('development server serves ESM and CSS dependencies but rejects backend/private paths',async()=>{
  const child=spawn(process.execPath,[path.join(root,'scripts/dev-server.cjs'),'0'],{cwd:root,stdio:['ignore','pipe','pipe']});
  try{
    const url=await new Promise((resolve,reject)=>{
      let output='';const timeout=setTimeout(()=>reject(new Error('Server startup timed out: '+output)),10000);
      child.stdout.on('data',chunk=>{output+=chunk;const match=output.match(/http:\/\/localhost:(\d+)/);if(match){clearTimeout(timeout);resolve('http://127.0.0.1:'+match[1]);}});
      child.once('exit',code=>{clearTimeout(timeout);reject(new Error('Server exited: '+code));});
    });
    for(const file of ['/','/src/app/main.js','/src/styles/index.css','/src/styles/components.css','/src/styles/responsive.css']){
      const response=await fetch(url+file);assert.equal(response.status,200,file);
    }
    const module=await fetch(url+'/src/app/bootstrap.js');assert.match(module.headers.get('content-type'),/javascript/);
    for(const file of ['/backend/pom.xml','/.env','/.git/config','/package.json','/scripts/dev-server.cjs','/src/../package.json'])assert.equal((await fetch(url+file)).status,404,file);
  }finally{child.kill();}
});
test('frontend build uses APIs and includes the logo and full module graph only',()=>{
  execFileSync(process.execPath,[path.join(root,'scripts/build.cjs')],{cwd:root});
  const dist=path.join(root,'dist');
  assert.match(fs.readFileSync(path.join(dist,'index.html'),'utf8'),/type="module"/);
  assert.match(fs.readFileSync(path.join(dist,'src/config/runtime-config.js'),'utf8'),/"dataMode":"api"/);
  assert.ok(fs.existsSync(path.join(dist,'assets/images/arogya-mitra-logo.png')));
  assert.equal(fs.existsSync(path.join(dist,'src/services/demo')),false);
  for(const name of ['backend','.env','package.json','tests','scripts'])assert.equal(fs.existsSync(path.join(dist,name)),false,name);
  const visited=new Set();
  function visit(file){
    if(visited.has(file))return;visited.add(file);
    const code=fs.readFileSync(file,'utf8');
    for(const match of code.matchAll(/from\s+['"]([^'"]+)['"]/g))visit(path.resolve(path.dirname(file),match[1]));
  }
  visit(path.join(dist,'src/app/main.js'));assert.ok(visited.size>25);
});
