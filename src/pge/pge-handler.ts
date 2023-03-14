import axios from 'axios';
import { RequestHandler } from 'express';
import { Cookie } from 'tough-cookie';
import { load } from 'cheerio';
import fs from 'fs';

import { getReCaptchaV2Response } from '../utils/captcha';

const GARE_LIQUIDACAO_URL = 'https://www.dividaativa.pge.sp.gov.br/sc/pages/pagamento/gareLiquidacao.jsf';

export const pgeHandler: RequestHandler = async (req, res) => {
  const { renavam } = req.body;

 
  // 1. GET gareLiquidacao
  console.log('1. GET GARE_LIQUIDACAO_URL');
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

  console.log('3. Capturar os Input Hidden');
  let $ = load(firstPageResponse.data);

  let viewState = $('#javax\\.faces\\.ViewState').val()?.toString() ?? ''

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
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': cookiesString,
    },
    maxRedirects: 0
  });

  console.log('5. Captcha');
  const captchaResponse = await getReCaptchaV2Response('6Le9EjMUAAAAAPKi-JVCzXgY_ePjRV9FFVLmWKB_', GARE_LIQUIDACAO_URL);
  
  let location: string | undefined
  console.log('6. POST Consulta');
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
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': cookiesString
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
  
  // console.log('location1', location);
  const primeiroRes = await axios.get(location.replace('http', 'https'), {
    headers: {
      Cookie: cookiesString
    }
  });

  $ = load(primeiroRes.data);
  viewState = $('#javax\\.faces\\.ViewState').val()?.toString() ?? ''

  // Se não encontrar gareForm\\:dataTable\\:tb, então é 1
  const dataTablelLinks = $('#gareForm\\:dataTable\\:tb tr a').get()
  if (!dataTablelLinks || dataTablelLinks.length === 0) {
    console.log('7. POST Download PDF (Um boleto)');
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

    fs.writeFileSync('teste.pdf', response.data);
    return res.status(200).contentType('application/pdf').send(response.data);
  }

  const formDataElements = dataTablelLinks.map(el => `gareForm:dataTable${$(el).attr('onclick')?.toString().split('gareForm:dataTable')[1].replace('\':\'', '')}`);

  console.log('8. POST Download PDF (Múltiplos boletos)');
  for (const formDataElement of formDataElements) {
    try {
      await axios.post('https://www.dividaativa.pge.sp.gov.br/sc/pages/pagamento/gareLiquidacao-pages/gareLiquidacaoLista.jsf', 
      new URLSearchParams({
        gareForm: 'gareForm',
        'javax.faces.ViewState': viewState,
        [formDataElement]: formDataElement
      }).toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Cookie: cookiesString
        },
        maxRedirects: 0
      })
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

    const formElementRes = await axios.get(location.replace('http', 'https'), {
      headers: {
        Cookie: cookiesString
      }
    });

    $ = load(formElementRes.data);
    viewState = $('#javax\\.faces\\.ViewState').val()?.toString() ?? ''

    const pdfBufferResponse = await axios.post<Buffer>('https://www.dividaativa.pge.sp.gov.br/sc/pages/pagamento/gareLiquidacao-pages/gareLiquidacaoDetalhe.jsf', 
    new URLSearchParams({
      gareForm: 'gareForm',
      'gareForm:j_id81': 'Gerar GARE de Liquidação',
      'javax.faces.ViewState': viewState,
    }).toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Cookie: cookiesString,
        Referer: location,
      },
      responseType: 'arraybuffer'
    })

    fs.writeFileSync(`${formDataElement}.pdf`, pdfBufferResponse.data);

    // Simula o botão voltar para navegarmos para o próximo boleto
    try {
      await axios.post('https://www.dividaativa.pge.sp.gov.br/sc/pages/pagamento/gareLiquidacao-pages/gareLiquidacaoDetalhe.jsf', new URLSearchParams({
        gareForm: 'gareForm',
        'gareForm:j_id80': 'Retornar',
        'javax.faces.ViewState': viewState
      }).toString(), {
        headers: {
          Cookie: cookiesString,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        maxRedirects: 0
      })
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

    const backButtonRes = await axios.get(location.replace('http', 'https'), {
      headers: {
        Cookie: cookiesString
      }
    });

    $ = load(backButtonRes.data);
    viewState = $('#javax\\.faces\\.ViewState').val()?.toString() ?? ''
  }

  return res.status(200).send();
}