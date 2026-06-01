// Normaliza e-mails com erros comuns de digitação (ex.: "@gmailcom" -> "@gmail.com")
// e remove espaços/diferenças de caixa.
export function normalizeEmail(input: string): string {
  let e = (input ?? "").trim().toLowerCase();
  // Corrige domínios comuns sem ponto
  const fixes: Array<[RegExp, string]> = [
    [/@gmailcom$/, "@gmail.com"],
    [/@gmail\.con$/, "@gmail.com"],
    [/@gmail\.co$/, "@gmail.com"],
    [/@hotmailcom$/, "@hotmail.com"],
    [/@hotmail\.con$/, "@hotmail.com"],
    [/@outlookcom$/, "@outlook.com"],
    [/@yahoocom$/, "@yahoo.com"],
    [/@yahoo\.con$/, "@yahoo.com"],
    [/@icloudcom$/, "@icloud.com"],
  ];
  for (const [re, rep] of fixes) e = e.replace(re, rep);
  return e;
}
