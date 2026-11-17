# Precificador CBS/IBS — Apolo Distribuidora

Aplicação web para simular preços de venda, analisar margens e visualizar a composição de custos e tributos em cenários de planejamento com ICMS, CBS e IBS.

Os cálculos são executados diretamente no navegador, com atualização dos resultados conforme os valores são preenchidos.

## Funcionalidades

- Formação do preço de venda a partir do custo líquido e da margem desejada.
- Formação do preço a partir de uma base sem tributos.
- Análise da margem de uma venda com preço informado.
- Edição das alíquotas de ICMS, CBS e IBS.
- Detalhamento das bases de cálculo e dos valores de cada tributo.
- Visualização da composição do preço entre custo, tributos e sobra.
- Comparação da margem resultante com a meta informada.
- Indicação de vendas com prejuízo.
- Restauração dos valores padrão: custo R$ 1,00, ICMS 18%, CBS 8,8%, IBS 0,1%, financeiro 1% e ganho editável de 20%.
- Memória de cálculo com fórmulas e critérios de arredondamento.

## Tecnologias

- HTML5
- CSS3
- JavaScript

## Estrutura do projeto

```text
├── index.html       # Estrutura da página
├── styles.css       # Estilos da interface
├── calculator.js    # Funções de cálculo e validação
└── app.js           # Interações e atualização dos resultados
```

## Como executar

1. Clone ou baixe este repositório.
2. Mantenha os arquivos na mesma pasta.
3. Abra o arquivo `index.html` em um navegador atualizado.

Não é necessário configurar banco de dados ou servidor para executar os cálculos.

## Como utilizar

### Formar preço pelo custo

1. Selecione **Formar preço**.
2. Escolha **Custo líquido do produto** como ponto de partida.
3. Informe o custo líquido, as alíquotas e a margem desejada.
4. Consulte o preço sugerido e sua composição.

O custo informado deve considerar os créditos recuperáveis já descontados. A aplicação não calcula esses créditos.

### Formar preço pela base

1. Selecione **Formar preço**.
2. Escolha **Base sem tributos**.
3. Informe a base, as alíquotas e a margem desejada.
4. Consulte o preço final e o custo líquido máximo para atingir a meta.

Nesse modo, a sobra apresentada pressupõe o custo máximo calculado.

### Analisar uma venda

1. Selecione **Analisar venda**.
2. Informe o custo líquido e o preço final de venda.
3. Ajuste as alíquotas.
4. Consulte a margem resultante, os tributos e a sobra após o custo.

## Modelo de cálculo

Nas fórmulas abaixo:

| Símbolo | Significado |
|---|---|
| `P` | Preço final de venda |
| `C` | Custo líquido |
| `B` | Base sem os três tributos |
| `i` | Alíquota de ICMS |
| `c` | Alíquota de CBS |
| `b` | Alíquota de IBS |
| `m` | Ganho desejado sobre o custo |

As alíquotas e a margem são expressas em formato decimal: **18% = 0,18**.

```text
ICMS = P × i

Base CBS/IBS = (P − ICMS) ÷ (1 + c + b)

CBS = Base CBS/IBS × c

IBS = Base CBS/IBS × b

Financeiro = C × taxa financeira, arredondado a centavos

Preço pelo custo = [C × (1 + m) + Financeiro] ÷ [(1 − i) ÷ (1 + c + b)]

Preço pela base = B × (1 + c + b) ÷ (1 − i)

Sobra = P − ICMS − CBS − IBS − C − Financeiro

Margem resultante (%) = (Sobra ÷ P) × 100
```

### Arredondamento

Os tributos são arredondados individualmente a centavos.

Na formação de preço pelo custo, o preço aplicado é ajustado para cima ao centavo e, quando necessário, para atender à margem desejada após o arredondamento dos tributos.

## Premissas e limitações

Este projeto é uma ferramenta de **simulação e planejamento**, não um sistema de apuração fiscal.

- Considera custo líquido, ICMS, CBS, IBS, ganho sobre custo e custo financeiro estimado.
- Comissão e despesas operacionais devem estar cobertas pelo ganho sobre custo. Frete de aquisição deve compor o custo quando aplicável. Outros tributos não são apurados.
- Não determina o enquadramento fiscal por produto, regime ou ano.
- Alterar as alíquotas não altera as regras de formação das bases.
- A sobra calculada não representa o lucro líquido contábil da empresa.
- Os valores padrão são premissas de simulação e não devem ser interpretados como alíquotas vigentes.

As premissas e referências utilizadas estão disponíveis na própria interface.

## Processamento e acesso

Os valores da simulação são processados no navegador. O código apresentado não implementa persistência das simulações nem envio desses valores a um servidor.

A indicação visual de **“Acesso privado”** não implementa autenticação. Caso a aplicação seja publicada para uso restrito, o controle de acesso deve ser configurado na hospedagem ou em uma camada de autenticação.

## Taxa financeira do split payment

Taxa total por operação sobre o custo líquido, de 0% a 100%, padrão 1%. Não é tributo nem tarifa obrigatória do split payment. Informe o efeito financeiro estimado para os prazos de estoque, pagamento e recebimento. Se já estiver incluído no ganho, mantenha zero para não duplicar. O simulador não apura a segregação bancária nem créditos disponíveis.

O ganho e o índice sobre custo são apresentados após descontar o financeiro. A composição separa custo, tributos, financeiro e sobra. Na entrada por base, o custo máximo é ajustado a centavos para preservar o ganho após o financeiro arredondado.

## Análise comercial

Não há exemplos práticos nem módulo de piso promocional. O gestor informa o ganho desejado sobre o custo e avalia o resultado; não é imposto um mínimo operacional. O ganho inicial de 20% é editável e pode ser reduzido a zero. A decisão sobre a cobertura das despesas cabe ao gestor.

## Entrada de valores

Nos campos monetários, `1.000` significa mil reais e `1.000,00` também. Use vírgula nos decimais. Nos percentuais, ponto ou vírgula são separadores decimais. A meta permanece editável na análise inversa.

## Verificação

Execute `node --test calculator.test.js` para conferir valores padrão, ganho, custo financeiro, análise inversa e arredondamento.

Premissa financeira informada pela empresa: boleto mínimo de R$ 200,00; emissão R$ 1,58 + transação do split payment R$ 0,39 = R$ 1,97 (referência arredondada de R$ 2,00). R$ 1,97 / R$ 200,00 = 0,985% do valor do boleto. O padrão de 1% é aplicado sobre o custo líquido neste simulador, ao restaurar padrão e quando a API omite financial. Não equivale a 1% da venda: a cobertura depende da relação entre custo, venda e número de boletos. A tarifa não é somada outra vez ao percentual.
