# API — Contrato Frontend ↔ Google Apps Script

## Visão Geral

O Google Apps Script expõe um único Web App (`doPost`) que atua como roteador de ações (padrão *action dispatcher*), evitando múltiplos deployments. Todo acesso ao Google Sheets passa obrigatoriamente por este contrato — o frontend nunca lê a planilha diretamente.

### Envelope de Requisição

```json
{
  "action": "transaction.create",
  "idToken": "<Firebase ID Token>",
  "workspaceId": "ws_123",
  "payload": { }
}
```

- `action`: string no formato `"<módulo>.<método>"`.
- `idToken`: token JWT do Firebase Authentication, validado em toda chamada (exceto `auth.verify` inicial).
- `workspaceId`: obrigatório em todas as ações que não sejam do módulo `auth` ou `workspace.create`/`workspace.list`.
- `payload`: corpo específico de cada método.

### Envelope de Resposta

```json
{
  "success": true,
  "data": { },
  "error": null
}
```

Em caso de erro:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "O campo 'amount' é obrigatório.",
    "field": "amount"
  }
}
```

### Códigos de Erro Padrão (usados por todos os módulos)

| Código | Descrição |
|---|---|
| `AUTH_INVALID_TOKEN` | Token Firebase ausente, inválido ou expirado. |
| `FORBIDDEN` | Usuário autenticado, mas sem permissão (role) para a ação. |
| `WORKSPACE_NOT_FOUND` | `workspaceId` inexistente ou usuário não é membro. |
| `NOT_FOUND` | Registro solicitado não existe (ou foi excluído). |
| `VALIDATION_ERROR` | Payload inválido (campo obrigatório ausente, tipo incorreto, etc.). |
| `CONFLICT` | Violação de regra de unicidade ou estado (ex.: e-mail já convidado). |
| `INTERNAL_ERROR` | Erro inesperado no Apps Script. |

### Regra de Validação Transversal

Toda ação que altera dados (`create`, `update`, `delete`) deve validar, nesta ordem:
1. Token válido (`AUTH_INVALID_TOKEN`).
2. Usuário é membro ativo do `workspaceId` informado (`WORKSPACE_NOT_FOUND`).
3. Role do usuário permite a ação (`FORBIDDEN`) — ver matriz de permissões em BUSINESS_RULES.md.
4. Payload respeita o schema da entidade (`VALIDATION_ERROR`).

---

## Módulo `auth`

### `auth.verify`
Valida o token do Firebase e retorna (ou cria) o registro correspondente em `Users`.

- **Entrada**: `idToken`.
- **Saída**: `{ user: User, workspaces: Workspace[] }` — lista de Workspaces em que o usuário é membro ativo.
- **Erros possíveis**: `AUTH_INVALID_TOKEN`.
- **Validações**: token deve ser emitido pelo projeto Firebase configurado; provedor deve ser `google.com`.

### `auth.logout`
Invalida a sessão do lado do servidor (registro de log). O logout do Firebase acontece no cliente.

- **Entrada**: `idToken`.
- **Saída**: `{ success: true }`.
- **Erros possíveis**: `AUTH_INVALID_TOKEN`.

---

## Módulo `workspace`

### `workspace.list`
Lista todos os Workspaces em que o usuário autenticado é membro ativo.

- **Entrada**: nenhum payload adicional (`idToken` apenas).
- **Saída**: `Workspace[]` (incluindo `role` do usuário em cada um).
- **Erros possíveis**: `AUTH_INVALID_TOKEN`.

### `workspace.create`
Cria um novo Workspace e vincula o criador como `admin`. Popula categorias padrão automaticamente.

- **Entrada**: `{ name, currency?, photoURL? }`.
- **Saída**: `Workspace` criado.
- **Erros possíveis**: `AUTH_INVALID_TOKEN`, `VALIDATION_ERROR` (nome ausente).
- **Validações**: `name` obrigatório (mín. 2 caracteres); `currency` deve ser um código ISO 4217 válido (default `"BRL"`).

### `workspace.update`
Atualiza metadados do Workspace (nome, moeda, foto).

- **Entrada**: `{ name?, currency?, photoURL? }`.
- **Saída**: `Workspace` atualizado.
- **Erros possíveis**: `FORBIDDEN` (somente `admin`), `VALIDATION_ERROR`, `WORKSPACE_NOT_FOUND`.

### `workspace.archive`
Arquiva (soft delete) o Workspace.

- **Entrada**: nenhum payload adicional.
- **Saída**: `{ success: true }`.
- **Erros possíveis**: `FORBIDDEN` (somente `admin`/`owner`), `WORKSPACE_NOT_FOUND`.
- **Validações**: apenas o `ownerId` pode arquivar (regra mais restritiva que `admin` comum).

### `workspace.inviteMember`
Cria um convite (`Invites`) para um e-mail.

- **Entrada**: `{ email, role }`.
- **Saída**: `Invite` criado.
- **Erros possíveis**: `FORBIDDEN` (somente `admin`), `VALIDATION_ERROR` (e-mail inválido ou role inválida), `CONFLICT` (convite pendente já existe para este e-mail).
- **Validações**: `role` deve ser `admin`, `editor` ou `viewer`; `email` deve ser válido.

### `workspace.acceptInvite`
Aceita um convite pendente, criando o registro em `Members`.

- **Entrada**: `{ token }`.
- **Saída**: `Member` criado + `Workspace`.
- **Erros possíveis**: `NOT_FOUND` (token inválido), `CONFLICT` (convite expirado/já aceito).
- **Validações**: e-mail do convite deve corresponder ao e-mail do usuário autenticado; convite deve estar `pending` e não expirado.

### `workspace.declineInvite`
Recusa um convite pendente, sem criar vínculo de membro. Marca o convite como `revoked` (mesmo status usado por `revokeInvite`, distinguindo apenas quem tomou a ação: o próprio destinatário).

- **Entrada**: `{ token }`.
- **Saída**: `{ success: true }`.
- **Erros possíveis**: `NOT_FOUND` (token inválido), `CONFLICT` (convite pertence a outro e-mail).
- **Validações**: e-mail do convite deve corresponder ao e-mail do usuário autenticado.

### `workspace.revokeInvite`
Cancela um convite pendente antes de ser aceito ou recusado. Diferente de `declineInvite`, é executado pelo **administrador** do Workspace (não pelo destinatário).

- **Entrada**: `{ inviteId }`.
- **Saída**: `{ success: true }`.
- **Erros possíveis**: `FORBIDDEN` (somente `admin`), `NOT_FOUND`.
- **Validações**: `inviteId` deve pertencer ao `workspaceId` informado no envelope da requisição.

### `workspace.listMembers`
Lista membros ativos e convites pendentes do Workspace.

- **Entrada**: nenhum payload adicional.
- **Saída**: `{ members: Member[], invites: Invite[] }`.
- **Erros possíveis**: `FORBIDDEN` (qualquer role pode visualizar), `WORKSPACE_NOT_FOUND`.

### `workspace.listMyInvites`
Lista os convites pendentes destinados ao e-mail do usuário autenticado, independente do Workspace de origem. Usado na tela de Seleção de Workspace, antes mesmo de haver um `workspaceId` ativo.

- **Entrada**: nenhum payload adicional (não exige `workspaceId`).
- **Saída**: `Invite[]` (cada item inclui `workspaceName` denormalizado, para exibição, além do `token` — necessário para o próprio destinatário chamar `acceptInvite`/`declineInvite`).
- **Erros possíveis**: `AUTH_INVALID_TOKEN`.

### `workspace.updateMemberRole`
Altera o papel de um membro.

- **Entrada**: `{ memberId, role }`.
- **Saída**: `Member` atualizado.
- **Erros possíveis**: `FORBIDDEN` (somente `admin`), `VALIDATION_ERROR`, `NOT_FOUND`.
- **Validações**: não permitir rebaixar o único `admin` restante do Workspace.

### `workspace.removeMember`
Remove (soft delete) um membro do Workspace.

- **Entrada**: `{ memberId }`.
- **Saída**: `{ success: true }`.
- **Erros possíveis**: `FORBIDDEN` (somente `admin`), `NOT_FOUND`.
- **Validações**: não permitir remover o `ownerId` do Workspace.

---

## Módulo `account`

### `account.list`
- **Entrada**: `{ includeArchived? }`.
- **Saída**: `Account[]`.
- **Erros possíveis**: `WORKSPACE_NOT_FOUND`.

### `account.create`
- **Entrada**: `{ name, type, institution?, balance?, color?, icon?, includeInTotal? }`.
- **Saída**: `Account` criada.
- **Erros possíveis**: `FORBIDDEN` (`viewer` não pode), `VALIDATION_ERROR`.
- **Validações**: `name` obrigatório; `type` deve pertencer ao enum; `balance` inicial default `0`.

### `account.update`
- **Entrada**: `{ accountId, name?, type?, institution?, color?, icon?, includeInTotal? }`.
- **Saída**: `Account` atualizada.
- **Erros possíveis**: `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`.
- **Validações**: `balance` **não** é editável diretamente por este método (é derivado — ver BUSINESS_RULES.md); qualquer tentativa de enviar `balance` é ignorada.

### `account.archive`
- **Entrada**: `{ accountId }`.
- **Saída**: `{ success: true }`.
- **Erros possíveis**: `FORBIDDEN`, `NOT_FOUND`, `CONFLICT` (conta possui transações não excluídas — exige confirmação explícita `force: true` no payload).

---

## Módulo `card`

### `card.list`
- **Entrada**: `{ includeArchived? }`.
- **Saída**: `Card[]` com campos calculados (ver `card.getSummary`).
- **Erros possíveis**: `WORKSPACE_NOT_FOUND`.

### `card.create`
- **Entrada**: `{ name, limit, closingDay, dueDay, brand?, institution?, color?, billingAccountId? }`.
- **Saída**: `Card` criado.
- **Erros possíveis**: `FORBIDDEN`, `VALIDATION_ERROR`.
- **Validações**: `closingDay`/`dueDay` entre 1 e 31; `limit` > 0.

### `card.update`
- **Entrada**: `{ cardId, ...camposEditáveis }`.
- **Saída**: `Card` atualizado.
- **Erros possíveis**: `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`.

### `card.archive`
- **Entrada**: `{ cardId }`.
- **Saída**: `{ success: true }`.
- **Erros possíveis**: `FORBIDDEN`, `NOT_FOUND`, `CONFLICT` (parcelas futuras em aberto vinculadas).

### `card.getSummary`
Retorna dados calculados de um cartão: limite usado, disponível, fatura atual e próxima.

- **Entrada**: `{ cardId }`.
- **Saída**: `{ limit, used, available, currentInvoice: { period, total, transactions }, nextInvoice: { period, total, transactions } }`.
- **Erros possíveis**: `NOT_FOUND`.
- **Regras de cálculo**: fatura atual = soma de `Transactions` com `cardId` cuja `date` está entre o fechamento anterior e o próximo fechamento (`closingDay`), ainda não vencida; ver detalhamento em BUSINESS_RULES.md.

---

## Módulo `category`

### `category.list`
- **Entrada**: `{ type? }` (filtra por `"income"`/`"expense"`).
- **Saída**: `Category[]`.
- **Erros possíveis**: `WORKSPACE_NOT_FOUND`.

### `category.create`
- **Entrada**: `{ name, type, color?, icon?, parentId? }`.
- **Saída**: `Category` criada.
- **Erros possíveis**: `FORBIDDEN`, `VALIDATION_ERROR`.
- **Validações**: `name` único por (`workspaceId`,`type`); `parentId` deve pertencer ao mesmo `type`.

### `category.update`
- **Entrada**: `{ categoryId, name?, color?, icon?, parentId? }`.
- **Saída**: `Category` atualizada.
- **Erros possíveis**: `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`.

### `category.archive`
- **Entrada**: `{ categoryId }`.
- **Saída**: `{ success: true }`.
- **Erros possíveis**: `FORBIDDEN`, `NOT_FOUND`, `CONFLICT` (categorias padrão `isDefault: true` não podem ser arquivadas).

---

## Módulo `transaction`

### `transaction.list`
- **Entrada**: `{ startDate?, endDate?, type?, categoryId?, accountId?, cardId?, createdBy?, search?, page?, pageSize? }`.
- **Saída**: `{ items: Transaction[], total, page, pageSize }`.
- **Erros possíveis**: `WORKSPACE_NOT_FOUND`.
- **Validações**: `startDate` ≤ `endDate` quando ambos informados; `pageSize` máximo 100.

### `transaction.get`
- **Entrada**: `{ transactionId }`.
- **Saída**: `Transaction`.
- **Erros possíveis**: `NOT_FOUND`.

### `transaction.create`
- **Entrada**: `{ type, description, amount, date, categoryId, accountId?, cardId?, paymentMethod, paymentPeriod?, isRecurring?, notes? }`.
- **Saída**: `Transaction` criada.
- **Erros possíveis**: `FORBIDDEN` (`viewer` não pode), `VALIDATION_ERROR`.
- **Validações**:
  - `amount` > 0.
  - `categoryId` deve existir e ter `type` compatível com o lançamento.
  - Se `paymentMethod === "credit"` → `cardId` obrigatório, `accountId` deve ser nulo.
  - Se `paymentMethod !== "credit"` → `accountId` obrigatório, `cardId` deve ser nulo.
  - Se `type === "expense"` → `paymentPeriod` obrigatório (`"start_of_month"` ou `"fortnight"`).
  - Se `isRecurring === true` → o backend gera automaticamente lançamentos futuros (ver BUSINESS_RULES.md § Recorrências) e associa o mesmo `recurrenceGroupId`.
  - Ao salvar, o backend atualiza `Accounts.balance` correspondente (ver BUSINESS_RULES.md § Atualização automática dos saldos).

### `transaction.update`
- **Entrada**: `{ transactionId, ...camposEditáveis, applyToAllInstallments?, applyToAllRecurrences? }`.
- **Saída**: `Transaction` atualizada (ou `Transaction[]` quando `applyToAll* = true`).
- **Erros possíveis**: `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`.
- **Validações**: mesmas de `create`; se a transação pertence a um `installmentPlanId` e `applyToAllInstallments = true`, aplica a alteração (descrição/categoria/valor futuro) a todas as parcelas com `date >= hoje`; parcelas passadas nunca são alteradas retroativamente.

### `transaction.delete`
- **Entrada**: `{ transactionId, applyToAllInstallments?, applyToAllRecurrences? }`.
- **Saída**: `{ success: true, deletedIds: string[] }`.
- **Erros possíveis**: `FORBIDDEN`, `NOT_FOUND`.
- **Validações**: soft delete (`deletedAt`); reverte o impacto no `Accounts.balance`; se `applyToAllInstallments = true`, aplica a todas as parcelas futuras (não às já passadas/pagas).

---

## Módulo `installment`

### `installment.create`
Cria o plano e gera automaticamente todas as parcelas em `Transactions`.

- **Entrada**: `{ description, totalAmount, installmentsCount, startDate, categoryId, cardId?, accountId? }`.
- **Saída**: `{ installment: Installment, transactions: Transaction[] }`.
- **Erros possíveis**: `FORBIDDEN`, `VALIDATION_ERROR`.
- **Validações**: `installmentsCount` entre 2 e 60; `totalAmount` > 0; exatamente um entre `cardId`/`accountId` deve ser informado; `installmentAmount = round(totalAmount / installmentsCount, 2)`, com a última parcela ajustada para que a soma bata exatamente com `totalAmount`.

### `installment.get`
- **Entrada**: `{ installmentId }`.
- **Saída**: `{ installment: Installment, transactions: Transaction[] }`.
- **Erros possíveis**: `NOT_FOUND`.

### `installment.cancel`
Cancela parcelas futuras não pagas de um plano.

- **Entrada**: `{ installmentId }`.
- **Saída**: `{ success: true, cancelledTransactionIds: string[] }`.
- **Erros possíveis**: `FORBIDDEN`, `NOT_FOUND`.
- **Validações**: equivalente a `transaction.delete` com `applyToAllInstallments: true` a partir da parcela atual.

---

## Módulo `transfer`

### `transfer.list`
- **Entrada**: `{ startDate?, endDate?, accountId? }`.
- **Saída**: `Transfer[]`.
- **Erros possíveis**: `WORKSPACE_NOT_FOUND`.

### `transfer.create`
- **Entrada**: `{ fromAccountId, toAccountId, amount, date, notes? }`.
- **Saída**: `Transfer` criada.
- **Erros possíveis**: `FORBIDDEN`, `VALIDATION_ERROR`.
- **Validações**: `fromAccountId !== toAccountId`; `amount` > 0; ambas as contas devem pertencer ao mesmo Workspace. Debita `fromAccountId.balance` e credita `toAccountId.balance` atomicamente.

### `transfer.delete`
- **Entrada**: `{ transferId }`.
- **Saída**: `{ success: true }`.
- **Erros possíveis**: `FORBIDDEN`, `NOT_FOUND`.
- **Validações**: soft delete; reverte os saldos das duas contas envolvidas.

---

## Módulo `settings`

### `settings.get`
- **Entrada**: nenhum payload adicional.
- **Saída**: `Settings`.
- **Erros possíveis**: `WORKSPACE_NOT_FOUND`.

### `settings.update`
- **Entrada**: `{ fortnightSplitDay?, monthStartDay?, theme?, notificationsEnabled?, defaultAccountId? }`.
- **Saída**: `Settings` atualizado.
- **Erros possíveis**: `FORBIDDEN` (somente `admin`), `VALIDATION_ERROR`.
- **Validações**: `fortnightSplitDay`/`monthStartDay` entre 1 e 28.

---

## Módulo `dashboard`

### `dashboard.getSummary`
Agrega os dados exibidos na tela inicial.

- **Entrada**: `{ month, year }`.
- **Saída**:
```json
{
  "balance": 0,
  "totalIncome": 0,
  "totalExpense": 0,
  "startOfMonth": { "total": 0, "paid": 0, "pending": 0 },
  "fortnight": { "total": 0, "paid": 0, "pending": 0 },
  "cards": [ { "cardId": "", "invoiceTotal": 0, "dueDate": "" } ],
  "upcomingDue": [ ],
  "recentTransactions": [ ],
  "monthlyChart": [ { "month": "2026-01", "income": 0, "expense": 0 } ],
  "yearlySummary": { "totalIncome": 0, "totalExpense": 0, "balance": 0 }
}
```
- **Erros possíveis**: `WORKSPACE_NOT_FOUND`, `VALIDATION_ERROR` (mês/ano inválidos).
- **Regras de cálculo**: ver BUSINESS_RULES.md § Saldo do Mês e § Quinzena.

---

## Módulo `report`

### `report.generate`
- **Entrada**: `{ type: "monthly"|"annual"|"byCategory"|"byCard"|"byAccount"|"byMember", startDate, endDate, format?: "json"|"pdf"|"xlsx" }`.
- **Saída**: `{ data: object }` (json) ou `{ fileURL: string }` (pdf/xlsx).
- **Erros possíveis**: `WORKSPACE_NOT_FOUND`, `VALIDATION_ERROR`.

---

## Módulo `log`

### `log.list`
- **Entrada**: `{ entity?, entityId?, userId?, startDate?, endDate?, page?, pageSize? }`.
- **Saída**: `{ items: Log[], total, page, pageSize }`.
- **Erros possíveis**: `FORBIDDEN` (somente `admin`), `WORKSPACE_NOT_FOUND`.
