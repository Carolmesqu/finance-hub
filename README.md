# FinanceHub 💼📈

O **FinanceHub** é uma aplicação completa de controle financeiro pessoal e colaborativo, projetada para ser leve, moderna e instalável (PWA). O projeto utiliza uma arquitetura inovadora sem servidores dedicados ou banco de dados relacional clássico: os dados são persistidos de forma segura e organizada no **Google Sheets** de cada Workspace através de uma API em **Google Apps Script**, utilizando o **Firebase Authentication** para autenticação e gestão de perfis.

---

## 🚀 Funcionalidades Principais

* **Instalabilidade & Offline (PWA)**:
  - Totalmente compatível com PWA. Habilita instalação nativa em celulares (Android/iOS) e desktops.
  - Carregamento instantâneo do App Shell através de cache local via Service Worker (`sw.js`).
  - Identificação de queda de rede com uma barra de status dinâmica informando o modo offline.
* **Dashboard Consolidado**:
  - Indicadores mensais de receitas, despesas e saldo líquido.
  - Gráficos interativos de evolução financeira.
  - Alertas de contas e faturas a vencer nos próximos 7 dias.
  - Atalhos de ações rápidas (`+ Receita`, `+ Despesa`, `+ Transferência`) com atualização instantânea de saldos.
* **Módulo de Receitas e Despesas (Transações)**:
  - Lançamentos categorizados por tipo (alimentação, lazer, transporte, etc.) e conta de liquidação.
  - Suporte completo a **lançamentos recorrentes** e **parcelamentos** (com recálculo de dízimas na divisão e exclusão/edição em cascata).
* **Módulo de Cartões de Crédito**:
  - Limite total e limite disponível calculado automaticamente.
  - Lançamento automático de parcelas em faturas futuras com base nas datas de fechamento e vencimento.
* **Módulo de Transferências entre Contas**:
  - Movimentações de saldo entre contas atômicas (débito de origem, crédito de destino) com reversão de saldos ao deletar a transferência.
* **Módulo de Relatórios**:
  - Filtros avançados por período, categoria, conta e cartão.
  - Visualização de gastos por quinzena e agrupamento de categorias.
  - Exportação direta de dados nos formatos **CSV** e **PDF**.

---

## 🛠️ Stack Tecnológica

### Frontend (SPA)
- **HTML5** semântico.
- **CSS3** nativo (sem frameworks de estilização, utilizando CSS Custom Properties para variáveis de design e temas claro/escuro).
- **JavaScript Moderno (ES6+)**: SPA Router com escopo de rotas seguro (Guard), gerenciamento de estado global reativo.

### Backend & Persistência (Serverless)
- **Google Sheets**: Banco de dados estruturado em planilhas por workspace.
- **Google Apps Script**: Camada de banco de dados e APIs RESTful em JS.
  - **Concorrência**: Implementado `LockService` nas operações de escrita para evitar condições de corrida (Lost Updates).
  - **Performance**: Implementado cache local em memória por request para diminuir requisições físicas e agilizar o tempo de carregamento do Dashboard e Relatórios.
- **Firebase Authentication**: Login social com Google Accounts e persistência contínua de sessão.

---

## 📂 Estrutura de Pastas

```text
├── .github/              # Instruções de desenvolvimento
├── apps-script/          # Código fonte do backend (Google Apps Script)
│   ├── Code.gs           # Entrada principal e roteador das APIs
│   ├── Database.gs       # Camada de persistência, LockService e Cache
│   ├── Transfer.gs       # Regras de negócios e CRUD de transferências
│   ├── Transaction.gs    # Regras e CRUD de transações
│   ├── Installment.gs    # Tratamento de parcelas e recorrências
│   └── ...
├── assets/               # Recursos estáticos da SPA (CSS e JS)
│   ├── css/              # Folhas de estilo estruturadas por componentes e páginas
│   ├── img/              # Ícones e logotipos do PWA
│   └── js/               # Lógica de componentes, services e páginas do Frontend
├── docs/                 # Documentação de banco de dados, APIs e regras de negócio
├── index.html            # Ponto de entrada HTML e vinculação do manifest PWA
├── manifest.json         # Manifesto de configuração da PWA
├── sw.js                 # Service Worker (Cache, Stale-while-revalidate e Offline)
└── CHANGELOG.md          # Histórico de versões
```

---

## ⚙️ Instalação e Configuração

### Passo 1: Configurar a Planilha Google Sheets e Apps Script
1. Crie uma planilha em branco no seu Google Drive.
2. No menu superior, vá em **Extensões** -> **Apps Script**.
3. Copie todos os arquivos `.gs` presentes na pasta `/apps-script` do repositório para o editor de scripts do Google.
4. No editor de scripts, selecione a função `initializeDatabase` e clique em **Executar** para estruturar os cabeçalhos das tabelas na planilha.
5. No canto superior direito, clique em **Implantar** -> **Nova implantação**.
6. Selecione o tipo **Aplicativo da Web**:
   - *Executar como*: `Você (seu e-mail)`.
   - *Quem tem acesso*: `Qualquer pessoa`.
7. Copie a **URL do aplicativo da web** gerada (URL que termina com `/exec`).
8. Cole essa URL na variável `APPS_SCRIPT_URL` dentro do arquivo [appConfig.js](file:///c:/Users/carol/OneDrive/Desktop/controle-financeiro/assets/js/config/appConfig.js).

### Passo 2: Configurar o Firebase Authentication
1. Crie um projeto no console do [Firebase](https://console.firebase.google.com/).
2. Vá em **Authentication** -> **Sign-in method** e ative o provedor **Google**.
3. Em **Configurações do Projeto**, crie um app Web e copie as chaves de configuração (`apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`).
4. Substitua as credenciais de exemplo no arquivo [firebaseConfig.js](file:///c:/Users/carol/OneDrive/Desktop/controle-financeiro/assets/js/firebase/firebaseConfig.js) pelas credenciais do seu projeto.

### Passo 3: Executar a SPA localmente
1. Abra a pasta do projeto no seu terminal.
2. Certifique-se de que o `node` está instalado e execute o servidor local:
   ```bash
   npx serve
   ```
3. Acesse a aplicação no navegador em `http://localhost:3000` (ou na porta indicada no terminal).
4. Faça o login com sua conta Google e comece a controlar suas finanças!

---

## 📝 Versão e Licença

Este projeto é desenvolvido continuamente com foco em qualidade, código limpo e conformidade técnica. O histórico completo de entregas e sprints está disponível em [CHANGELOG.md](file:///c:/Users/carol/OneDrive/Desktop/controle-financeiro/CHANGELOG.md).
