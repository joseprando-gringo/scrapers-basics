import express, { json } from 'express';
import { mgCnhHandler } from './mg';

// process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const app = express();

app.post('/cnh/mg', json(), mgCnhHandler);

app.listen(3000, () => console.log('servidor iniciado na porta 3000'));
