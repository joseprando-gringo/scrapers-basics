import fs from 'fs';
import { load } from 'cheerio';

// Script de teste para capturar os campos direto do HTML salvo
async function debitosMain() {
  const $ = load(fs.readFileSync('./DIA4391/debitos.html'));

  const renavam = $('#conteudoPaginaPlaceHolder_txtRenavam').text().trim();
  const placa = $('#conteudoPaginaPlaceHolder_txtPlaca').text().trim();
  const marcaModelo = $('#conteudoPaginaPlaceHolder_txtMarcaModelo').text().trim();
  const faixaIpva = $('#conteudoPaginaPlaceHolder_txtFaixaIPVA').text().trim();
  const anoFabricao = $('#conteudoPaginaPlaceHolder_txtAnoFabric').text().trim();

  const multasButton = $('#ctl00$conteudoPaginaPlaceHolder$btnDetalharMultas');
  if (multasButton) {
    console.log('tem multas')
  }

  console.log({
    veiculo: {
      renavam,
      placa,
      marcaModelo,
      faixaIpva,
      anoFabricao
    }
  })
}

// async function multasMain() {
//   const $ = load(fs.readFileSync('./DIA4391/multas.html'));
// }

debitosMain();