(function (root) {
  'use strict';
  const MAX_AMOUNT = 1000000000;
  const round = n => Math.round((n + Number.EPSILON) * 100) / 100;
  const ceil = n => Math.ceil(n * 100 - 1e-7) / 100;
  const floor = n => Math.floor(n * 100 + 1e-7) / 100;
  function parse(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
    let s = String(value).trim().replace(/^R\$\s*/, '').replace(/\s/g, '');
    if (!s || !/^-?[\d.,]+$/.test(s)) return NaN;
    if (s.includes(',')) {
      if (!/^-?(?:\d+|\d{1,3}(?:\.\d{3})+),\d+$/.test(s)) return NaN;
      s = s.replace(/\./g, '').replace(',', '.');
    } else if ((s.match(/\./g) || []).length > 1) {
      if (!/^-?\d{1,3}(?:\.\d{3})+$/.test(s)) return NaN;
      s = s.replace(/\./g, '');
    } else if (!/^-?\d+(?:\.\d+)?$/.test(s)) return NaN;
    return Number(s);
  }
  function validate(input) {
    const errors = {};
    if (!['cost', 'base', 'inverse'].includes(input.mode)) errors.mode = 'Escolha um modo de cálculo válido.';
    for (const [key, name] of [['icms', 'ICMS'], ['cbs', 'CBS'], ['ibs', 'IBS']]) {
      if (!Number.isFinite(input[key]) || input[key] < 0 || input[key] > 100 || (key === 'icms' && input[key] === 100))
        errors[key] = `${name}: informe uma alíquota entre 0% e ${key === 'icms' ? 'menos de 100%' : '100%'}.`;
    }
    if (!Number.isFinite(input.margin) || input.margin < 0 || input.margin >= 100) errors.margin = 'Informe uma margem de 0% a menos de 100%.';
    const amountName = input.mode === 'base' ? 'Base sem tributos' : 'Custo líquido';
    if (!Number.isFinite(input.amount) || input.amount < 0 || input.amount > MAX_AMOUNT || (input.mode !== 'inverse' && input.amount === 0))
      errors.amount = `${amountName}: informe ${input.mode === 'inverse' ? 'zero ou ' : ''}um valor positivo até R$ 1 bilhão.`;
    if (input.mode === 'inverse' && (!Number.isFinite(input.price) || input.price <= 0 || input.price > MAX_AMOUNT)) errors.price = 'Informe um preço de venda positivo até R$ 1 bilhão.';
    return errors;
  }
  function taxes(price, icms, cbs, ibs) {
    const icmsValue = round(price * icms);
    const base = (price - icmsValue) / (1 + cbs + ibs);
    const cbsValue = round(base * cbs);
    const ibsValue = round(base * ibs);
    const totalTaxes = round(icmsValue + cbsValue + ibsValue);
    const net = round(price - totalTaxes);
    return { price, icmsValue, cbsValue, ibsValue, base, totalTaxes, net };
  }
  function calculate(input) {
    const errors = validate(input);
    if (Object.keys(errors).length) return { ok: false, errors };
    const i = input.icms / 100, c = input.cbs / 100, b = input.ibs / 100, m = input.margin / 100;
    const retained = (1 - i) / (1 + c + b);
    if (input.mode !== 'inverse' && m >= retained - 1e-12) return { ok: false, errors: { margin: `Margem inviável: deve ser menor que ${(retained * 100).toLocaleString('pt-BR', { maximumFractionDigits: 4 })}% com estas alíquotas.` } };
    let cost = round(input.amount), exactPrice, result;
    if (input.mode === 'cost') {
      if (cost <= 0) return { ok: false, errors: { amount: 'Informe um custo de pelo menos R$ 0,01.' } };
      exactPrice = cost / (retained - m);
      if (!Number.isFinite(exactPrice) || exactPrice > MAX_AMOUNT) return { ok: false, errors: { margin: 'O preço calculado excede R$ 1 bilhão. Reduza o custo ou a margem.' } };
      let price = ceil(exactPrice);
      for (let attempt = 0; attempt < 10000; attempt++) {
        result = taxes(price, i, c, b);
        if (result.net - cost >= m * price - 1e-8) break;
        if (attempt === 9999 || price + .01 > MAX_AMOUNT) return { ok: false, errors: { margin: 'A margem está próxima demais do limite para um preço estável. Reduza a margem.' } };
        price = round(price + .01);
      }
    } else if (input.mode === 'base') {
      exactPrice = input.amount / retained;
      if (!Number.isFinite(exactPrice) || exactPrice > MAX_AMOUNT) return { ok: false, errors: { amount: 'A base gera um preço acima de R$ 1 bilhão. Reduza o valor.' } };
      result = taxes(round(exactPrice), i, c, b);
      if (result.price <= 0) return { ok: false, errors: { amount: 'Informe uma base que gere pelo menos R$ 0,01 de venda.' } };
      cost = floor(result.net - m * result.price);
      if (cost < 0) return { ok: false, errors: { margin: 'Esta meta supera a receita disponível após os tributos.' } };
    } else {
      exactPrice = round(input.price);
      if (exactPrice <= 0) return { ok: false, errors: { price: 'Informe um preço de pelo menos R$ 0,01.' } };
      result = taxes(exactPrice, i, c, b);
    }
    const profit = round(result.net - cost);
    return { ok: true, ...result, cost, profit, actualMargin: profit / result.price * 100,
      taxBurden: result.totalTaxes / result.price * 100, retained, exactPrice,
      breakEven: cost / retained, target: input.margin, mode: input.mode,
      inputBase: input.mode === 'base' ? input.amount : null };
  }
  const api = { calculate, parse, round, taxes, validate };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.ApoloCalculator = api;
})(typeof window !== 'undefined' ? window : globalThis);
