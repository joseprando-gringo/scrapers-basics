import { sefazHandler } from './sefaz/sefaz-handler';
import express, { json } from 'express';
import { mgCnhHandler } from './cnh/mg';
import { pgeHandler } from './pge/pge-handler';
import { rjCnhHandler } from './cnh/rj';
import { scVehicleSituationHandler } from './vehicle-situation/sc';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const app = express();

app.post('/cnh/mg', json(), mgCnhHandler);
app.post('/cnh/rj', json(), rjCnhHandler);

app.post('/veiculo/sc', json(), scVehicleSituationHandler);

app.post('/pge', json(), pgeHandler);
app.post('/sefaz', json(), sefazHandler);

app.listen(3000, () => console.log('servidor iniciado na porta 3000'));
