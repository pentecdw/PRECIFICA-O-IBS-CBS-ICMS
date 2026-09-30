(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const calc = window.ApoloCalculator;
  const money = value => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const percent = value => value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
  const decimal = (value, digits = 2) => value.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  let tab = 'forward';
  let lastResult;
  let announceTimer;
  const setText = (id, value) => { $(id).textContent = value; };
  function currentInput() {
    return { mode: tab === 'inverse' ? 'inverse' : $('basis').value,
      amount: calc.parse($('amount').value), price: calc.parse($('price').value),
      icms: calc.parse($('icms').value), cbs: calc.parse($('cbs').value), ibs: calc.parse($('ibs').value), margin: calc.parse($('margin').value) };
  }
  function reflectMode() {
    const isInverse = tab === 'inverse';
    const isBase = !isInverse && $('basis').value === 'base';
    $('margin').disabled = isInverse;
    $('basis-field').hidden = isInverse;
    $('price-field').hidden = !isInverse;
    $('price').disabled = !isInverse;
    $('basis').disabled = isInverse;
    setText('amount-label', isBase ? 'Base sem tributos' : 'Custo líquido');
    setText('amount-help', isBase ? 'Valor antes de ICMS, CBS e IBS. O ganho sobre o custo define o custo líquido máximo que esta venda pode suportar.' : 'Aquisição menos créditos recuperáveis. Se o ERP já descontou os créditos, use o custo líquido informado.');
    setText('margin-label', isInverse ? 'Meta de ganho sobre o custo' : 'Ganho desejado sobre o custo');
    $('form-panel').setAttribute('aria-labelledby', isInverse ? 'tab-inverse' : 'tab-forward');
    for (const name of ['forward', 'inverse']) {
      const selected = name === tab;
      $('tab-' + name).setAttribute('aria-selected', String(selected));
      $('tab-' + name).tabIndex = selected ? 0 : -1;
      $('tab-' + name).classList.toggle('active', selected);
    }
  }
  function render() {
    reflectMode();
    const input = currentInput();
    const r = calc.calculate(input);
    lastResult = r;
    for (const key of ['amount', 'price', 'icms', 'cbs', 'ibs', 'margin']) {
      const message = r.ok ? '' : r.errors[key] || '';
      $(key).setAttribute('aria-invalid', String(!!message));
      $(key + '-error').hidden = !message;
      setText(key + '-error', message);
    }
    $('invalid').hidden = r.ok;
    $('valid-result').hidden = !r.ok;
    clearTimeout(announceTimer);
    if (!r.ok) {
      setText('invalid-message', Object.values(r.errors).join(' '));
      setText('formula-live', 'Revise os valores da simulação para ver a memória de cálculo.');
      announceTimer = setTimeout(() => setText('live-result', 'Revise os valores. ' + Object.values(r.errors).join(' ')), 600);
      return r;
    }
    setText('result-title', input.mode === 'inverse' ? 'Preço de venda informado' : 'Preço de venda sugerido');
    setText('price-result', money(r.price));
    setText('price-caption', 'Preço com ICMS, CBS e IBS');
    setText('mode-caption', input.mode === 'base' ? 'A partir da base' : input.mode === 'inverse' ? 'Análise da venda' : 'A partir do custo');
    setText('profit-label', input.mode === 'base' ? 'Sobra no custo máximo' : 'Sobra após custo e tributos');
    setText('profit-result', money(r.profit));
    setText('cost-caption', (input.mode === 'base' ? 'Custo máximo: ' : 'Custo líquido: ') + money(r.cost));
    const gainText = r.actualGain === null ? 'Não definido (custo zero)' : percent(r.actualGain);
    const gainDetailed = r.actualGain === null ? 'Não definido (custo zero)' : decimal(r.actualGain, 4) + '%';
    setText('margin-result', r.cost > 0 ? decimal(r.net / r.cost, 4) : 'Não definido (custo zero)');
    setText('sale-margin-result', 'Margem sobre a venda: ' + percent(r.actualMargin));
    const met = r.actualGain !== null && r.actualGain + 1e-9 >= r.target;
    setText('target-status', r.actualGain === null ? 'Não é possível comparar a meta com custo zero.' : r.profit < 0 ? 'Venda com prejuízo de ' + money(-r.profit) : 'Meta sobre o custo de ' + percent(r.target) + (met ? ' atendida' : ' não atendida'));
    $('profit-result').classList.toggle('negative', r.profit < 0);
    $('margin-result').classList.toggle('negative', r.actualGain !== null && r.actualGain < 0);
    setText('burden-result', percent(r.taxBurden) + ' em tributos');
    $('composition-bar').hidden = r.profit < 0;
    $('loss-note').hidden = r.profit >= 0;
    setText('loss-note', 'Custo e tributos excedem a venda em ' + money(-r.profit) + '.');
    const costShare = r.cost / r.price * 100;
    const normalized = r.profit < 0 ? (r.cost + r.totalTaxes) / r.price * 100 : 100;
    $('cost-bar').style.width = (costShare / normalized * 100) + '%';
    $('tax-bar').style.width = (r.taxBurden / normalized * 100) + '%';
    $('profit-bar').style.width = (Math.max(0, r.actualMargin) / normalized * 100) + '%';
    setText('cost-share', percent(costShare));
    setText('tax-share', percent(r.taxBurden));
    setText('profit-share', percent(r.actualMargin));
    $('composition-bar').setAttribute('aria-label', `Custo: ${money(r.cost)} (${percent(costShare)}). Tributos: ${money(r.totalTaxes)} (${percent(r.taxBurden)}). Sobra: ${money(r.profit)} (${percent(r.actualMargin)}).`);
    for (const key of ['icms', 'cbs', 'ibs']) {
      setText(key + '-base', money(key === 'icms' ? r.price : r.base));
      setText(key + '-rate', percent(input[key]));
      setText(key + '-value', money(r[key + 'Value']));
    }
    setText('tax-total', money(r.totalTaxes));
    setText('net-result', money(r.net));
    $('base-cost-note').hidden = input.mode !== 'base';
    setText('max-cost-result', money(r.cost));
    const roundingText = input.mode === 'cost'
      ? `Preço teórico: R$ ${decimal(r.exactPrice, 4)}. Preço aplicado ajustado a centavos para atender à meta. Ganho sobre o custo: ${gainDetailed}.`
      : input.mode === 'base'
        ? `Base informada: ${money(input.amount)}. Preço teórico: R$ ${decimal(r.exactPrice, 4)}. O ajuste ao centavo pode alterar a base. Ganho no custo máximo: ${gainDetailed}.`
        : `Ganho sobre o custo: ${gainDetailed}. Custo, venda e cada tributo são considerados em centavos.`;
    setText('round-note', roundingText);
    setText('formula-live', `Base CBS/IBS = (${money(r.price)} − ${money(r.icmsValue)}) ÷ (1 + ${decimal(input.cbs / 100, 4)} + ${decimal(input.ibs / 100, 4)}) = R$ ${decimal(r.base, 4)}. Sobra = ${money(r.price)} − ${money(r.icmsValue)} − ${money(r.cbsValue)} − ${money(r.ibsValue)} − ${money(r.cost)} = ${money(r.profit)}. ${r.actualGain === null ? 'Ganho sobre o custo não definido: custo zero.' : `Ganho sobre o custo = ${money(r.profit)} ÷ ${money(r.cost)} × 100 = ${gainDetailed}.`} Margem sobre a venda = ${decimal(r.actualMargin, 4)}%.`);
    announceTimer = setTimeout(() => setText('live-result', `Preço ${money(r.price)}. Sobra ${money(r.profit)}. Ganho sobre o custo: ${gainText}. ${r.actualGain === null ? 'Meta não comparável com custo zero.' : met ? 'Meta atendida.' : 'Meta não atendida.'}`), 600);
    return r;
  }
  function setTab(next, focus) {
    tab = next;
    render();
    if (focus) $('tab-' + next).focus();
  }
  function loadExample(name) {
    $('icms').value = '18'; $('cbs').value = '8,8'; $('ibs').value = '0,1'; $('margin').value = '20';
    tab = name === 'inverse' ? 'inverse' : 'forward';
    $('basis').value = name === 'base' ? 'base' : 'cost';
    $('amount').value = name === 'base' ? '100,00' : '70,00';
    $('price').value = name === 'inverse' ? '150,00' : '111,56';
    render();
  }
  $('form-panel').addEventListener('submit', e => e.preventDefault());
  $('form-panel').addEventListener('input', render);
  $('basis').addEventListener('change', render);
  for (const key of ['amount', 'price']) $(key).addEventListener('blur', () => {
    const n = calc.parse($(key).value);
    if (Number.isFinite(n) && n >= 0 && n <= 1e9) { $(key).value = decimal(calc.round(n)); render(); }
  });
  for (const name of ['forward', 'inverse']) {
    $('tab-' + name).addEventListener('click', () => setTab(name));
    $('tab-' + name).addEventListener('keydown', e => {
      if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
        e.preventDefault();
        setTab(e.key === 'Home' ? 'forward' : e.key === 'End' ? 'inverse' : tab === 'forward' ? 'inverse' : 'forward', true);
      }
    });
  }
  $('reset').addEventListener('click', () => { loadExample('cost'); $('price').value = '111,56'; });
  document.querySelectorAll('[data-example]').forEach(button => button.addEventListener('click', () => {
    loadExample(button.dataset.example);
    $('amount').focus({ preventScroll: true });
    $('simulation-title').scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
  }));
  const scenario = { icms: 18, cbs: 8.8, ibs: .1, margin: 20 };
  const exampleCost = calc.calculate({ ...scenario, mode: 'cost', amount: 70 });
  setText('example-cost-result', 'Venda ' + money(exampleCost.price));
  const exampleInverse = calc.calculate({ ...scenario, mode: 'inverse', amount: 70, price: 150 });
  const exampleBase = calc.calculate({ ...scenario, mode: 'base', amount: 100 });
  setText('example-inverse-result', 'Ganho sobre o custo ' + percent(exampleInverse.actualGain));
  setText('example-base-result', 'Venda ' + money(exampleBase.price));
  render();
  
  const context = document.modelContext;
  if (context && typeof context.registerTool === 'function') {
    const lifetime = new AbortController();
    const schema = { type: 'object', properties: {
      mode: { type: 'string', enum: ['cost', 'base', 'inverse'] },
      amount: { type: 'number', description: 'Custo líquido ou base sem tributos, em reais.' },
      price: { type: 'number', description: 'Preço final em reais, obrigatório no modo inverse.' },
      icms: { type: 'number', description: 'Alíquota percentual de ICMS.' },
      cbs: { type: 'number', description: 'Alíquota percentual de CBS.' },
      ibs: { type: 'number', description: 'Alíquota percentual de IBS.' },
      margin: { type: 'number', description: 'Ganho desejado ou meta de comparação, percentual do custo líquido; aceita 100% ou mais.' }
    }, required: ['mode', 'amount', 'icms', 'cbs', 'ibs', 'margin'], additionalProperties: false };
    try {
      Promise.resolve(context.registerTool({ name: 'configure_apolo_pricing', title: 'Simular preço ou ganho Apolo',
        description: 'Configura os valores visíveis do precificador e calcula preço, bases, tributos e ganho sobre o custo no cenário de planejamento. Não salva nem transmite dados.',
        inputSchema: schema, annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute(input) {
          if (!input || typeof input !== 'object' || Object.keys(input).some(k => !Object.prototype.hasOwnProperty.call(schema.properties, k))) throw new Error('Dados de simulação inválidos.');
          const result = calc.calculate(input);
          if (!result.ok) throw new Error(Object.values(result.errors).join(' '));
          tab = input.mode === 'inverse' ? 'inverse' : 'forward';
          $('basis').value = input.mode === 'base' ? 'base' : 'cost';
          for (const key of ['amount', 'icms', 'cbs', 'ibs', 'margin']) $(key).value = String(input[key]).replace('.', ',');
          if (input.mode === 'inverse') $('price').value = String(input.price).replace('.', ',');
          return render();
        }
      }, { signal: lifetime.signal })).catch(() => {});
      window.addEventListener('pagehide', () => lifetime.abort(), { once: true });
    } catch (_) {  }
  }
})();
