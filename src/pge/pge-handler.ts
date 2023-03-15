import axios from 'axios';
import { RequestHandler } from 'express';
import { Cookie } from 'tough-cookie';
import { load } from 'cheerio';
import fs from 'fs';
import pRetry from 'p-retry';

import { getReCaptchaV2Response } from '../utils/captcha';
import { errorRequestHandler } from '@/error-request-handler';

const GARE_LIQUIDACAO_URL = 'https://www.dividaativa.pge.sp.gov.br/sc/pages/pagamento/gareLiquidacao.jsf';

const getFirstPageCookieAndJSessionIdAndViewState = async (): Promise<{ cookie: string, jsessionId: string, viewState: string }> => {
  console.log('1. GET GARE_LIQUIDACAO_URL');
  const firstPageResponse = await axios.get(GARE_LIQUIDACAO_URL);

  // 2. Capturar Cookie (Set-Cookie)
  console.log('2. Capturar Cookie (Set-Cookie)');
  const cookie = (firstPageResponse.headers['set-cookie'] ?? [])
    .map(cookieStr => Cookie.parse(cookieStr))
    .map(cookie => cookie?.cookieString())
    .join('; ')
    .trim();
  const jsessionId = (firstPageResponse.headers['set-cookie'] ?? [])
    .map(cookieStr => Cookie.parse(cookieStr))
    .map(cookie => cookie?.value)[0];

  console.log('3. Capturar os Input Hidden');
  const $ = load(firstPageResponse.data);

  const viewState = $('#javax\\.faces\\.ViewState').val()?.toString()

  if (!cookie || !jsessionId || !viewState) {
    throw new Error('getFirstPageCookieAndJSessionIdAndViewState: cookie, jsessionId or viewState is empty, aborting');
  }

  return {
    cookie,
    jsessionId,
    viewState
  }
}

const makePostRequestWithEmptyValues = async (viewState: string, jsessionId: string, cookie: string): Promise<void> => {
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
  await axios.post(`${GARE_LIQUIDACAO_URL};jsessionid=${jsessionId}`, formPostParams, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': cookie,
    },
    maxRedirects: 0
  });
}

const makePostRequestWithCaptchaAndValues = async (renavam: string, jsessionId: string, viewState: string, cookie: string) => {
  console.log('5. Captcha');
  // TODO Remover após mostrar como funciona
  let captchaResponse: string | undefined
  if (Math.random() > 0.7) {
    captchaResponse = await getReCaptchaV2Response('6Le9EjMUAAAAAPKi-JVCzXgY_ePjRV9FFVLmWKB_', GARE_LIQUIDACAO_URL);
  } else {
    captchaResponse = '';
  }
  // const captchaResponse = await getReCaptchaV2Response('6Le9EjMUAAAAAPKi-JVCzXgY_ePjRV9FFVLmWKB_', GARE_LIQUIDACAO_URL);
  
  let location: string | undefined
  console.log('6. POST Consulta');
  try {
    const formPostResponse = await axios.post(`${GARE_LIQUIDACAO_URL};jsessionid=${jsessionId}`, new URLSearchParams({
      adesaoForm: 'adesaoForm',
      'adesaoForm:j_id70': 'RENAVAM',
      'adesaoForm:renavam': renavam,
      'adesaoForm:j_id76': 'Consultar',
      'g-recaptcha-response': captchaResponse,
      'javax.faces.ViewState': viewState
    }).toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': cookie
      },
      maxRedirects: 0
    });

    const $ = load(formPostResponse.data);
    // Validar se houve erro de captcha
    const errorMessageLabel = $('#messages > tbody > tr > td > span.rich-messages-label.messages-error-label');
    if (errorMessageLabel) {
      console.log('FormPostError', errorMessageLabel.text())
      throw new Error(errorMessageLabel.text().trim());
    }
  } catch (err: any) {
    if (err.response?.status === 302) {
      location = err.response.headers['location'];
    } else {
      throw err;
    }
  }

  if (!location) {
    throw new Error('makePostRequestWithCaptchaAndValues: location is empty, aborting')
  }
  
  const getLocationResponse = await axios.get(location.replace('http', 'https'), {
    headers: {
      Cookie: cookie
    }
  });

  const $ = load(getLocationResponse.data);
  const newViewState = $('#javax\\.faces\\.ViewState').val()?.toString()

  if (!newViewState) {
    throw new Error('makePostRequestWithCaptchaAndValues: viewState is empty, aborting');
  }

  const dataTablelLinks = $('#gareForm\\:dataTable\\:tb tr a').get();

  return {
    viewState: newViewState,
    formDataElementNames: dataTablelLinks.map(el => `gareForm:dataTable${$(el).attr('onclick')?.toString().split('gareForm:dataTable')[1].replace('\':\'', '')}`) || [],
    isMultiple: dataTablelLinks.length > 1
  }
}

const simulateBackButtonClick = async (viewState: string, cookie: string) => {
  let location: string | undefined;
  try {
    await axios.post('https://www.dividaativa.pge.sp.gov.br/sc/pages/pagamento/gareLiquidacao-pages/gareLiquidacaoDetalhe.jsf', new URLSearchParams({
      gareForm: 'gareForm',
      'gareForm:j_id80': 'Retornar',
      'javax.faces.ViewState': viewState
    }).toString(), {
      headers: {
        Cookie: cookie,
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
    throw new Error('goBack: location empty, aborting');
  }

  const getLocationResponse = await axios.get(location.replace('http', 'https'), {
    headers: {
      Cookie: cookie
    }
  });

  const $ = load(getLocationResponse.data);
  const newViewState = $('#javax\\.faces\\.ViewState').val()?.toString();
  if (!newViewState) {
    throw new Error('goBack: newViewState empty, aborting');
  }

  return {
    viewState: newViewState
  }
}

const makePostRequestToPrepareDownload = async (formDataElementName: string, viewState: string, cookie: string) => {
  let location: string | undefined;
  try {
    await axios.post('https://www.dividaativa.pge.sp.gov.br/sc/pages/pagamento/gareLiquidacao-pages/gareLiquidacaoLista.jsf', 
    new URLSearchParams({
      gareForm: 'gareForm',
      'javax.faces.ViewState': viewState,
      [formDataElementName]: formDataElementName
    }).toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Cookie: cookie
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
    throw new Error('makePostRequestToPrepareDownload: location empty, aborting');
  }

  const getLocationResponse = await axios.get(location.replace('http', 'https'), {
    headers: {
      Cookie: cookie
    }
  });

  const $ = load(getLocationResponse.data);
  const newViewState = $('#javax\\.faces\\.ViewState').val()?.toString();
  if (!newViewState) {
    throw new Error('makePostRequestToPrepareDownload: newViewState empty, aborting');
  }

  // TODO Capturar os dados em texto
  return {
    viewState: newViewState
  }
}

const getPdfBuffer = async (viewState: string, cookie: string) => {
  return (await axios.post<Buffer>('https://www.dividaativa.pge.sp.gov.br/sc/pages/pagamento/gareLiquidacao-pages/gareLiquidacaoDetalhe.jsf', 
    new URLSearchParams({
      gareForm: 'gareForm',
      'gareForm:j_id81': 'Gerar GARE de Liquidação',
      'javax.faces.ViewState': viewState,
    }).toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Cookie: cookie
      },
      responseType: 'arraybuffer'
    })).data
}

export const pgeHandler: RequestHandler = async (req, res) => {
  const { renavam } = req.body;

  let { cookie, jsessionId, viewState } = await getFirstPageCookieAndJSessionIdAndViewState();
  
  await makePostRequestWithEmptyValues(viewState, jsessionId, cookie);
  let formDataElementNames: string[];
  let isMultiple = false;
  
  const run = async () => makePostRequestWithCaptchaAndValues(renavam, jsessionId, viewState, cookie);
  ({ viewState, formDataElementNames, isMultiple } = await pRetry(run, {
    onFailedAttempt: async err => {
      console.log(err.message);
      if (!err.message?.includes('Recaptcha')) {
        throw err
      }
    },
    retries: 3
  }))
  // ({ viewState, formDataElementNames, isMultiple } = await makePostRequestWithCaptchaAndValues(renavam, jsessionId, viewState, cookie));
  
  if (!isMultiple) {
    console.log('7. POST Download PDF (Um boleto)');
    const response = await axios.post<Buffer>('https://www.dividaativa.pge.sp.gov.br/sc/pages/pagamento/gareLiquidacao-pages/gareLiquidacaoDetalhe.jsf', new URLSearchParams({
      gareForm: 'gareForm',
      'gareForm:j_id81': 'Gerar GARE de Liquidação',
      'javax.faces.ViewState': viewState
    }).toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Cookie: cookie
      },
      responseType: 'arraybuffer'
    });

    fs.writeFileSync('boleto.pdf', response.data);
    return res.status(200).send();
  }

  console.log('8. POST Download PDF (Múltiplos boletos)');
  for (const formDataElementName of formDataElementNames) {
    ({ viewState } = await makePostRequestToPrepareDownload(formDataElementName, viewState, cookie));
    const pdfBuffer = await getPdfBuffer(viewState, cookie);
    fs.writeFileSync(`${formDataElementName}.pdf`, pdfBuffer);

    ({ viewState } = await simulateBackButtonClick(viewState, cookie));
  }

  return res.status(200).send();
}