import axios from 'axios';

export async function getReCaptchaV2Response (googleSiteKey: string, pageUrl: string): Promise<string> {
  return (await axios.post('https://k8s.gringo.com.vc/captcha-service-v2/v1/captcha', {
    type: 'ReCaptchaV2',
    args: {
      googleSiteKey,
      pageUrl
    }
  }, {
    headers: {
      Authorization: 'Api-Key ' // 9810abe7-c758-4b9d-a56e-a806b43494d3
    }
  })).data.response;
}