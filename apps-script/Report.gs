/**
 * Handlers do módulo "report" (docs/API.md § Módulo report).
 * Fornece dados consolidados e exportações de relatórios em PDF e CSV.
 */

function handleReportGenerate(request, user) {
  assertWorkspaceAccess_(user, request.workspaceId);
  
  var payload = request.payload || {};
  requireFields_(payload, ["startDate", "endDate"]);

  var startDate = String(payload.startDate);
  var endDate = String(payload.endDate);
  var format = payload.format || "json";

  // Obter todos os lançamentos ativos do período
  var allTransactions = findRecords_(SHEET_NAMES.TRANSACTIONS, function (tx) {
    return (
      tx.workspaceId === request.workspaceId &&
      !tx.deletedAt &&
      String(tx.date) >= startDate &&
      String(tx.date) <= endDate
    );
  });

  // Obter categorias, contas e cartões para mapeamento de nomes
  var categories = findRecords_(SHEET_NAMES.CATEGORIES, function (cat) {
    return cat.workspaceId === request.workspaceId;
  });
  var categoryMap = {};
  categories.forEach(function (c) { categoryMap[c.id] = c.name; });

  var accounts = findRecords_(SHEET_NAMES.ACCOUNTS, function (acc) {
    return acc.workspaceId === request.workspaceId;
  });
  var accountMap = {};
  accounts.forEach(function (a) { accountMap[a.id] = a.name; });

  var cards = findRecords_(SHEET_NAMES.CARDS, function (card) {
    return card.workspaceId === request.workspaceId;
  });
  var cardMap = {};
  cards.forEach(function (c) { cardMap[c.id] = c.name; });

  // 1. Totais
  var totalIncome = 0;
  var totalExpense = 0;
  var transactions = [];

  allTransactions.forEach(function (tx) {
    var amt = Number(tx.amount) || 0;
    if (tx.type === TRANSACTION_TYPES.INCOME) {
      totalIncome += amt;
    } else if (tx.type === TRANSACTION_TYPES.EXPENSE) {
      totalExpense += amt;
    }
    transactions.push({
      id: tx.id,
      date: tx.date,
      description: tx.description,
      amount: amt,
      type: tx.type,
      categoryName: categoryMap[tx.categoryId] || "Sem Categoria",
      paymentMethod: tx.paymentMethod,
      accountName: tx.accountId ? (accountMap[tx.accountId] || "Sem Conta") : "",
      cardName: tx.cardId ? (cardMap[tx.cardId] || "Sem Cartão") : "",
      categoryId: tx.categoryId,
      accountId: tx.accountId || "",
      cardId: tx.cardId || "",
    });
  });

  totalIncome = round2_(totalIncome);
  totalExpense = round2_(totalExpense);
  var balance = round2_(totalIncome - totalExpense);

  // 2. Gastos por Categoria
  var categoryTotals = {};
  var categoryCounts = {};
  var expenseTransactions = transactions.filter(function (t) { return t.type === TRANSACTION_TYPES.EXPENSE; });
  expenseTransactions.forEach(function (t) {
    var catName = t.categoryName;
    categoryTotals[catName] = (categoryTotals[catName] || 0) + t.amount;
    categoryCounts[catName] = (categoryCounts[catName] || 0) + 1;
  });

  var byCategory = [];
  var totalExpenseSum = sumValues_(categoryTotals);
  for (var catName in categoryTotals) {
    var tot = round2_(categoryTotals[catName]);
    byCategory.push({
      categoryName: catName,
      total: tot,
      count: categoryCounts[catName],
      percentage: totalExpenseSum > 0 ? round2_((tot / totalExpenseSum) * 100) : 0,
    });
  }
  byCategory.sort(function (a, b) { return b.total - a.total; });

  // 3. Gastos por Cartão
  var cardTotals = {};
  var cardCounts = {};
  var creditTransactions = expenseTransactions.filter(function (t) { return t.paymentMethod === PAYMENT_METHODS.CREDIT; });
  creditTransactions.forEach(function (t) {
    var cName = t.cardName || "Cartão Não Identificado";
    cardTotals[cName] = (cardTotals[cName] || 0) + t.amount;
    cardCounts[cName] = (cardCounts[cName] || 0) + 1;
  });

  var byCard = [];
  for (var cName in cardTotals) {
    byCard.push({
      cardName: cName,
      total: round2_(cardTotals[cName]),
      count: cardCounts[cName],
    });
  }
  byCard.sort(function (a, b) { return b.total - a.total; });

  // 4. Lançamentos por Conta
  var accountTotals = {};
  var accountCounts = {};
  var nonCardTransactions = transactions.filter(function (t) { return t.paymentMethod !== PAYMENT_METHODS.CREDIT; });
  nonCardTransactions.forEach(function (t) {
    var aName = t.accountName || "Sem Conta";
    var multiplier = t.type === TRANSACTION_TYPES.INCOME ? 1 : -1;
    accountTotals[aName] = (accountTotals[aName] || 0) + (t.amount * multiplier);
    accountCounts[aName] = (accountCounts[aName] || 0) + 1;
  });

  var byAccount = [];
  for (var aName in accountTotals) {
    byAccount.push({
      accountName: aName,
      netAmount: round2_(accountTotals[aName]),
      count: accountCounts[aName],
    });
  }

  // 5. Evolução Mensal (agrupado por YYYY-MM)
  var monthlyMap = {};
  transactions.forEach(function (t) {
    var monthKey = String(t.date).slice(0, 7);
    if (!monthlyMap[monthKey]) {
      monthlyMap[monthKey] = { income: 0, expense: 0 };
    }
    if (t.type === TRANSACTION_TYPES.INCOME) {
      monthlyMap[monthKey].income += t.amount;
    } else {
      monthlyMap[monthKey].expense += t.amount;
    }
  });

  var monthlyEvolution = [];
  for (var mKey in monthlyMap) {
    monthlyEvolution.push({
      month: mKey,
      income: round2_(monthlyMap[mKey].income),
      expense: round2_(monthlyMap[mKey].expense),
    });
  }
  monthlyEvolution.sort(function (a, b) { return a.month.localeCompare(b.month); });

  // 6. Comparativo entre o período selecionado e o período anterior de mesmo tamanho
  var startD = new Date(startDate);
  var endD = new Date(endDate);
  var diffTime = Math.abs(endD - startD);
  var diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  var prevEndDate = new Date(startD);
  prevEndDate.setDate(prevEndDate.getDate() - 1);
  var prevStartDate = new Date(prevEndDate);
  prevStartDate.setDate(prevStartDate.getDate() - diffDays + 1);

  var prevStartStr = formatDateOnly_(prevStartDate);
  var prevEndStr = formatDateOnly_(prevEndDate);

  var prevTransactions = findRecords_(SHEET_NAMES.TRANSACTIONS, function (tx) {
    return (
      tx.workspaceId === request.workspaceId &&
      !tx.deletedAt &&
      String(tx.date) >= prevStartStr &&
      String(tx.date) <= prevEndStr
    );
  });

  var prevIncome = 0;
  var prevExpense = 0;
  prevTransactions.forEach(function (tx) {
    var amt = Number(tx.amount) || 0;
    if (tx.type === TRANSACTION_TYPES.INCOME) {
      prevIncome += amt;
    } else if (tx.type === TRANSACTION_TYPES.EXPENSE) {
      prevExpense += amt;
    }
  });

  var comparative = {
    current: { income: totalIncome, expense: totalExpense },
    previous: { income: round2_(prevIncome), expense: round2_(prevExpense) },
    period: { start: startDate, end: endDate },
    prevPeriod: { start: prevStartStr, end: prevEndStr }
  };

  var reportData = {
    totals: { income: totalIncome, expense: totalExpense, balance: balance },
    byCategory: byCategory,
    byCard: byCard,
    byAccount: byAccount,
    monthlyEvolution: monthlyEvolution,
    comparative: comparative,
    transactions: transactions
  };

  if (format === "json") {
    return successResponse_({ data: reportData });
  }

  if (format === "pdf") {
    var fileURL = generatePdfReport_(reportData, startDate, endDate);
    return successResponse_({ fileURL: fileURL });
  }

  if (format === "xlsx") {
    var fileURL = generateCsvReport_(reportData);
    return successResponse_({ fileURL: fileURL });
  }

  throw new AppError(ERROR_CODES.VALIDATION_ERROR, "Formato inválido.");
}

function sumValues_(obj) {
  var sum = 0;
  for (var key in obj) {
    sum += obj[key];
  }
  return sum;
}

function generatePdfReport_(reportData, startDate, endDate) {
  var html = "<html><head><style>" +
    "body { font-family: sans-serif; padding: 20px; color: #333; }" +
    "h1 { color: #6366f1; border-bottom: 2px solid #6366f1; padding-bottom: 10px; }" +
    ".section { margin-bottom: 30px; }" +
    ".section-title { font-size: 18px; font-weight: bold; margin-bottom: 10px; color: #4f46e5; }" +
    "table { width: 100%; border-collapse: collapse; margin-top: 10px; }" +
    "th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }" +
    "th { background-color: #f3f4f6; }" +
    ".totals-card { background-color: #f9fafb; border: 1px solid #e5e7eb; padding: 15px; border-radius: 8px; margin-bottom: 20px; }" +
    ".amount-income { color: #10b981; font-weight: bold; }" +
    ".amount-expense { color: #ef4444; font-weight: bold; }" +
    "</style></head><body>" +
    "<h1>FinanceHub — Relatório Financeiro</h1>" +
    "<p>Período: <strong>" + startDate + "</strong> a <strong>" + endDate + "</strong></p>" +
    
    "<div class='totals-card'>" +
      "<h3>Resumo do Período</h3>" +
      "<p>Receitas: <span class='amount-income'>R$ " + reportData.totals.income.toFixed(2) + "</span></p>" +
      "<p>Despesas: <span class='amount-expense'>R$ " + reportData.totals.expense.toFixed(2) + "</span></p>" +
      "<p>Saldo: <strong>R$ " + reportData.totals.balance.toFixed(2) + "</strong></p>" +
    "</div>" +

    "<div class='section'>" +
      "<div class='section-title'>Gastos por Categoria</div>" +
      "<table>" +
        "<thead><tr><th>Categoria</th><th>Total (R$)</th><th>%</th><th>Qtd.</th></tr></thead>" +
        "<tbody>";
        
  reportData.byCategory.forEach(function (item) {
    html += "<tr>" +
      "<td>" + item.categoryName + "</td>" +
      "<td>R$ " + item.total.toFixed(2) + "</td>" +
      "<td>" + item.percentage + "%</td>" +
      "<td>" + item.count + "</td>" +
      "</tr>";
  });
  
  html += "</tbody></table></div>" +
    "<div class='section'>" +
      "<div class='section-title'>Lançamentos Detalhados</div>" +
      "<table>" +
        "<thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Valor (R$)</th><th>Método</th></tr></thead>" +
        "<tbody>";
        
  reportData.transactions.forEach(function (tx) {
    var valClass = tx.type === "income" ? "amount-income" : "amount-expense";
    var prefix = tx.type === "income" ? "+" : "-";
    html += "<tr>" +
      "<td>" + tx.date + "</td>" +
      "<td>" + tx.description + "</td>" +
      "<td>" + tx.categoryName + "</td>" +
      "<td><span class='" + valClass + "'>" + prefix + " R$ " + tx.amount.toFixed(2) + "</span></td>" +
      "<td>" + tx.paymentMethod + "</td>" +
      "</tr>";
  });

  html += "</tbody></table></div></body></html>";

  var blob = HtmlService.createHtmlOutput(html).getAs('application/pdf');
  var base64 = Utilities.base64Encode(blob.getBytes());
  return "data:application/pdf;base64," + base64;
}

function generateCsvReport_(reportData) {
  // UTF-8 BOM para garantir acentos corretos no Excel
  var csv = "\uFEFFData;Descrição;Categoria;Valor (R$);Tipo;Método;Conta;Cartão\n";
  
  reportData.transactions.forEach(function (tx) {
    var amountStr = tx.amount.toFixed(2).replace(".", ",");
    var row = [
      tx.date,
      tx.description,
      tx.categoryName,
      amountStr,
      tx.type === "income" ? "Receita" : "Despesa",
      tx.paymentMethod,
      tx.accountName || "",
      tx.cardName || ""
    ];
    csv += row.map(function (val) {
      var s = String(val).replace(/"/g, '""');
      return '"' + s + '"';
    }).join(";") + "\n";
  });

  var blob = Utilities.newBlob(csv, 'text/csv;charset=utf-8');
  var base64 = Utilities.base64Encode(blob.getBytes());
  return "data:text/csv;base64," + base64;
}
