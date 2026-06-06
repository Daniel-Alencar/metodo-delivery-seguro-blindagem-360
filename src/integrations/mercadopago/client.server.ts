import MercadoPagoConfig from 'mercadopago';

let _mp: MercadoPagoConfig | undefined;

export function getMpClient(): MercadoPagoConfig {
  if (!_mp) {
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!accessToken) throw new Error('MERCADOPAGO_ACCESS_TOKEN não configurado.');
    _mp = new MercadoPagoConfig({ accessToken, options: { timeout: 5000 } });
  }
  return _mp;
}
