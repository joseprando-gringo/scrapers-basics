import fs from 'fs';
import { load } from 'cheerio';

// Script de teste para capturar os campos direto do HTML salvo
async function debitosMain() {
  const $ = load(fs.readFileSync('../DIA4391/debitos.html'));
  const marcaModelo = $('#conteudoPaginaPlaceHolder_txtMarcaModelo').text().trim();
  console.log({
    marcaModelo
  })
}

async function multasMain() {
  const $ = load(fs.readFileSync('../DIA4391/multas.html'));
}

debitosMain();