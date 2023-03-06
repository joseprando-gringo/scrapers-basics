import { RequestHandler } from 'express';
import axios from 'axios';
import { Cookie } from 'tough-cookie';
import { load } from 'cheerio';
import { toCamelCase } from '../utils/toCamelCase';
import { getReCaptchaV2Response } from '../utils/captcha';

export const scVehicleSituationHandler: RequestHandler = async (req, res) => {
    const { plate, renavam } = req.body;

    const landingPageResponse = await axios.get(`https://consultas.detrannet.sc.gov.br/servicos/consultaveiculo.asp?placa=${plate}&renavam=${renavam}`, {
        headers: {
            // ':authority': 'consultas.detrannet.sc.gov.br',
            // ':method': 'GET',
            // ':path': `/servicos/consultaveiculo.asp?placa=${plate}&renavam=${renavam}`,
            // ':scheme': 'https',
            accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'accept-encoding': 'gzip, deflate, br',
            'accept-language': 'pt-BR,pt;q=0.9',
            referer: 'https://www.detran.sc.gov.br/',
            'sec-ch-ua': '"Chromium";v="110", "Not A(Brand";v="24", "Google Chrome";v="110"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'sec-fetch-dest': 'document',
            'sec-fetch-mode': 'navigate',
            'sec-fetch-site': 'cross-site',
            'sec-fetch-user': '?1',
            'upgrade-insecure-requests': '1',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
        }
    });

    const cookiesString = (landingPageResponse.headers['set-cookie'] ?? [])
    .map(cookieStr => Cookie.parse(cookieStr))
    .map(cookie => cookie?.cookieString())
    .join('; ')
    .trim();  

    console.log({cookiesString})

    // other recaptha
    const captchaStringParams = new URLSearchParams({
        ar:  '1',
        k:  '6Ld5HKUdAAAAAOdOTnRg21WOz1-gURJcDdf_uIhH',
        co: 'aHR0cHM6Ly9jb25zdWx0YXMuZGV0cmFubmV0LnNjLmdvdi5icjo0NDM.',
        hl: 'pt-BR',
        v: '8G7OPK94bhCRbT0VqyEVpQNj',
        size: 'invisible',
        sa: 'submit',
        // cb: 'ugs6fvlsb6se',
    }).toString()

    const firstCapthaResponse = await axios.get(` https://www.google.com/recaptcha/api2/anchor?${captchaStringParams}`, {
        headers: {
            accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'accept-encoding': 'gzip, deflate, br',
            'accept-language': 'pt-BR,pt;q=0.9',
            referer: 'https://www.detran.sc.gov.br/',
            'sec-ch-ua': '"Chromium";v="110", "Not A(Brand";v="24", "Google Chrome";v="110"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'sec-fetch-dest': 'document',
            'sec-fetch-mode': 'navigate',
            'sec-fetch-site': 'cross-site',
            'sec-fetch-user': '?1',
            'upgrade-insecure-requests': '1',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
        }
    });

    console.log(({firstCapthaResponse: firstCapthaResponse.data }))


    const captchaResponse = await getReCaptchaV2Response(
        '6Ld5HKUdAAAAAOdOTnRg21WOz1-gURJcDdf_uIhH',
        `https://consultas.detrannet.sc.gov.br/servicos/consultaveiculo.asp?placa=${plate}&renavam=${renavam}`,
        'ReCaptchaV2Invisible'
      );
  
    console.log({captchaResponse})

    const queryStringParams = new URLSearchParams({
        'placa': plate,
        'renavam': renavam,
        'g-recaptcha-response': captchaResponse,
        'modo': 'C',
    }).toString()

    console.log({queryStringParams})


    const secondPageResponse = await axios.get(`https://consultas.detrannet.sc.gov.br/servicos/consultaveiculo.asp?${queryStringParams}`, {
        headers: {
            // ':authority': 'consultas.detrannet.sc.gov.br',
            // ':method': 'GET',
            // ':path': `/servicos/consultaveiculo.asp?${queryStringParams}`,
            // ':scheme': 'https',
            accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'accept-encoding': 'gzip, deflate, br',
            'accept-language': 'pt-BR,pt;q=0.9',
            cookie: cookiesString,
            referer: `https://consultas.detrannet.sc.gov.br/servicos/consultaveiculo.asp?placa=${plate}&renavam=${renavam}`,
            'sec-ch-ua': '"Chromium";v="110", "Not A(Brand";v="24", "Google Chrome";v="110"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'sec-fetch-dest': 'document',
            'sec-fetch-mode': 'navigate',
            'sec-fetch-site': 'same-origin',
            'sec-fetch-user': '?1',
            'upgrade-insecure-requests': '1',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
        }
    });
  
    return res.status(secondPageResponse.status).send(secondPageResponse.data);
}

