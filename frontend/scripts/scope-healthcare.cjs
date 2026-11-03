const fs=require('fs'),postcss=require('../node_modules/postcss');
const files=['base.css','components.css','responsive.css','application.css'];
const root=postcss.parse(files.map(n=>fs.readFileSync(__dirname+'/../src/styles/'+n,'utf8')).join('\n'));
root.walkRules(rule=>{
 let parent=rule.parent;while(parent){if(parent.type==='atrule'&&parent.name.endsWith('keyframes'))return;parent=parent.parent;}
 rule.selector=rule.selector.split(/,(?![^()]*\))/).map(s=>{s=s.trim();if(s===':root'||s==='html'||s==='body'||s==='html body')return '#legacy-root';if(s.includes(':root'))return s.replaceAll(':root','#legacy-root');return '#legacy-root '+s.replace(/^html\s+|^body\s+/,'');}).join(', ');
});
fs.writeFileSync(__dirname+'/../src/styles/scoped-healthcare.css',root.toString()+'\n'+fs.readFileSync(__dirname+'/../src/styles/template-healthcare.css','utf8'));
