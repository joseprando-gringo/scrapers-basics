import express, { json } from 'express';

import { pgeHandler } from './pge/pge-handler';
import { sefazHandler } from './sefaz/handler-sefaz';

// Necessário pois o site não tem um certificado válido
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const app = express();

app.post('/pge', json(), pgeHandler);
app.post('/sefaz', json(), sefazHandler);

app.listen(3000, () => console.log('servidor iniciado na porta 3000'));