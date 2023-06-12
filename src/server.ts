import { app } from './app';

// Necessário pois o site não tem um certificado válido
// process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

app.listen(3001, () => console.log('servidor iniciado na porta 3001'));