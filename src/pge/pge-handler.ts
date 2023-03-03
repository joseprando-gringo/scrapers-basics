import axios from 'axios';
import { RequestHandler } from 'express';
import { Cookie } from 'tough-cookie';
import { load } from 'cheerio';

import { getReCaptchaV2Response } from '../utils/captcha';

const GARE_LIQUIDACAO_URL = 'https://www.dividaativa.pge.sp.gov.br/sc/pages/pagamento/gareLiquidacao.jsf';

export const pgeHandler: RequestHandler = async (req, res) => {
  const { renavam } = req.body;

 
  // 1. GET gareLiquidacao
  const firstPageResponse = await axios.get(GARE_LIQUIDACAO_URL);

  // 2. Capturar Cookie (Set-Cookie)
  console.log('2. Capturar Cookie (Set-Cookie)');
  const cookiesString = (firstPageResponse.headers['set-cookie'] ?? [])
    .map(cookieStr => Cookie.parse(cookieStr))
    .map(cookie => cookie?.cookieString())
    .join('; ')
    .trim();  
  const jsessionId = (firstPageResponse.headers['set-cookie'] ?? [])
    .map(cookieStr => Cookie.parse(cookieStr))
    .map(cookie => cookie?.value)[0];
  
  console.log(jsessionId)

  console.log('3. Capturar os Input Hidden');
  let $ = load(firstPageResponse.data);

  let viewState = $('#javax\\.faces\\.ViewState').val()?.toString() ?? ''
  console.log(viewState);

  console.log('4. POST Vazio');
  let formPostParams = new URLSearchParams({
    'AJAXREQUEST': '_viewRoot',
    adesaoForm: 'adesaoForm',
    'adesaoForm:cdaEtiqueta': '',
    'g-recaptcha-response': '',
    'javax.faces.ViewState': viewState,
    'adesaoForm:j_id70': 'RENAVAM',
    'adesaoForm:j_id74': 'adesaoForm:j_id74',
    ajaxSingle: 'adesaoForm:j_id70',
    '': ''
  }).toString()
  let formPostResponse = await axios.post(`${GARE_LIQUIDACAO_URL};jsessionid=${jsessionId}`, formPostParams, {
    headers: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept-Language': 'pt-BR,pt;q=0.9',
      'Cache-Control': 'max-age=0',
      'Connection': 'keep-alive',
      // 'Content-Length: 793
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': cookiesString,
      'Host': 'www.dividaativa.pge.sp.gov.br',
      'Origin': 'https://www.dividaativa.pge.sp.gov.br',
      'Referer': 'https://www.dividaativa.pge.sp.gov.br/sc/pages/pagamento/gareLiquidacao.jsf',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'same-origin',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36',
      'sec-ch-ua': '"Not_A Brand";v="99", "Google Chrome";v="109", "Chromium";v="109"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"'

      // Cookie: cookiesString
    },
    maxRedirects: 0
  });

  console.log('4. Captcha');
  const captchaResponse = await getReCaptchaV2Response('6Le9EjMUAAAAAPKi-JVCzXgY_ePjRV9FFVLmWKB_', GARE_LIQUIDACAO_URL);
  console.log(captchaResponse);
  
  let location: string | undefined
  console.log('4. POST Consulta');
  formPostParams = new URLSearchParams({
    adesaoForm: 'adesaoForm',
    'adesaoForm:j_id70': 'RENAVAM',
    'adesaoForm:renavam': renavam,
    'adesaoForm:j_id76': 'Consultar',
    'g-recaptcha-response': captchaResponse,
    'javax.faces.ViewState': viewState
  }).toString()
  try {
    formPostResponse = await axios.post(`${GARE_LIQUIDACAO_URL};jsessionid=${jsessionId}`, formPostParams, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'pt-BR,pt;q=0.9',
        'Cache-Control': 'max-age=0',
        'Connection': 'keep-alive',
        // 'Content-Length: 793
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': cookiesString,
        'Host': 'www.dividaativa.pge.sp.gov.br',
        'Origin': 'https://www.dividaativa.pge.sp.gov.br',
        'Referer': 'https://www.dividaativa.pge.sp.gov.br/sc/pages/pagamento/gareLiquidacao.jsf',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36',
        'sec-ch-ua': '"Not_A Brand";v="99", "Google Chrome";v="109", "Chromium";v="109"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"'

        // Cookie: cookiesString
      },
      maxRedirects: 0
    });
  } catch (err: any) {
    if (err.response.status === 302) {
      location = err.response.headers['location'];
    } else {
      throw err;
    }
  }

  if (!location) {
    return res.status(500).send();
  }
  
  console.log(location);
  const primeiroRes = await axios.get(location.replace('http', 'https'), {
    headers: {
      Cookie: cookiesString
    }
  });

  $ = load(primeiroRes.data);
  viewState = $('#javax\\.faces\\.ViewState').val()?.toString() ?? ''
  

  const response = await axios.post<Buffer>('https://www.dividaativa.pge.sp.gov.br/sc/pages/pagamento/gareLiquidacao-pages/gareLiquidacaoDetalhe.jsf', new URLSearchParams({
    gareForm: 'gareForm',
    'gareForm:j_id81': 'Gerar GARE de Liquidação',
    'javax.faces.ViewState': viewState
  }).toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: cookiesString
    },
    responseType: 'arraybuffer'
  });

  console.log(response.headers);
  return res.status(200).contentType('application/pdf').send(response.data);

  // console.log(formPostResponse.headers);
  // console.log(formPostResponse.data);

  // return res.status(200).send(formPostResponse.data);
}