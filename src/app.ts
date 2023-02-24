import { sefazHandler } from './sefaz/sefaz-handler';
import express, { json } from 'express';
import { mgCnhHandler } from './cnh/mg';
import { pgeHandler } from './pge/pge-handler';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const app = express();

app.post('/cnh/mg', json(), mgCnhHandler);
app.post('/pge', json(), pgeHandler);
app.post('/sefaz', json(), sefazHandler);

app.listen(3000, () => console.log('servidor iniciado na porta 3000'));
