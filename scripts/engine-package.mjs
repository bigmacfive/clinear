import { writeFileSync } from 'node:fs';
for (const folder of ['dist-engine', 'src-tauri/resources/engine']) {
  writeFileSync(`${folder}/package.json`, JSON.stringify({name:'clinear-engine',private:true,type:'module'}));
}
