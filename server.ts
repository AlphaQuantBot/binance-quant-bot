import express from 'express';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createObservationApi} from './src/observation/api';

const directory=path.dirname(fileURLToPath(import.meta.url));
const app=express();
app.disable('x-powered-by');
app.use('/api',createObservationApi());
if(process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(directory,'dist')));
  app.get('*',(_req,res)=>res.sendFile(path.join(directory,'dist/index.html')));
} else {
  const {createServer}=await import('vite');
  const vite=await createServer({server:{middlewareMode:true},appType:'spa'});
  app.use(vite.middlewares);
}
const port=Number(process.env.PORT || 3000);
app.listen(port,'127.0.0.1',()=>console.log('AlfaQuant observation terminal: http://127.0.0.1:'+port));
