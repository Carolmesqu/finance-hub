# UI Guidelines

## Visão Geral

Este documento define o Design System do FinanceHub. Referência de inspiração: Nubank (clareza e cor de destaque), Notion (organização e tipografia), Google Calendar (grade e cores por categoria), Todoist (listas e produtividade), Material Design 3 (tokens de elevação e forma) e Apple Human Interface Guidelines (fluidez de gestos e espaçamento).

Princípios: interface limpa, poucos elementos por tela, hierarquia visual clara, mobile-first, alto contraste em ambos os temas, sem uso de bibliotecas de UI prontas (CSS puro com Variáveis, Flexbox e Grid).

Todos os tokens abaixo devem ser implementados como **CSS Custom Properties** em `/assets/css` (ex.: `tokens.css`), consumidas pelos componentes em `/js/components`.

---

## 1. Cores

### Paleta Base (marca)

| Token | Hex | Uso |
|---|---|---|
| `--color-brand-50` | `#EEF2FF` | Fundo de destaque suave |
| `--color-brand-100` | `#C7D2FE` | Hover leve |
| `--color-brand-500` | `#6366F1` | Cor primária da marca (botões, links, foco) |
| `--color-brand-600` | `#4F46E5` | Hover/active da cor primária |
| `--color-brand-700` | `#4338CA` | Pressed |

### Cores Semânticas

| Token | Uso |
|---|---|
| `--color-income` (`#16A34A`) | Receitas, saldo positivo, valores a favor |
| `--color-expense` (`#DC2626`) | Despesas, saldo negativo, alertas de limite |
| `--color-warning` (`#D97706`) | Vencimentos próximos, avisos |
| `--color-info` (`#0EA5E9`) | Informações neutras, dicas |

### Tema Claro (`data-theme="light"`)

| Token | Hex | Uso |
|---|---|---|
| `--color-bg` | `#F7F8FA` | Fundo geral da aplicação |
| `--color-surface` | `#FFFFFF` | Cards, modais, inputs |
| `--color-surface-alt` | `#F1F2F6` | Fundo alternado (linhas de lista, hover) |
| `--color-border` | `#E5E7EB` | Bordas e divisores |
| `--color-text-primary` | `#111827` | Texto principal |
| `--color-text-secondary` | `#6B7280` | Texto secundário/legendas |
| `--color-text-disabled` | `#9CA3AF` | Texto desabilitado |

### Tema Escuro (`data-theme="dark"`)

| Token | Hex | Uso |
|---|---|---|
| `--color-bg` | `#0B0D12` | Fundo geral da aplicação |
| `--color-surface` | `#161922` | Cards, modais, inputs |
| `--color-surface-alt` | `#1E222D` | Fundo alternado |
| `--color-border` | `#2A2E3A` | Bordas e divisores |
| `--color-text-primary` | `#F3F4F6` | Texto principal |
| `--color-text-secondary` | `#9CA3AF` | Texto secundário/legendas |
| `--color-text-disabled` | `#6B7280` | Texto desabilitado |

**Regra de implementação**: nenhuma cor é escrita diretamente em componentes — sempre via `var(--token)`. A troca de tema altera apenas o atributo `data-theme` na tag `<html>`, persistido em `state.theme` e sincronizado com `Settings`/`Users.theme`.

**Contraste**: todo par texto/fundo deve atingir no mínimo WCAG AA (4.5:1 para texto normal, 3:1 para texto grande), validado nos dois temas.

---

## 2. Tipografia

**Fonte**: `Inter` (via `@font-face` local, sem CDN externo por política de privacidade/performance), com fallback para a pilha do sistema:

```css
--font-family-base: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
```

### Escala Tipográfica

| Token | Tamanho | Peso | Uso |
|---|---|---|---|
| `--font-display` | 32px / 40px (line-height) | 700 | Saldo do mês no Dashboard |
| `--font-h1` | 24px / 32px | 700 | Títulos de página |
| `--font-h2` | 20px / 28px | 600 | Títulos de seção/Card |
| `--font-h3` | 16px / 24px | 600 | Subtítulos, item de lista em destaque |
| `--font-body` | 14px / 20px | 400 | Texto padrão |
| `--font-body-strong` | 14px / 20px | 600 | Texto padrão em destaque (valores monetários em listas) |
| `--font-caption` | 12px / 16px | 400 | Legendas, timestamps, labels de input |
| `--font-mono-value` | 14px–32px (herda contexto) | 600 | Valores monetários (usa `font-variant-numeric: tabular-nums` para alinhamento) |

---

## 3. Espaçamento

Escala baseada em múltiplos de 4px:

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 24px;
--space-6: 32px;
--space-7: 40px;
--space-8: 48px;
--space-9: 64px;
```

Regras:
- Padding interno de Cards: `--space-4` (mobile) / `--space-5` (desktop).
- Espaço entre seções verticais do Dashboard: `--space-5`.
- Gap padrão de listas/grids: `--space-3`.
- Margem lateral segura da tela (mobile): `--space-4`.

### Raio de Borda

```css
--radius-sm: 8px;   /* inputs, chips */
--radius-md: 12px;  /* botões, badges */
--radius-lg: 16px;  /* cards */
--radius-xl: 24px;  /* modais, bottom sheets */
--radius-full: 999px; /* avatares, pills, FAB */
```

### Elevação (sombras)

```css
--shadow-1: 0 1px 2px rgba(0,0,0,0.06);           /* cards em repouso */
--shadow-2: 0 4px 12px rgba(0,0,0,0.08);          /* cards elevados/hover */
--shadow-3: 0 12px 32px rgba(0,0,0,0.16);         /* modais, FAB, dropdowns */
```

No tema escuro, sombras são substituídas/reforçadas por uma borda sutil (`--color-border`) somada a uma sombra mais opaca, já que sombras pretas têm pouco contraste sobre fundos escuros.

---

## 4. Ícones

Biblioteca de referência: **Phosphor Icons** (estilo *regular*, licença MIT), importados como SVG inline (sem fonte de ícone, garantindo controle de cor via `currentColor` e sem dependência externa em runtime).

Tamanhos padronizados:

```css
--icon-sm: 16px;
--icon-md: 20px;
--icon-lg: 24px;
--icon-xl: 32px;
```

Uso:
- Navegação (Sidebar/Bottom Navigation): `--icon-lg`, cor `--color-text-secondary` (inativo) / `--color-brand-500` (ativo).
- Ações em lista (editar/excluir): `--icon-md`.
- Categorias/Cartões: ícone `--icon-md` colorido com a cor definida na entidade.

---

## 5. Componentes

### 5.1 Cards

- Fundo `--color-surface`, raio `--radius-lg`, sombra `--shadow-1` (repouso) → `--shadow-2` (hover, apenas desktop).
- Variante "Resumo" (Dashboard): inclui label superior (`--font-caption`, `--color-text-secondary`) + valor em destaque (`--font-display` ou `--font-h1`) + indicador opcional (seta/percentual colorido com `--color-income`/`--color-expense`).
- Variante "Item de Lista" (lançamento): ícone da categoria à esquerda, descrição + categoria ao centro, valor à direita (verde para receita, vermelho para despesa), data/badge de parcela em `--font-caption` abaixo da descrição.

### 5.2 Botões

| Variante | Uso | Estilo |
|---|---|---|
| Primário | Ação principal (Salvar, Confirmar) | Fundo `--color-brand-500`, texto branco, `--radius-md` |
| Secundário | Ação alternativa (Cancelar) | Fundo transparente, borda `--color-border`, texto `--color-text-primary` |
| Ghost/Texto | Ações leves (links, "Ver todas") | Sem fundo/borda, texto `--color-brand-500` |
| Perigo | Ações destrutivas (Excluir) | Fundo transparente, texto `--color-expense`, hover com fundo `--color-expense` a 10% de opacidade |
| FAB | Criação rápida (mobile) | Círculo `--radius-full`, fundo `--color-brand-500`, ícone branco `--icon-lg`, `--shadow-3` |

Tamanhos: `sm` (32px altura), `md` (40px altura, default), `lg` (48px altura, usado em CTAs de tela cheia).

Estados obrigatórios: `default`, `hover`, `active/pressed`, `focus-visible` (outline `2px solid var(--color-brand-500)` com `offset 2px`), `disabled` (opacidade 40%, `cursor: not-allowed`).

### 5.3 Inputs

- Altura padrão 44px (alvo de toque adequado para mobile), padding horizontal `--space-3`, `--radius-sm`, fundo `--color-surface`, borda `1px solid var(--color-border)`.
- Foco: borda `--color-brand-500` + leve `box-shadow` (halo) na cor da marca a 20% de opacidade.
- Erro: borda `--color-expense` + texto de erro `--font-caption` em `--color-expense` abaixo do campo.
- Label sempre visível acima do campo (`--font-caption`, `--color-text-secondary`), nunca apenas placeholder (acessibilidade).
- Inputs monetários: prefixo fixo com símbolo da moeda do Workspace (`R$`), alinhamento à direita, `font-variant-numeric: tabular-nums`.
- Componentes especializados reutilizáveis: `Select`, `DatePicker` (calendário customizado, sem `<input type="date">` nativo para consistência visual entre navegadores), `Switch` (toggle), `SegmentedControl` (ex.: alternância Receita/Despesa).

### 5.4 Modais e Dialogs

- **Modal**: usado para formulários (Nova Conta, Nova Categoria, Nova Transferência). Desktop: centralizado, largura máxima 480px, `--radius-xl`, `--shadow-3`, overlay `rgba(0,0,0,0.5)`. Mobile: **Bottom Sheet** (desliza de baixo para cima), ocupando até 90% da altura da tela, com "grabber" no topo.
- **Dialog**: usado para confirmações curtas (excluir, opções de parcela/recorrência). Sempre com no máximo 2–3 ações, ação destrutiva sempre à direita e destacada em `--color-expense`.
- **Toast**: notificação temporária (3s de exibição), posicionado no topo (mobile) ou canto inferior direito (desktop), `--radius-md`, ícone de status (sucesso `--color-income`, erro `--color-expense`, info `--color-info`).

### 5.5 Listas e Tabelas

- Mobile: lista vertical de Cards de item (sem tabela tradicional), com swipe-to-reveal para ações de editar/excluir.
- Desktop: tabela com cabeçalho fixo, linhas com hover `--color-surface-alt`, colunas alinhadas à direita para valores monetários.
- Estado vazio: ilustração simples + texto curto + botão de ação primária (ex.: "Nenhuma despesa este mês" + "+ Nova Despesa").
- Paginação: scroll infinito no mobile; paginação numerada no desktop (reaproveita `pageSize`/`page` da API).

### 5.6 Gráficos

- Biblioteca: implementação própria com SVG/Canvas leve (sem dependência pesada de terceiros) ou uma biblioteca minimalista sem CSS próprio a sobrescrever (a decidir na fase de implementação, mantendo o requisito de "sem frameworks").
- Paleta: receitas sempre `--color-income`, despesas sempre `--color-expense`, categorias usam a cor cadastrada em `Categories.color` (fallback para uma paleta neutra de 8 cores predefinidas caso a categoria não tenha cor).
- Tipos: linha (evolução mensal), barra (comparativo receita x despesa), pizza/donut (distribuição por categoria).
- Sempre exibir legendas e valores ao toque/hover (tooltip), nunca depender só de cor (acessibilidade a daltonismo — usar também padrões/ícones quando crítico).

---

## 6. Responsividade

Abordagem **Mobile First**: todo componente é estilizado primeiro para a menor largura, depois adaptado via `min-width` media queries.

### Breakpoints

```css
--bp-sm: 480px;   /* celulares grandes */
--bp-md: 768px;   /* tablets */
--bp-lg: 1024px;  /* desktop pequeno */
--bp-xl: 1280px;  /* desktop grande */
```

### Diretrizes por Faixa

| Faixa | Navegação | Grid de Cards do Dashboard | Formulários |
|---|---|---|---|
| `< 768px` | Bottom Navigation + FAB | 1 coluna | Tela cheia / Bottom Sheet |
| `768–1023px` | Sidebar colapsada (ícones) | 2 colunas | Modal centralizado |
| `≥ 1024px` | Sidebar expandida (ícone + label) | 3–4 colunas | Modal centralizado (480px) |

- Área de toque mínima: 44×44px em qualquer elemento interativo.
- Respeitar `safe-area-inset` (notch/gestos do iOS) em Header e Bottom Navigation.
- Bottom Navigation fixa com altura de 64px + `safe-area-inset-bottom`.

---

## 7. Dark Mode / Light Mode

- Implementado via atributo `data-theme="light"|"dark"` na tag `<html>`, controlado por `state.theme`.
- Default inicial: `"system"` (segue `prefers-color-scheme`), sobrescrito se o usuário escolher manualmente (persistido em `Users.theme`).
- Toda cor de UI deve vir de token semântico (nunca hex fixo em componentes), garantindo troca instantânea de tema sem reflow de layout.
- Imagens/ilustrações devem ter variante para cada tema quando o contraste não for suficiente (ícones com fundo transparente resolvem a maioria dos casos).

---

## 8. Micro Animações

Transições sutis, nunca deve haver alteração relevante em duração >400ms navegação.

```css
--duration-fast: 120ms;   /* hover, toggle de switch */
--duration-base: 200ms;   /* abertura de modal/dropdown, troca de tab */
--duration-slow: 320ms;   /* transição de página, bottom sheet */
--easing-standard: cubic-bezier(0.2, 0, 0, 1);
--easing-decelerate: cubic-bezier(0, 0, 0, 1);
--easing-accelerate: cubic-bezier(0.3, 0, 1, 1);
```

Aplicações específicas:
- **Botões**: leve `scale(0.97)` no `active` (`--duration-fast`).
- **Modal/Bottom Sheet**: fade do overlay + slide/scale do conteúdo (`--duration-base`, `--easing-decelerate` na entrada; `--easing-accelerate` na saída).
- **Toast**: slide + fade de entrada (`--duration-base`), permanece 3s, fade de saída (`--duration-fast`).
- **Troca de página (Router)**: fade sutil (`--duration-base`) — sem animações de slide horizontal, para manter neutralidade em Desktop.
- **Skeleton loading**: usado em listas/Cards durante carregamento de dados da API (shimmer sutil), em vez de spinners genéricos, para reduzir percepção de espera.
- Respeitar `prefers-reduced-motion: reduce`, desabilitando/reduzindo todas as transições acima quando o usuário tiver essa preferência ativada no sistema operacional.
