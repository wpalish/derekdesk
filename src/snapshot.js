import {DatabaseSync,backup} from 'node:sqlite';
import {existsSync,mkdirSync,chmodSync,linkSync,unlinkSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';

export async function snapshot(source,destination){
  if(!existsSync(source))throw Error('Исходная база не найдена.');
  if(resolve(source)===resolve(destination)||existsSync(destination))throw Error('Выберите новый файл: существующие данные не перезаписываются.');
  const db=new DatabaseSync(source,{readOnly:true});
  let temporary;
  try{
    if(db.prepare('PRAGMA application_id').get().application_id!==0x44524b44||db.prepare('PRAGMA user_version').get().user_version!==1||db.prepare('PRAGMA quick_check').get().quick_check!=='ok')throw Error('Это не поддерживаемая исправная база DerekDesk.');
    mkdirSync(dirname(destination),{recursive:true,mode:0o700});
    temporary=`${destination}.${randomUUID()}.tmp`;
    await backup(db,temporary);chmodSync(temporary,0o600);
    linkSync(temporary,destination);unlinkSync(temporary);temporary=null;
  }finally{db.close();if(temporary&&existsSync(temporary))unlinkSync(temporary);}
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
  const [source,destination]=process.argv.slice(2);
  if(!source||!destination){console.error('node src/snapshot.js SOURCE.sqlite NEW_COPY.sqlite');process.exitCode=1;}
  else try{await snapshot(source,destination);console.log('Копия сохранена в новом файле. Для восстановления остановите сервер и укажите этот файл как DATABASE_PATH.');}catch(e){console.error(e.message);process.exitCode=1;}
}
