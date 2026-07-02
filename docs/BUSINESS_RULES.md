# Business Rules

# Visão Geral

O sistema é um gerenciador financeiro colaborativo.

Cada Workspace representa um ambiente financeiro que pode ser compartilhado entre duas ou mais pessoas.

Todos os lançamentos pertencem ao Workspace.

Todas as entidades citadas neste documento seguem exatamente a modelagem definida em [database.md](./database.md), e todo comportamento aqui descrito deve ser implementado no Google Apps Script conforme os métodos definidos em [API.md](./API.md).

---

# Receitas

Uma receita representa qualquer entrada de dinheiro. É registrada como uma `Transaction` com `type = "income"`.

Exemplos:

- Salário
- Extra
- Freelance
- Comissão
- Venda
- PIX recebido

Cada receita possui:

- descrição
- categoria
- valor
- data
- conta de destino (`accountId`)
- recorrente (sim/não)

As receitas são somadas para calcular o saldo do mês e **creditam** o saldo da conta de destino imediatamente.

---

# Despesas

Uma despesa representa qualquer saída de dinheiro. É registrada como uma `Transaction` com `type = "expense"`.

Cada despesa possui:

- descrição
- categoria
- valor
- data da compra
- forma de pagamento
- conta ou cartão utilizado
- período de planejamento (início do mês ou quinzena)
- observações
- recorrente (sim/não)

---

# Parcelamentos

Quando o usuário informar que uma compra foi parcelada, o sistema deverá gerar automaticamente todas as parcelas.

Exemplo:

Notebook

Valor:

R$ 1.500,00

Parcelas:

12

O sistema deverá criar automaticamente:

1/12

2/12

3/12

...

12/12

Cada parcela deverá aparecer automaticamente no mês correspondente.

O usuário não deverá cadastrar cada parcela manualmente.

## Regras de geração

- Cria-se 1 registro em `Installments` (o plano) e N registros em `Transactions` (uma por parcela), vinculados por `installmentPlanId`.
- `installmentAmount = round(totalAmount / installmentsCount, 2)`. Caso a divisão não seja exata, a **última parcela** absorve a diferença de centavos, garantindo que a soma das parcelas seja idêntica ao `totalAmount` original.
- A data de cada parcela é `startDate` incrementada em N meses (parcela 1 = `startDate`, parcela 2 = `startDate + 1 mês`, etc.), preservando o dia (ajustado para o último dia do mês quando necessário, ex.: dia 31 em fevereiro vira dia 28/29).
- Compras parceladas no cartão: a parcela é atribuída à fatura vigente no momento da compra, considerando o dia de fechamento do cartão (ver seção "Cálculo das Faturas").

---

# Saldo do Mês

O saldo do mês será calculado utilizando:

Saldo = Total de Receitas - Total de Despesas

Não considerar patrimônio.

Não considerar investimentos.

Apenas movimentações do mês (campo `date` da `Transaction` dentro do período, incluindo parcelas e recorrências geradas para aquele mês).

---

# Receitas do Mês

Somar todas as receitas (`type = "income"`) com `date` dentro do período selecionado, excluindo registros com `deletedAt` preenchido.

---

# Despesas do Mês

Somar todas as despesas (`type = "expense"`) com `date` dentro do período selecionado, excluindo registros com `deletedAt` preenchido.

Incluindo parcelas daquele mês.

---

# Quinzena

O sistema deverá permitir dividir os lançamentos entre:

Início do mês

Quinzena

Essa divisão servirá para planejamento financeiro. O corte entre os dois períodos é definido por `Settings.fortnightSplitDay` (default dia 15) — despesas com `paymentPeriod = "start_of_month"` são as previstas para pagamento entre o `monthStartDay` e o dia anterior ao `fortnightSplitDay`; despesas com `paymentPeriod = "fortnight"` são as previstas a partir do `fortnightSplitDay` até o fim do mês.

O usuário poderá informar quando determinada despesa deverá ser paga.

Exemplo:

Internet

→ Início do mês

Academia

→ Quinzena

No Dashboard deverá existir um resumo contendo:

Total para início do mês

Total para quinzena

Saldo restante para cada período (total do período − soma já paga/lançada).

Este campo (`paymentPeriod`) é obrigatório apenas para despesas; receitas não possuem quinzena.

---

# Cartões

Cada cartão possui:

Nome

Limite

Dia do fechamento

Dia do vencimento

Todas as compras realizadas deverão ficar vinculadas ao cartão.

As parcelas futuras deverão aparecer automaticamente nas próximas faturas.

## Comportamento dos Cartões

- **Limite disponível** = `limit − soma de todas as despesas em aberto (não pagas) vinculadas ao cartão`, incluindo parcelas futuras já geradas.
- Uma compra no cartão nunca altera `Accounts.balance` — apenas reduz o limite disponível do cartão.
- Ao arquivar um cartão com parcelas futuras em aberto, o sistema deve bloquear a ação (`CONFLICT`) e sugerir cancelar o plano de parcelamento primeiro.

## Cálculo das Faturas

- **Período de uma fatura**: da data de fechamento anterior (exclusive) até a data de fechamento atual (inclusive). Ex.: cartão com fechamento dia 10 → fatura de fevereiro cobre de 11/01 a 10/02.
- **Fatura atual**: fatura ainda não vencida, cujo período de compras já se fechou ou está em andamento (a mais próxima do `dueDay`).
- **Próxima fatura**: fatura seguinte à atual, com compras já lançadas (parcelas futuras) mas ainda dentro do período em aberto.
- Uma compra realizada **após** o fechamento do mês corrente é automaticamente alocada na fatura seguinte.
- O valor da fatura é a soma de todas as `Transactions` (`type = "expense"`, `paymentMethod = "credit"`) cujo `date` cai dentro do período da fatura.
- Ao vencer uma fatura (data atual ultrapassa `dueDay`), o sistema não gera transação de pagamento automaticamente nesta fase — é apenas informativo no Dashboard/Detalhes do Cartão (funcionalidade de pagamento automático da fatura é uma melhoria futura).

---

# Workspace

Todos os dados pertencem ao Workspace.

Nunca diretamente ao usuário.

Usuários do mesmo Workspace visualizam exatamente os mesmos dados.

## Matriz de Permissões

| Ação | Admin | Editor | Viewer |
|---|:---:|:---:|:---:|
| Visualizar dados (Dashboard, lançamentos, relatórios) | ✅ | ✅ | ✅ |
| Criar/editar/excluir Receitas e Despesas | ✅ | ✅ | ❌ |
| Criar/editar/excluir Parcelamentos | ✅ | ✅ | ❌ |
| Criar/editar/excluir Transferências | ✅ | ✅ | ❌ |
| Criar/editar/excluir Contas, Cartões, Categorias | ✅ | ✅ | ❌ |
| Convidar/remover membros, alterar roles | ✅ | ❌ | ❌ |
| Alterar configurações do Workspace | ✅ | ❌ | ❌ |
| Excluir/arquivar o Workspace | ✅ (somente `ownerId`) | ❌ | ❌ |
| Visualizar Logs de auditoria | ✅ | ❌ | ❌ |

---

# Usuários

Cada usuário poderá participar de vários Workspaces.

Cada Workspace poderá possuir vários usuários.

---

# Dashboard

O Dashboard deverá mostrar:

Saldo do mês

Receitas

Despesas

Saldo da primeira quinzena

Saldo da segunda quinzena

Cartões

Próximos vencimentos

Últimos lançamentos

Resumo financeiro

---

# Atualização Automática dos Saldos

O saldo de uma conta (`Accounts.balance`) nunca é editado manualmente pelo usuário — é sempre derivado das operações realizadas:

| Operação | Efeito no saldo |
|---|---|
| Criar receita (`type = "income"`) na conta X | `+amount` em X |
| Criar despesa não-cartão (`paymentMethod != "credit"`) na conta X | `-amount` em X |
| Criar despesa no cartão (`paymentMethod = "credit"`) | Nenhum efeito direto em conta (afeta apenas o limite do cartão) |
| Excluir/editar um lançamento | Reverte o efeito anterior e aplica o novo valor (transação atômica) |
| Transferência entre contas | `-amount` na conta de origem, `+amount` na conta de destino |
| Pagamento manual de fatura (futuro) | `-amount` na conta de pagamento |

Toda alteração de saldo deve ocorrer dentro da mesma execução do Apps Script que grava o lançamento (operação atômica), evitando saldo inconsistente caso a segunda escrita falhe.

---

# Movimentação Entre Contas

Permitir transferências entre contas (`Transfers`).

Exemplo

Nubank

↓

PicPay

Regras:

- Não gera lançamento em `Transactions` (não é receita nem despesa) e portanto **não** entra no cálculo do "Saldo do Mês".
- Debita `fromAccountId.balance` e credita `toAccountId.balance` na mesma operação.
- `fromAccountId` e `toAccountId` devem pertencer ao mesmo Workspace e ser diferentes entre si.
- Sem alterar o patrimônio total do Workspace (soma de todos os `Accounts.balance` permanece igual antes e depois).

---

# Recorrências

Lançamentos recorrentes (`isRecurring = true`) representam receitas/despesas que se repetem mensalmente (ex.: salário, assinatura de streaming, aluguel).

Regras:

- Ao criar um lançamento recorrente, o sistema gera automaticamente ocorrências futuras (padrão: os próximos 12 meses), todas compartilhando o mesmo `recurrenceGroupId`.
- Cada ocorrência é uma `Transaction` independente (permite edição/exclusão pontual de um mês específico sem afetar as demais).
- Editar "esta e as futuras" atualiza todas as ocorrências com `date >= data da ocorrência editada` e mesmo `recurrenceGroupId`; ocorrências passadas nunca são alteradas retroativamente.
- Excluir uma recorrência oferece as opções: "somente esta ocorrência", "esta e as futuras" ou "todas as ocorrências" (passadas inclusive, como correção de cadastro).
- Ao chegar próximo do fim das ocorrências geradas (ex.: faltando 2 meses), o sistema deve gerar automaticamente mais 12 meses à frente (job periódico ou geração sob demanda ao consultar o Dashboard).

---

# Regras para Exclusão

Ao excluir uma compra parcelada, o usuário poderá escolher:

Excluir apenas esta parcela

ou

Excluir todas as parcelas (futuras — parcelas já vencidas/passadas permanecem no histórico).

Regras gerais de exclusão (aplicável a Transactions, Transfers, Accounts, Cards, Categories):

- Toda exclusão é lógica (`deletedAt`/`archivedAt`), nunca física — preserva histórico para relatórios e Logs.
- Exclusão de uma `Transaction` reverte automaticamente seu efeito no `Accounts.balance` (ou no limite do cartão).
- Exclusão de uma parcela isolada não recalcula o `installmentAmount` das demais parcelas.
- Exclusão de uma `Category`, `Account` ou `Card` que possua lançamentos vinculados não excluídos exige confirmação explícita (`force: true`) e não exclui os lançamentos — apenas impede novos lançamentos na entidade arquivada.
- Toda exclusão gera um registro em `Logs` (`action = "delete"`).

---

# Regras para Edição

Ao editar uma compra parcelada, o usuário poderá escolher:

Editar apenas esta parcela

ou

Editar todas as parcelas (a partir da parcela atual, inclusive; parcelas passadas nunca são alteradas retroativamente).

Regras gerais de edição:

- Alterar `paymentMethod` de uma despesa exige revalidar `accountId`/`cardId` conforme regra condicional (ver API.md).
- Alterar o `amount` de uma transação já contabilizada exige reverter o valor antigo e aplicar o novo no `Accounts.balance` (ou limite do cartão) na mesma operação.
- Toda edição gera um registro em `Logs` (`action = "update"`) com o diff (`metadata`) entre valores antigos e novos.

---

# Sincronização Entre Membros

Todo lançamento realizado por qualquer membro deverá ficar imediatamente disponível para todos os membros do Workspace.

Regras:

- Não existe dado "privado" dentro de um Workspace — todos os membros ativos enxergam os mesmos Accounts, Cards, Categories, Transactions, Installments e Transfers.
- O frontend deve buscar os dados diretamente da API a cada entrada na tela (sem cache persistente entre sessões) para refletir alterações feitas por outros membros; um mecanismo de "pull to refresh" e/ou revalidação ao focar a aba é recomendado.
- Cada `Transaction`/`Transfer` registra `createdBy`/`updatedBy`, permitindo filtrar "meus lançamentos" e exibir avatar de autoria, mesmo sendo dado compartilhado.
- Alterações de `role` ou remoção de membro têm efeito imediato: um usuário rebaixado a `viewer` perde acesso de escrita na próxima chamada à API (validado a cada requisição, nunca apenas no login).

---

# Validações

Resumo das validações centrais aplicadas pelo backend (detalhamento por método em API.md):

- Todo valor monetário (`amount`, `limit`, `totalAmount`) deve ser um número maior que zero.
- Toda data (`date`, `startDate`, `dueDate`) deve ser uma data válida no formato ISO 8601.
- `categoryId` deve existir, pertencer ao mesmo Workspace e ter `type` compatível com o lançamento.
- Despesas com `paymentMethod = "credit"` exigem `cardId` e não podem informar `accountId` (e vice-versa para os demais métodos).
- `installmentsCount` deve estar entre 2 e 60.
- `fortnightSplitDay`/`monthStartDay` devem estar entre 1 e 28 (evita problemas com meses de 28/29/30/31 dias).
- E-mails de convite devem ser válidos (regex/RFC 5322) e não podem já possuir um convite `pending` para o mesmo Workspace.
- Toda ação de escrita exige `role` compatível (ver Matriz de Permissões).
- Todo `workspaceId` recebido deve corresponder a um Workspace onde o usuário autenticado é membro `status = active` (nunca confiar apenas no `workspaceId` enviado pelo cliente).

---

# Compartilhamento

Todo lançamento realizado por qualquer membro deverá ficar imediatamente disponível para todos os membros do Workspace.

---

# Objetivo

O sistema deverá substituir completamente a planilha financeira atualmente utilizada pelo usuário.