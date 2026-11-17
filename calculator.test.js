const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const calc = require('./calculator');
const scenario = { mode: 'cost', amount: 100, icms: 18, cbs: 8.8, ibs: .1, margin: 35, financial: 2 };

test('financial cost is separate and preserves gain in all three modes', () => {
  const r = calc.calculate(scenario);
  assert.equal(r.financialCost, 2);
  assert.ok(r.profit >= 35);
  assert.equal(calc.round(r.cost + r.financialCost + r.profit + r.totalTaxes), r.price);
  const inverse = calc.calculate({ ...scenario, mode: 'inverse', price: r.price });
  assert.equal(inverse.profit, r.profit);
  const base = calc.calculate({ ...scenario, mode: 'base', amount: 137 });
  assert.ok(base.profit + 1e-8 >= base.cost * .35);
  assert.equal(base.financialCost, calc.round(base.cost * .02));
  assert.equal(calc.calculate({ ...scenario, financial: -1 }).ok, false);
  assert.equal(calc.calculate({ ...scenario, financial: 101 }).ok, false);
});

test('zero fee preserves previous results and monetary parsing handles grouping', () => {
  const r = calc.calculate({ ...scenario, amount: 70, margin: 20, financial: 0 });
  assert.equal(r.price, 111.56);
  assert.equal(r.profit, 14.01);
  assert.equal(calc.parse('1.000', true), 1000);
  assert.equal(calc.parse('R$ 1.000,00', true), 1000);
  assert.equal(calc.parse('8.800'), 8.8);
  assert.ok(Number.isNaN(calc.parse('1.00.0', true)));
});

test('promotion preserves 20% floor and warns when there is no room', () => {
  const p = calc.promotion(scenario);
  assert.ok(p.ok && p.canDiscount);
  assert.ok(p.profit >= 20);
  assert.equal(p.financialCost, 2);
  assert.equal(p.discount, calc.round(p.normalPrice - p.price));
  const below = calc.calculate({ ...scenario, mode: 'inverse', price: calc.round(p.price - .10) });
  assert.ok(below.profit < 20);
  const atFloor = calc.promotion({ ...scenario, margin: 20 });
  assert.equal(atFloor.canDiscount, false);
  const loss = calc.promotion({ ...scenario, mode: 'inverse', price: 50 });
  assert.ok(loss.belowFloor);
  assert.equal(loss.discount, 0);
  assert.equal(calc.promotion(scenario, 19).ok, false);
  assert.equal(calc.promotion(scenario, NaN).ok, false);
  assert.equal(calc.promotion({ ...scenario, mode: 'inverse', amount: 0, price: 150 }).ok, false);
});

test('5000 scenarios preserve target after financial and tax rounding', () => {
  for (let k = 0; k < 5000; k++) {
    const input = { ...scenario, amount: (1 + k * 37 % 100000) / 100, icms: k % 26, cbs: k % 11, ibs: k % 8, margin: k % 151, financial: (k % 501) / 100 };
    for (const mode of ['cost', 'base']) {
      const r = calc.calculate({ ...input, mode });
      if (!r.ok && mode === 'base') continue; // A tiny base can support no positive cent cost.
      assert.ok(r.ok);
      assert.ok(r.profit + 1e-7 >= r.cost * input.margin / 100);
      assert.equal(calc.round(r.cost + r.financialCost + r.profit + r.totalTaxes), r.price);
    }
  }
});

test('interface initializes, recalculates financial and promotion, and allows editing inverse target', () => {
  const html = fs.readFileSync(__dirname + '/index.html', 'utf8');
  const elements = {};
  for (const match of html.matchAll(/<[^>]*\bid="([^"]+)"[^>]*>/g)) {
    assert.ok(!elements[match[1]], 'duplicate id ' + match[1]);
    elements[match[1]] = { value: /\bvalue="([^"]*)"/.exec(match[0])?.[1] ?? '',
      textContent: '', style: {}, events: {}, classList: { toggle() {} },
      setAttribute() {}, addEventListener(type, handler) { this.events[type] = handler; }, focus() {} };
  }
  elements.basis.value = 'cost';
  const context = { window: { ApoloCalculator: calc }, document: {
    getElementById(id) { assert.ok(elements[id], 'missing DOM id ' + id); return elements[id]; },
    querySelectorAll() { return []; }
  }, setTimeout() { return 0; }, clearTimeout() {}, console };
  vm.runInNewContext(fs.readFileSync(__dirname + '/app.js', 'utf8'), context);
  assert.match(elements['price-result'].textContent, /112,49/);
  assert.equal(elements.financial.value, '1');
  assert.match(elements['financial-result'].textContent, /0,70/);
  elements.financial.value = '2';
  elements.margin.value = '35';
  elements['form-panel'].events.input();
  assert.match(elements['financial-result'].textContent, /1,40/);
  assert.match(elements['promotion-discount'].textContent, /%/);
  elements['promotion-minimum'].value = '19';
  elements['promotion-minimum'].events.input();
  assert.equal(elements['promotion-result'].hidden, true);
  elements['tab-inverse'].events.click();
  assert.equal(elements.margin.disabled, false);
  elements.margin.value = '';
  elements['form-panel'].events.input();
  assert.equal(elements['valid-result'].hidden, true);
  elements.margin.value = '20';
  elements['form-panel'].events.input();
  assert.equal(elements['valid-result'].hidden, false);
});
