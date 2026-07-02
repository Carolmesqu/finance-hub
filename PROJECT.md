# FinanceHub

## Visão Geral

Desenvolver um sistema financeiro moderno, colaborativo e responsivo para gerenciamento de finanças pessoais e compartilhadas.

O sistema deverá substituir completamente uma planilha do Google Sheets, oferecendo uma experiência semelhante a aplicativos modernos como Nubank, Notion e Todoist.

O projeto deverá ser desenvolvido pensando em escalabilidade, organização do código e facilidade de manutenção.

---

# Objetivos

O sistema deverá permitir que uma pessoa controle sua vida financeira individualmente ou compartilhe seu ambiente financeiro com outras pessoas (casal, família, sócios etc.).

Todo o sistema deverá funcionar tanto em desktop quanto em dispositivos móveis.

O sistema deverá ser uma Progressive Web App (PWA).

---

# Tecnologias Obrigatórias

Frontend

- HTML5
- CSS3
- JavaScript ES Modules
- Mobile First
- SPA (Single Page Application)
- PWA

Backend

- Google Apps Script
- Google Sheets como banco de dados

Autenticação

- Firebase Authentication
- Login com Google

Hospedagem

- GitHub Pages

Versionamento

- GitHub

---

# Arquitetura

Utilizar arquitetura modular.

Exemplo:

/assets
/css
/js
/components
/pages
/services
/utils
/router
/state

Cada módulo deverá possuir responsabilidade única.

Não utilizar jQuery.

Não utilizar frameworks.

Todo o projeto deverá utilizar JavaScript puro.

---

# Autenticação

O sistema deverá utilizar Firebase Authentication.

O login deverá ser realizado exclusivamente utilizando contas Google.

Após autenticar:

- salvar sessão
- restaurar sessão automaticamente
- realizar logout
- proteger rotas

---

# Conceito principal

O sistema NÃO pertence ao usuário.

O sistema pertence a um Workspace.

Inspirar-se em:

- Notion
- Trello
- Google Drive

Cada usuário poderá participar de vários Workspaces.

Exemplo

Maria

• Casa
• Empresa
• Viagem

Lucas

• Casa
• Empresa

Cada Workspace possui seus próprios dados.

---

# Workspace

Cada Workspace deverá possuir:

id

nome

data criação

foto (opcional)

moeda

membros

configurações

Todos os dados deverão pertencer ao Workspace.

Nunca diretamente ao usuário.

---

# Permissões

Administrador

- convidar usuários
- remover usuários
- alterar permissões
- excluir Workspace

Editor

- criar lançamentos
- editar lançamentos
- excluir lançamentos

Visualizador

- apenas visualizar

---

# Convites

O sistema deverá permitir compartilhar um Workspace.

Inicialmente poderá ser feito por:

- e-mail

Posteriormente:

- link
- código

---

# Dashboard

Ao entrar no sistema deverá existir um Dashboard contendo:

Foto do usuário

Nome

Saudação dinâmica

Saldo atual

Receitas do mês

Despesas do mês

Economia do mês

Cartões

Próximos vencimentos

Últimos lançamentos

Gráfico mensal

Resumo anual

---

# Receitas

Cadastrar

Editar

Excluir

Categorias

Filtros

Pesquisar

Receitas recorrentes

Receitas únicas

---

# Despesas

Cadastrar

Editar

Excluir

Categoria

Forma de pagamento

Conta

Cartão

PIX

Dinheiro

Boleto

Parcelado

À vista

Recorrente

Observações

Comprovante (futuro)

---

# Parcelamentos

O usuário informa:

Notebook

4800

12 parcelas

O sistema deverá gerar automaticamente:

1/12

2/12

3/12

...

12/12

Cada parcela deverá aparecer automaticamente no mês correspondente.

---

# Cartões

Cadastrar cartões.

Cada cartão possui:

Nome

Cor

Limite

Fechamento

Vencimento

Bandeira

Banco

Mostrar:

Limite

Disponível

Utilizado

Fatura atual

Próxima fatura

Compras

Parcelamentos

Histórico

---

# Contas

Cadastrar contas bancárias.

Exemplos

Nubank

Inter

PicPay

Mercado Pago

Santander

Caixa

Conta corrente

Conta poupança

Carteira

Dinheiro

PIX

---

# Categorias

Criar categorias personalizadas.

Exemplo

Mercado

Combustível

Farmácia

Educação

Casa

Internet

Lazer

Streaming

Viagem

Investimentos

Salário

Extras

Freelancer

---

# Transferências

Permitir transferências entre contas.

Exemplo

Nubank

↓

PicPay

Sem alterar o patrimônio total.

---

# Relatórios

Mensal

Anual

Por categoria

Por cartão

Por conta

Por usuário

Exportar PDF

Exportar Excel

---

# Pesquisa

Pesquisar qualquer lançamento.

Filtros por:

período

categoria

conta

cartão

tipo

usuário

---

# Interface

Inspirar-se em:

Nubank

Notion

Google Calendar

Todoist

Material Design 3

Interface limpa.

Minimalista.

Poucas cores.

Ícones modernos.

Animações suaves.

Dark Mode.

Light Mode.

---

# Mobile

Todo o sistema deverá ser Mobile First.

Funcionar perfeitamente em:

Android

iPhone

Tablet

Desktop

---

# Componentização

Criar componentes reutilizáveis.

Header

Sidebar

Bottom Navigation

Cards

Botões

Inputs

Modais

Dropdowns

Tabelas

Calendário

---

# Performance

Evitar duplicação de código.

Separar regras de negócio da interface.

Utilizar Services.

Utilizar Utils.

Criar State global.

Criar Router.

---

# Google Sheets

O Google Sheets será utilizado apenas como banco de dados.

Nunca como interface.

Toda comunicação deverá ocorrer através de Google Apps Script.

Criar camada de API.

Frontend nunca deverá acessar a planilha diretamente.

---

# Estrutura do Banco

Criar uma planilha para:

Usuários

Workspaces

Membros

Receitas

Despesas

Parcelamentos

Cartões

Contas

Categorias

Transferências

Configurações

Logs

---

# PWA

Permitir instalação.

Offline quando possível.

Atualização automática.

Push Notifications futuramente.

---

# Qualidade

Todo código deverá ser:

limpo

comentado

modular

escalável

responsivo

reutilizável

seguir boas práticas

seguir princípios SOLID quando aplicável

seguir arquitetura limpa

---

# Desenvolvimento

Desenvolver o projeto por etapas.

Nunca gerar todo o sistema de uma única vez.

Sempre criar uma funcionalidade completa antes da próxima.

Cada etapa deverá entregar um sistema funcional.
