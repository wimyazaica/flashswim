import {cp,readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
const source=path.resolve('dist');
const destination=path.resolve(process.argv[2]||'../FLASH-SWIM-для-просмотра-с-видео');
if(destination===source||destination.startsWith(source+path.sep))throw new Error('Preview must be outside dist');
await mkdir(destination,{recursive:true});
await cp(source,destination,{recursive:true});
const playlist=JSON.stringify(JSON.parse(await readFile(path.join(source,'hero-media.json'),'utf8'))).replaceAll('<','\\u003c');
const index=await readFile(path.join(destination,'index.html'),'utf8');
const marker='<script src="hero-media.js" defer></script>';
if(!index.includes(marker))throw new Error('Playlist script was not found');
await writeFile(path.join(destination,'index.html'),index.replace(marker,`<script type="application/json" id="hero-media-data">${playlist}</script>\n  ${marker}`));
await writeFile(path.join(destination,'ПРОЧИТАЙТЕ.txt'),'\uFEFF'+[
  'FLASH SWIM — версия с видео',
  '',
  '1. Полностью распакуйте ZIP в отдельную папку.',
  '2. Откройте index.html двойным щелчком в Chrome, Edge или Firefox.',
  '',
  'Установка программ и запуск сервера не нужны.',
  'В архив включены видео тренировок, фотографии, шрифты и анимации.',
  'На первом экране видео справа, текст слева. Видео сменяется фотографиями.',
  'По умолчанию звук выключен. Кнопками можно включить звук, поставить на паузу или выбрать следующий материал.',
  'Если браузер запрещает автозапуск, разрешите воспроизведение для открытого файла.',
  'Для отзывов Яндекса и внешних ссылок на карты, Telegram и WhatsApp нужен интернет.',
  'Кнопки записи открывают настоящие контакты школы.',
  'Не открывайте index.html прямо внутри ZIP: сначала распакуйте все файлы.',
  ''
].join('\r\n'));
console.log(destination);
