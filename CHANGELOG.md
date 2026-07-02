# Changelog

Histórico de alterações do projeto FinanceHub.

## [1.4.0] - 2026-07-02
### Adicionado
- **Sprint 10 (PWA)**:
  - Transformação da SPA em Progressive Web App instalável em desktops e dispositivos móveis (Android/iOS).
  - Manifesto do aplicativo (`manifest.json`) contendo nome, descrição, escopo, modo autônomo standalone e temas.
  - Logotipo e ícone premium gerados para o app, configurados nas resoluções necessárias (192px e 512px).
  - Service Worker (`sw.js`) com estratégia de cache *Stale-while-revalidate* para o App Shell, oferecendo carregamento instantâneo e suporte offline (com bypass de rede para chamadas dinâmicas de API).
  - Banner dinâmico e persistente de conexão offline (`.offline-banner`) acionado automaticamente ao detectar queda de rede do navegador.

## [1.3.0] - 2026-07-02
### Adicionado
- **Sprint de Estabilização e Auditoria**:
  - Implementação de semáforo de escrita via `LockService` (`insertRecord_`, `updateRecordById_`) para eliminação total de concorrência e condições de corrida no banco de dados.
  - Cache local de memória por requisição no Google Apps Script (`requestCache_` em `Database.gs`), resultando em uma redução drástica no tempo de resposta das APIs ao evitar leituras duplicadas do Google Sheets.
  - Módulo completo de **Transferências entre Contas** (`Transfer.gs`, `transferService.js`, `TransferFormModal.js`), com controle atômico e rebatimento imediato de saldos nas contas envolvidas, além de storno ao deletar.
  - Atalhos rápidos no Dashboard para criação instantânea de Receitas, Despesas e Transferências (`+ Receita`, `+ Despesa`, `+ Transferência`) com auto-refresh.

## [1.2.0] - 2026-07-02
### Adicionado
- **Sprint 8 (Relatórios)**:
  - Implementação completa do módulo de relatórios financeiros analíticos.
  - Tela de relatórios interativa em `/reports` com abas para Visão Geral (comparativos), Categorias, Cartões e Gráfico de Evolução Mensal.
  - Filtro por período de datas e filtros interativos locais (por descrição, categoria, cartão de crédito e conta bancária).
  - Geração e exportação de relatórios para PDF e Excel (formato CSV otimizado) via codificação base64 no Google Apps Script.
  - Integração do link de Relatórios no menu e cabeçalho global (`AppHeader`).
  - Nova rota `/reports` no gerenciador de rotas (`routes.js`).
- **Sprint 7 (Parcelamentos)**:
  - Lógica de parcelamento no backend (`Installment.gs`) com divisão matemática e correção de arredondamento de centavos na última parcela.
  - Criação automática de transações mensais vinculadas ao plano de parcelamento.
  - Edição e deleção em lote ("Salvar futuras" vs "Somente esta") na interface e no banco de dados.

### Corrigido
- **Sprint 6 (Estabilização do Dashboard)**:
  - Correção na leitura de datas da planilha (`Database.gs`) convertendo objetos `Date` nativos do Google Sheets para strings `YYYY-MM-DD` uniformes, resolvendo bugs de indicadores zerados no Dashboard.
  - Ajuste do ciclo de fechamento de faturas de cartões de crédito no Dashboard para respeitar o dia de fechamento real (`closingDay`) de cada cartão.
  - Virtualização automática de faturas de cartões de crédito com vencimento nos próximos 7 dias no painel "Próximos Vencimentos".
