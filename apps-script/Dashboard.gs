/**
 * Handler do módulo "dashboard" (docs/API.md § Módulo dashboard).
 *
 * Sprint 3 entrega a tela cheia do Dashboard, mas Accounts/Cards/Categories/
 * Transactions/Installments só ganham telas de cadastro nas Sprints 4 a 7
 * (docs/roadmap.md) — por isso os cálculos abaixo funcionam corretamente
 * também quando essas abas ainda estão vazias (tudo soma zero), e passam a
 * refletir dados reais automaticamente assim que as próximas sprints
 * permitirem criar lançamentos, sem exigir nenhuma alteração aqui.
 */

function handleDashboardGetSummary(request, user) {
  assertWorkspaceAccess_(user, request.workspaceId);

  var now = new Date();
  var month = Number(request.payload.month) || now.getMonth() + 1;
  var year = Number(request.payload.year) || now.getFullYear();

  if (!(month >= 1 && month <= 12)) {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, "Mês inválido.", "month");
  }
  if (!(year >= 2000 && year <= 2100)) {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, "Ano inválido.", "year");
  }

  var allTransactions = findRecords_(SHEET_NAMES.TRANSACTIONS, function (tx) {
    return tx.workspaceId === request.workspaceId && !tx.deletedAt;
  });

  var selectedMonthKey = monthKey_(year, month);
  var monthTransactions = allTransactions.filter(function (tx) {
    return String(tx.date).slice(0, 7) === selectedMonthKey;
  });

  var totalIncome = sumAmount_(monthTransactions, TRANSACTION_TYPES.INCOME);
  var totalExpense = sumAmount_(monthTransactions, TRANSACTION_TYPES.EXPENSE);
  var today = todayDateOnly_();

  return successResponse_({
    balance: round2_(totalIncome - totalExpense),
    totalIncome: totalIncome,
    totalExpense: totalExpense,
    startOfMonth: computePeriodBreakdown_(monthTransactions, PAYMENT_PERIODS.START_OF_MONTH, today),
    fortnight: computePeriodBreakdown_(monthTransactions, PAYMENT_PERIODS.FORTNIGHT, today),
    cards: computeCardsSummary_(request.workspaceId, monthTransactions, year, month),
    upcomingDue: computeUpcomingDue_(allTransactions, now, request.workspaceId),
    recentTransactions: computeRecentTransactions_(allTransactions),
    monthlyChart: computeMonthlyChart_(allTransactions, year, month),
    yearlySummary: computeYearlySummary_(allTransactions, year),
  });
}

function computePeriodBreakdown_(monthTransactions, period, today) {
  var matching = monthTransactions.filter(function (tx) {
    return tx.type === TRANSACTION_TYPES.EXPENSE && tx.paymentPeriod === period;
  });
  var total = sumAmountList_(matching);
  var paid = sumAmountList_(
    matching.filter(function (tx) {
      return String(tx.date) <= today;
    })
  );
  return { total: total, paid: paid, pending: round2_(total - paid) };
}

function computeCardsSummary_(workspaceId, monthTransactions, year, month) {
  var cards = findRecords_(SHEET_NAMES.CARDS, function (card) {
    return card.workspaceId === workspaceId && !card.archivedAt;
  });

  // Precisamos obter TODOS os lançamentos de cartão ativos do workspace, pois o
  // ciclo da fatura pode começar no mês anterior ao selecionado no Dashboard.
  var allCardTransactions = findRecords_(SHEET_NAMES.TRANSACTIONS, function (tx) {
    return (
      tx.workspaceId === workspaceId &&
      tx.paymentMethod === PAYMENT_METHODS.CREDIT &&
      !tx.deletedAt
    );
  });

  return cards.map(function (card) {
    var dueDay = Number(card.dueDay);
    var period = getInvoicePeriodForDueMonth_(dueDay, year, month);

    var invoiceTransactions = allCardTransactions.filter(function (tx) {
      return tx.cardId === card.id && String(tx.date) >= period.start && String(tx.date) <= period.end;
    });

    var invoiceTotal = sumAmountList_(invoiceTransactions);

    return {
      cardId: card.id,
      name: card.name,
      invoiceTotal: invoiceTotal,
      dueDate: period.dueDate,
    };
  });
}

/**
 * Vencimentos nos próximos 7 dias a partir de HOJE (independe do mês/ano
 * selecionado no filtro do Dashboard — é sempre relativo à data real).
 */
function computeUpcomingDue_(allTransactions, now, workspaceId) {
  var todayStr = todayDateOnly_();
  var future = new Date(now.getTime());
  future.setDate(future.getDate() + 7);
  var futureStr = formatDateOnly_(future);

  // 1. Obter despesas normais a vencer nos próximos 7 dias (exclui crédito)
  var upcomingTransactions = allTransactions
    .filter(function (tx) {
      return (
        tx.type === TRANSACTION_TYPES.EXPENSE &&
        tx.paymentMethod !== PAYMENT_METHODS.CREDIT &&
        String(tx.date) >= todayStr &&
        String(tx.date) <= futureStr
      );
    })
    .map(sanitizeTransactionForDashboard_);

  // 2. Mapear faturas de cartão de crédito a vencer nos próximos 7 dias
  var cards = findRecords_(SHEET_NAMES.CARDS, function (card) {
    return card.workspaceId === workspaceId && !card.archivedAt;
  });

  var cardTransactions = allTransactions.filter(function (tx) {
    return tx.paymentMethod === PAYMENT_METHODS.CREDIT;
  });

  cards.forEach(function (card) {
    var dueDay = Number(card.dueDay);

    var curDue = getCurrentInvoiceDueMonth_(dueDay, todayStr);
    var curPeriod = getInvoicePeriodForDueMonth_(dueDay, curDue.year, curDue.month);

    var nextDue = shiftMonth_(curDue.year, curDue.month, 1);
    var nextPeriod = getInvoicePeriodForDueMonth_(dueDay, nextDue.year, nextDue.month);

    // Fatura Atual
    if (curPeriod.dueDate >= todayStr && curPeriod.dueDate <= futureStr) {
      var currentTransactions = cardTransactions.filter(function (tx) {
        return tx.cardId === card.id && String(tx.date) >= curPeriod.start && String(tx.date) <= curPeriod.end;
      });
      var currentTotal = sumAmountList_(currentTransactions);
      if (currentTotal > 0) {
        upcomingTransactions.push({
          id: "invoice-curr-" + card.id + "-" + curPeriod.dueDate,
          type: "expense",
          description: "Fatura - " + card.name,
          amount: currentTotal,
          date: curPeriod.dueDate,
          paymentMethod: "credit",
        });
      }
    }

    // Próxima Fatura
    if (nextPeriod.dueDate >= todayStr && nextPeriod.dueDate <= futureStr) {
      var nextTransactions = cardTransactions.filter(function (tx) {
        return tx.cardId === card.id && String(tx.date) >= nextPeriod.start && String(tx.date) <= nextPeriod.end;
      });
      var nextTotal = sumAmountList_(nextTransactions);
      if (nextTotal > 0) {
        upcomingTransactions.push({
          id: "invoice-next-" + card.id + "-" + nextPeriod.dueDate,
          type: "expense",
          description: "Fatura - " + card.name,
          amount: nextTotal,
          date: nextPeriod.dueDate,
          paymentMethod: "credit",
        });
      }
    }
  });

  // Ordenar tudo por data de vencimento
  upcomingTransactions.sort(function (a, b) {
    return String(a.date).localeCompare(String(b.date));
  });

  return upcomingTransactions;
}

function computeRecentTransactions_(allTransactions) {
  return allTransactions
    .slice()
    .sort(function (a, b) {
      return String(b.date).localeCompare(String(a.date)) || String(b.createdAt).localeCompare(String(a.createdAt));
    })
    .slice(0, 10)
    .map(sanitizeTransactionForDashboard_);
}

/** Últimos 12 meses, terminando no mês/ano selecionado (inclusive). */
function computeMonthlyChart_(allTransactions, year, month) {
  var months = [];
  var cursorYear = year;
  var cursorMonth = month;

  for (var i = 0; i < 12; i++) {
    months.unshift(monthKey_(cursorYear, cursorMonth));
    cursorMonth -= 1;
    if (cursorMonth < 1) {
      cursorMonth = 12;
      cursorYear -= 1;
    }
  }

  return months.map(function (key) {
    var monthTx = allTransactions.filter(function (tx) {
      return String(tx.date).slice(0, 7) === key;
    });
    return {
      month: key,
      income: sumAmount_(monthTx, TRANSACTION_TYPES.INCOME),
      expense: sumAmount_(monthTx, TRANSACTION_TYPES.EXPENSE),
    };
  });
}

function computeYearlySummary_(allTransactions, year) {
  var yearTransactions = allTransactions.filter(function (tx) {
    return String(tx.date).slice(0, 4) === String(year);
  });
  var totalIncome = sumAmount_(yearTransactions, TRANSACTION_TYPES.INCOME);
  var totalExpense = sumAmount_(yearTransactions, TRANSACTION_TYPES.EXPENSE);
  return { totalIncome: totalIncome, totalExpense: totalExpense, balance: round2_(totalIncome - totalExpense) };
}

function sanitizeTransactionForDashboard_(tx) {
  return {
    id: tx.id,
    type: tx.type,
    description: tx.description,
    amount: Number(tx.amount) || 0,
    date: tx.date,
    categoryId: tx.categoryId,
    accountId: tx.accountId,
    cardId: tx.cardId,
    paymentMethod: tx.paymentMethod,
    installmentNumber: tx.installmentNumber,
    installmentTotal: tx.installmentTotal,
  };
}

/**
 * pad2_/monthKey_/formatDateOnly_/todayDateOnly_/round2_ moraram para
 * Utils.gs a partir da Sprint 4 — são utilitários genéricos de data/número,
 * também usados por Transaction.gs (recorrências e cálculo de saldo).
 */

function sumAmountList_(transactions) {
  return round2_(
    transactions.reduce(function (sum, tx) {
      return sum + (Number(tx.amount) || 0);
    }, 0)
  );
}

function sumAmount_(transactions, type) {
  return sumAmountList_(
    transactions.filter(function (tx) {
      return tx.type === type;
    })
  );
}

