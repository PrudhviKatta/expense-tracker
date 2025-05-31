"use client";

import React, { useState, useEffect } from "react";
import {
  PlusCircle,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  Upload,
  Users,
  Car,
  Home,
  CreditCard,
  Trash2,
  Edit3,
  X,
  CheckCircle,
  AlertCircle,
  Receipt,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

// Simple Card components
const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-lg shadow-md border ${className}`}>
    {children}
  </div>
);

const CardHeader = ({ children }) => (
  <div className="px-6 py-4 border-b">{children}</div>
);

const CardTitle = ({ children, className = "" }) => (
  <h3 className={`text-lg font-semibold text-gray-900 ${className}`}>
    {children}
  </h3>
);

const CardContent = ({ children, className = "" }) => (
  <div className={`px-6 py-4 ${className}`}>{children}</div>
);

// Toast Notification Component
const Toast = ({ message, type, onClose }) => (
  <div
    className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 flex items-center gap-2 max-w-md ${
      type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
    }`}
  >
    {type === "success" ? (
      <CheckCircle className="w-5 h-5" />
    ) : (
      <AlertCircle className="w-5 h-5" />
    )}
    <span>{message}</span>
    <button onClick={onClose} className="ml-auto">
      <X className="w-4 h-4" />
    </button>
  </div>
);

const ExpenseTracker = () => {
  const [currentView, setCurrentView] = useState("all-months");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [monthlyPeriods, setMonthlyPeriods] = useState([]);
  const [currentPeriod, setCurrentPeriod] = useState(null);
  const [remittances, setRemittances] = useState([]);
  const [otherExpenses, setOtherExpenses] = useState([]);
  const [otherTransactions, setOtherTransactions] = useState([]);
  const [exchangeRate, setExchangeRate] = useState(83.5);
  const [allMonthsData, setAllMonthsData] = useState([]);

  // Toast notification state
  const [toast, setToast] = useState(null);

  // Form states
  const [salaryForm, setSalaryForm] = useState({
    daysWorked: "",
    totalSalary: "",
    exchangeRate: "",
  });

  const [remittanceForm, setRemittanceForm] = useState({
    amountUsd: "",
    amountInr: "",
    purpose: "Family",
    transferMethod: "Remitly",
    recipientAccount: "",
    description: "",
    transferDate: "",
  });

  const [expenseForm, setExpenseForm] = useState({
    category: "Car",
    amountUsd: "",
    amountInr: "",
    description: "",
    expenseDate: "",
  });

  const [transactionForm, setTransactionForm] = useState({
    type: "income",
    amount: "",
    currency: "USD",
    amountInr: "",
    category: "",
    description: "",
    transactionDate: "",
    source: "",
    notes: "",
    debtStatus: "pending",
    expectedDate: "",
  });

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  // Toast notification function
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Load data on component mount and when month/year changes
  useEffect(() => {
    loadMonthlyPeriods();
    loadAllMonthsData();
  }, []);

  useEffect(() => {
    loadCurrentPeriod();
  }, [selectedMonth, selectedYear]);

  const loadMonthlyPeriods = async () => {
    try {
      const { data, error } = await supabase
        .from("monthly_periods")
        .select("*")
        .order("year", { ascending: false })
        .order("month", { ascending: false });

      if (error) throw error;
      setMonthlyPeriods(data || []);
    } catch (error) {
      console.error("Error loading monthly periods:", error);
    }
  };

  const loadAllMonthsData = async () => {
    try {
      const { data: periods, error: periodsError } = await supabase
        .from("monthly_periods")
        .select("*")
        .order("year", { ascending: false })
        .order("month", { ascending: false });

      if (periodsError) throw periodsError;

      const { data: allRemittances, error: remittancesError } = await supabase
        .from("remittances")
        .select("*");

      if (remittancesError) throw remittancesError;

      const { data: allExpenses, error: expensesError } = await supabase
        .from("other_expenses")
        .select("*");

      if (expensesError) throw expensesError;

      const { data: allOtherTransactions, error: transactionsError } =
        await supabase.from("other_transactions").select("*");

      if (transactionsError) throw transactionsError;

      // Combine data for each month
      const combinedData = periods.map((period) => {
        const monthRemittances = allRemittances.filter(
          (r) => r.monthly_period_id === period.id
        );
        const monthExpenses = allExpenses.filter(
          (e) => e.monthly_period_id === period.id
        );
        const monthTransactions = allOtherTransactions.filter(
          (t) => t.monthly_period_id === period.id
        );

        const totalRemittances = monthRemittances.reduce(
          (sum, r) => sum + parseFloat(r.amount_usd),
          0
        );
        const totalRemittancesInr = monthRemittances.reduce(
          (sum, r) => sum + parseFloat(r.amount_inr),
          0
        );
        const totalOtherExpenses = monthExpenses.reduce(
          (sum, e) => sum + parseFloat(e.amount_usd || 0),
          0
        );

        // Calculate other transactions
        const otherIncome = monthTransactions
          .filter((t) => t.type === "income" || t.type === "owes_me")
          .reduce((sum, t) => sum + parseFloat(t.amount_usd || 0), 0);
        const otherExpensesFromTransactions = monthTransactions
          .filter((t) => t.type === "expense" || t.type === "i_owe")
          .reduce((sum, t) => sum + parseFloat(t.amount_usd || 0), 0);

        const totalSalary = parseFloat(period.total_salary_usd) + otherIncome;
        const totalAllExpenses =
          totalRemittances + totalOtherExpenses + otherExpensesFromTransactions;
        const balance = totalSalary - totalAllExpenses;

        return {
          ...period,
          remittances: monthRemittances,
          expenses: monthExpenses,
          transactions: monthTransactions,
          totalRemittances,
          totalRemittancesInr,
          totalOtherExpenses,
          otherIncome,
          otherExpensesFromTransactions,
          totalSalary,
          totalAllExpenses,
          balance,
        };
      });

      setAllMonthsData(combinedData);
    } catch (error) {
      console.error("Error loading all months data:", error);
    }
  };

  const loadCurrentPeriod = async () => {
    try {
      const { data, error } = await supabase
        .from("monthly_periods")
        .select("*")
        .eq("month", selectedMonth + 1)
        .eq("year", selectedYear)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      setCurrentPeriod(data);

      if (data) {
        loadRemittances(data.id);
        loadOtherExpenses(data.id);
        loadOtherTransactions(data.id);
        setSalaryForm({
          daysWorked: data.days_worked?.toString() || "",
          totalSalary: data.total_salary_usd?.toString() || "",
          exchangeRate: data.exchange_rate_reference?.toString() || "",
        });
      } else {
        setRemittances([]);
        setOtherExpenses([]);
        setOtherTransactions([]);
        setSalaryForm({ daysWorked: "", totalSalary: "", exchangeRate: "" });
      }
    } catch (error) {
      console.error("Error loading current period:", error);
    }
  };

  const loadRemittances = async (periodId) => {
    try {
      const { data, error } = await supabase
        .from("remittances")
        .select("*")
        .eq("monthly_period_id", periodId)
        .order("created_at");

      if (error) throw error;
      setRemittances(data || []);
    } catch (error) {
      console.error("Error loading remittances:", error);
    }
  };

  const loadOtherExpenses = async (periodId) => {
    try {
      const { data, error } = await supabase
        .from("other_expenses")
        .select("*")
        .eq("monthly_period_id", periodId)
        .order("created_at");

      if (error) throw error;
      setOtherExpenses(data || []);
    } catch (error) {
      console.error("Error loading other expenses:", error);
    }
  };

  const loadOtherTransactions = async (periodId) => {
    try {
      const { data, error } = await supabase
        .from("other_transactions")
        .select("*")
        .eq("monthly_period_id", periodId)
        .order("created_at");

      if (error) throw error;
      setOtherTransactions(data || []);
    } catch (error) {
      console.error("Error loading other transactions:", error);
    }
  };

  const handleSalarySubmit = async () => {
    if (!salaryForm.daysWorked || !salaryForm.totalSalary) {
      showToast("Please fill in days worked and total salary", "error");
      return;
    }

    const salaryData = {
      month: selectedMonth + 1,
      year: selectedYear,
      days_worked: parseInt(salaryForm.daysWorked),
      total_salary_usd: parseFloat(salaryForm.totalSalary),
      exchange_rate_reference:
        parseFloat(salaryForm.exchangeRate) || exchangeRate,
    };

    try {
      if (currentPeriod) {
        const { error } = await supabase
          .from("monthly_periods")
          .update(salaryData)
          .eq("id", currentPeriod.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("monthly_periods")
          .insert([salaryData])
          .select()
          .single();

        if (error) throw error;
        setCurrentPeriod(data);
      }

      loadMonthlyPeriods();
      loadCurrentPeriod();
      loadAllMonthsData();
      showToast("Salary information saved successfully!");
    } catch (error) {
      console.error("Error saving salary:", error);
      showToast("Error saving salary information", "error");
    }
  };

  const handleRemittanceSubmit = async () => {
    if (!currentPeriod) {
      showToast("Please add salary information first", "error");
      return;
    }

    if (!remittanceForm.amountUsd || !remittanceForm.amountInr) {
      showToast("Please fill in both USD and INR amounts", "error");
      return;
    }

    const effectiveRate =
      parseFloat(remittanceForm.amountInr) /
      parseFloat(remittanceForm.amountUsd);

    const remittanceData = {
      monthly_period_id: currentPeriod.id,
      amount_usd: parseFloat(remittanceForm.amountUsd),
      amount_inr: parseFloat(remittanceForm.amountInr),
      effective_rate: effectiveRate,
      purpose: remittanceForm.purpose,
      transfer_method: remittanceForm.transferMethod,
      recipient_account: remittanceForm.recipientAccount,
      description: remittanceForm.description,
      transfer_date: remittanceForm.transferDate || null,
    };

    try {
      const { error } = await supabase
        .from("remittances")
        .insert([remittanceData]);

      if (error) throw error;

      loadRemittances(currentPeriod.id);
      loadAllMonthsData();
      setRemittanceForm({
        amountUsd: "",
        amountInr: "",
        purpose: "Family",
        transferMethod: "Remitly",
        recipientAccount: "",
        description: "",
        transferDate: "",
      });
      showToast("Remittance added successfully!");
    } catch (error) {
      console.error("Error adding remittance:", error);
      showToast("Error adding remittance", "error");
    }
  };

  const handleExpenseSubmit = async () => {
    if (!currentPeriod) {
      showToast("Please add salary information first", "error");
      return;
    }

    if (!expenseForm.description) {
      showToast("Please fill in description", "error");
      return;
    }

    const expenseData = {
      monthly_period_id: currentPeriod.id,
      category: expenseForm.category,
      amount_usd: expenseForm.amountUsd
        ? parseFloat(expenseForm.amountUsd)
        : null,
      amount_inr: expenseForm.amountInr
        ? parseFloat(expenseForm.amountInr)
        : null,
      description: expenseForm.description,
      expense_date: expenseForm.expenseDate || null,
    };

    try {
      const { error } = await supabase
        .from("other_expenses")
        .insert([expenseData]);

      if (error) throw error;

      loadOtherExpenses(currentPeriod.id);
      loadAllMonthsData();
      setExpenseForm({
        category: "Car",
        amountUsd: "",
        amountInr: "",
        description: "",
        expenseDate: "",
      });
      showToast("Expense added successfully!");
    } catch (error) {
      console.error("Error adding expense:", error);
      showToast("Error adding expense", "error");
    }
  };

  const handleTransactionSubmit = async () => {
    if (!currentPeriod) {
      showToast("Please add salary information first", "error");
      return;
    }

    if (
      !transactionForm.amount ||
      !transactionForm.category ||
      !transactionForm.description
    ) {
      showToast("Please fill in amount, category, and description", "error");
      return;
    }

    const transactionData = {
      monthly_period_id: currentPeriod.id,
      type: transactionForm.type,
      amount_usd:
        transactionForm.currency === "USD"
          ? parseFloat(transactionForm.amount)
          : null,
      amount_inr:
        transactionForm.currency === "INR"
          ? parseFloat(transactionForm.amount)
          : transactionForm.amountInr
          ? parseFloat(transactionForm.amountInr)
          : null,
      currency: transactionForm.currency,
      category: transactionForm.category,
      description: transactionForm.description,
      source: transactionForm.source,
      notes: transactionForm.notes,
      transaction_date: transactionForm.transactionDate || null,
      debt_status:
        transactionForm.type === "owes_me" || transactionForm.type === "i_owe"
          ? transactionForm.debtStatus
          : null,
      expected_date:
        transactionForm.type === "owes_me" || transactionForm.type === "i_owe"
          ? transactionForm.expectedDate || null
          : null,
    };

    try {
      const { error } = await supabase
        .from("other_transactions")
        .insert([transactionData]);

      if (error) throw error;

      loadOtherTransactions(currentPeriod.id);
      loadAllMonthsData();
      setTransactionForm({
        type: "income",
        amount: "",
        currency: "USD",
        amountInr: "",
        category: "",
        description: "",
        transactionDate: "",
        source: "",
        notes: "",
        debtStatus: "pending",
        expectedDate: "",
      });
      showToast("Transaction added successfully!");
    } catch (error) {
      console.error("Error adding transaction:", error);
      showToast("Error adding transaction", "error");
    }
  };

  // DELETE FUNCTIONS - All with confirmations
  const deleteRemittance = async (id) => {
    if (!window.confirm("Are you sure you want to delete this remittance?"))
      return;

    try {
      const { error } = await supabase
        .from("remittances")
        .delete()
        .eq("id", id);

      if (error) throw error;
      loadRemittances(currentPeriod.id);
      loadAllMonthsData();
      showToast("Remittance deleted successfully!");
    } catch (error) {
      console.error("Error deleting remittance:", error);
      showToast("Error deleting remittance", "error");
    }
  };

  const deleteExpense = async (id) => {
    if (!window.confirm("Are you sure you want to delete this expense?"))
      return;

    try {
      const { error } = await supabase
        .from("other_expenses")
        .delete()
        .eq("id", id);

      if (error) throw error;
      loadOtherExpenses(currentPeriod.id);
      loadAllMonthsData();
      showToast("Expense deleted successfully!");
    } catch (error) {
      console.error("Error deleting expense:", error);
      showToast("Error deleting expense", "error");
    }
  };

  const deleteTransaction = async (id) => {
    if (!window.confirm("Are you sure you want to delete this transaction?"))
      return;

    try {
      const { error } = await supabase
        .from("other_transactions")
        .delete()
        .eq("id", id);

      if (error) throw error;
      loadOtherTransactions(currentPeriod.id);
      loadAllMonthsData();
      showToast("Transaction deleted successfully!");
    } catch (error) {
      console.error("Error deleting transaction:", error);
      showToast("Error deleting transaction", "error");
    }
  };

  const deleteMonthlyPeriod = async (id) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this entire month? This will delete all associated remittances, expenses, and transactions."
      )
    )
      return;

    try {
      const { error } = await supabase
        .from("monthly_periods")
        .delete()
        .eq("id", id);

      if (error) throw error;
      loadMonthlyPeriods();
      loadAllMonthsData();
      showToast("Month deleted successfully!");
    } catch (error) {
      console.error("Error deleting monthly period:", error);
      showToast("Error deleting month", "error");
    }
  };

  const calculateSummary = () => {
    const salary = currentPeriod?.total_salary_usd || 0;
    const totalRemittances = remittances.reduce(
      (sum, r) => sum + parseFloat(r.amount_usd),
      0
    );
    const totalOtherExpenses = otherExpenses.reduce(
      (sum, e) => sum + parseFloat(e.amount_usd || 0),
      0
    );

    const otherIncome = otherTransactions
      .filter((t) => t.type === "income" || t.type === "owes_me")
      .reduce((sum, t) => sum + parseFloat(t.amount_usd || 0), 0);
    const otherExpensesFromTransactions = otherTransactions
      .filter((t) => t.type === "expense" || t.type === "i_owe")
      .reduce((sum, t) => sum + parseFloat(t.amount_usd || 0), 0);

    const totalIncome = salary + otherIncome;
    const totalAllExpenses =
      totalRemittances + totalOtherExpenses + otherExpensesFromTransactions;
    const balance = totalIncome - totalAllExpenses;
    const totalInr = remittances.reduce(
      (sum, r) => sum + parseFloat(r.amount_inr),
      0
    );

    return {
      salary,
      totalRemittances,
      totalOtherExpenses,
      otherIncome,
      otherExpensesFromTransactions,
      totalIncome,
      totalAllExpenses,
      balance,
      totalInr,
    };
  };

  const renderAllMonthsOverview = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            All Months Overview
            <button
              onClick={() => setCurrentView("single-month")}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              Single Month View
            </button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {allMonthsData.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              No months added yet. Add your first month!
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-4 py-2 text-left text-gray-900">
                      Month
                    </th>
                    <th className="border border-gray-300 px-4 py-2 text-left text-gray-900">
                      Days
                    </th>
                    <th className="border border-gray-300 px-4 py-2 text-left text-gray-900">
                      Total Income
                    </th>
                    <th className="border border-gray-300 px-4 py-2 text-left text-gray-900">
                      Remittances
                    </th>
                    <th className="border border-gray-300 px-4 py-2 text-left text-gray-900">
                      Other Expenses
                    </th>
                    <th className="border border-gray-300 px-4 py-2 text-left text-gray-900">
                      Balance
                    </th>
                    <th className="border border-gray-300 px-4 py-2 text-left text-gray-900">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {allMonthsData.map((period) => (
                    <tr key={period.id} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-2 text-gray-900">
                        {monthNames[period.month - 1]} {period.year}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-gray-900">
                        {period.days_worked}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-gray-900">
                        ${period.totalSalary.toFixed(2)}
                        {period.otherIncome > 0 && (
                          <span className="text-xs text-green-600">
                            {" "}
                            (+${period.otherIncome.toFixed(2)})
                          </span>
                        )}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-gray-900">
                        ${period.totalRemittances.toFixed(2)}
                        <br />
                        <span className="text-xs text-gray-500">
                          ₹{period.totalRemittancesInr.toFixed(0)}
                        </span>
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-gray-900">
                        $
                        {(
                          period.totalOtherExpenses +
                          period.otherExpensesFromTransactions
                        ).toFixed(2)}
                      </td>
                      <td
                        className={`border border-gray-300 px-4 py-2 font-semibold ${
                          period.balance >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        ${period.balance.toFixed(2)}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              setSelectedMonth(period.month - 1);
                              setSelectedYear(period.year);
                              setCurrentView("single-month");
                            }}
                            className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                          >
                            View
                          </button>
                          <button
                            onClick={() => deleteMonthlyPeriod(period.id)}
                            className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderSingleMonthOverview = () => {
    const summary = calculateSummary();

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Select Month & Year
              <button
                onClick={() => setCurrentView("all-months")}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
              >
                All Months View
              </button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="p-2 border rounded-lg text-gray-900"
              >
                {monthNames.map((month, index) => (
                  <option key={index} value={index}>
                    {month}
                  </option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="p-2 border rounded-lg text-gray-900"
              >
                {(() => {
                  const currentYear = new Date().getFullYear();
                  const years = [];
                  for (let year = 2020; year <= currentYear + 10; year++) {
                    years.push(year);
                  }
                  return years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ));
                })()}
              </select>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Viewing: {monthNames[selectedMonth]} {selectedYear}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              Monthly Summary - {monthNames[selectedMonth]} {selectedYear}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600">Total Income</p>
                <p className="text-2xl font-bold text-green-600">
                  ${summary.totalIncome.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500">
                  Salary: ${summary.salary.toFixed(2)}
                  {summary.otherIncome > 0 && (
                    <span> + Other: ${summary.otherIncome.toFixed(2)}</span>
                  )}
                </p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-gray-600">Remittances</p>
                <p className="text-2xl font-bold text-red-600">
                  ${summary.totalRemittances.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500">
                  ₹{summary.totalInr.toFixed(0)}
                </p>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <p className="text-sm text-gray-600">Big Expenses</p>
                <p className="text-2xl font-bold text-orange-600">
                  ${summary.totalOtherExpenses.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500">Car, Tax, etc.</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-gray-600">Other Expenses</p>
                <p className="text-2xl font-bold text-purple-600">
                  ${summary.otherExpensesFromTransactions.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500">Misc expenses</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">Balance</p>
                <p
                  className={`text-2xl font-bold ${
                    summary.balance >= 0 ? "text-blue-600" : "text-red-600"
                  }`}
                >
                  ${summary.balance.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button
            onClick={() => setCurrentView("salary")}
            className="p-4 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
          >
            <DollarSign className="w-5 h-5" />
            {currentPeriod ? "Edit Salary" : "Add Salary"}
          </button>
          <button
            onClick={() => setCurrentView("remittances")}
            className="p-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
            disabled={!currentPeriod}
          >
            <Home className="w-5 h-5" />
            Remittances
          </button>
          <button
            onClick={() => setCurrentView("expenses")}
            className="p-4 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center justify-center gap-2"
            disabled={!currentPeriod}
          >
            <Car className="w-5 h-5" />
            Big Expenses
          </button>
          <button
            onClick={() => setCurrentView("transactions")}
            className="p-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2"
            disabled={!currentPeriod}
          >
            <Receipt className="w-5 h-5" />
            Other Transactions
          </button>
        </div>
      </div>
    );
  };

  const renderSalaryEntry = () => (
    <Card>
      <CardHeader>
        <CardTitle>
          {currentPeriod ? "Edit" : "Add"} Salary - {monthNames[selectedMonth]}{" "}
          {selectedYear}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">
                Days Worked *
              </label>
              <input
                type="number"
                value={salaryForm.daysWorked}
                onChange={(e) =>
                  setSalaryForm((prev) => ({
                    ...prev,
                    daysWorked: e.target.value,
                  }))
                }
                className="w-full p-2 border rounded-lg text-gray-900"
                placeholder="22"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">
                Total Salary (USD) *
              </label>
              <input
                type="number"
                step="0.01"
                value={salaryForm.totalSalary}
                onChange={(e) =>
                  setSalaryForm((prev) => ({
                    ...prev,
                    totalSalary: e.target.value,
                  }))
                }
                className="w-full p-2 border rounded-lg text-gray-900"
                placeholder="7818.48"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">
                Exchange Rate Reference
              </label>
              <input
                type="number"
                step="0.01"
                value={salaryForm.exchangeRate}
                onChange={(e) =>
                  setSalaryForm((prev) => ({
                    ...prev,
                    exchangeRate: e.target.value,
                  }))
                }
                className="w-full p-2 border rounded-lg text-gray-900"
                placeholder={exchangeRate.toString()}
              />
            </div>
          </div>
          <button
            onClick={handleSalarySubmit}
            className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700"
          >
            {currentPeriod ? "Update" : "Add"} Salary Information
          </button>
        </div>
      </CardContent>
    </Card>
  );

  const renderRemittances = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            Add Remittance - {monthNames[selectedMonth]} {selectedYear}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">
                  Amount Sent (USD) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={remittanceForm.amountUsd}
                  onChange={(e) =>
                    setRemittanceForm((prev) => ({
                      ...prev,
                      amountUsd: e.target.value,
                    }))
                  }
                  className="w-full p-2 border rounded-lg text-gray-900"
                  placeholder="2409.35"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">
                  Amount Received (INR) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={remittanceForm.amountInr}
                  onChange={(e) =>
                    setRemittanceForm((prev) => ({
                      ...prev,
                      amountInr: e.target.value,
                    }))
                  }
                  className="w-full p-2 border rounded-lg text-gray-900"
                  placeholder="200000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">
                  Purpose
                </label>
                <select
                  value={remittanceForm.purpose}
                  onChange={(e) =>
                    setRemittanceForm((prev) => ({
                      ...prev,
                      purpose: e.target.value,
                    }))
                  }
                  className="w-full p-2 border rounded-lg text-gray-900"
                >
                  <option value="Family">Family</option>
                  <option value="Support">Support</option>
                  <option value="Investment">Investment</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">
                  Transfer Method
                </label>
                <select
                  value={remittanceForm.transferMethod}
                  onChange={(e) =>
                    setRemittanceForm((prev) => ({
                      ...prev,
                      transferMethod: e.target.value,
                    }))
                  }
                  className="w-full p-2 border rounded-lg text-gray-900"
                >
                  <option value="Remitly">Remitly</option>
                  <option value="Western Union">Western Union</option>
                  <option value="Wise">Wise</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">
                  Recipient Account
                </label>
                <input
                  type="text"
                  value={remittanceForm.recipientAccount}
                  onChange={(e) =>
                    setRemittanceForm((prev) => ({
                      ...prev,
                      recipientAccount: e.target.value,
                    }))
                  }
                  className="w-full p-2 border rounded-lg text-gray-900"
                  placeholder="HDFC, AXIS NRO, etc."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">
                  Transfer Date
                </label>
                <input
                  type="date"
                  value={remittanceForm.transferDate}
                  onChange={(e) =>
                    setRemittanceForm((prev) => ({
                      ...prev,
                      transferDate: e.target.value,
                    }))
                  }
                  className="w-full p-2 border rounded-lg text-gray-900"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">
                Description
              </label>
              <textarea
                value={remittanceForm.description}
                onChange={(e) =>
                  setRemittanceForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                className="w-full p-2 border rounded-lg text-gray-900"
                rows="3"
                placeholder="Family support via Remitly"
              />
            </div>

            {remittanceForm.amountUsd && remittanceForm.amountInr && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Effective Rate:</strong> ₹
                  {(
                    parseFloat(remittanceForm.amountInr) /
                    parseFloat(remittanceForm.amountUsd)
                  ).toFixed(2)}{" "}
                  per USD
                </p>
              </div>
            )}

            <button
              onClick={handleRemittanceSubmit}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
            >
              Add Remittance
            </button>
          </div>
        </CardContent>
      </Card>

      {remittances.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>All Remittances This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {remittances.map((remittance) => (
                <div
                  key={remittance.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      ${parseFloat(remittance.amount_usd).toFixed(2)} → ₹
                      {parseFloat(remittance.amount_inr).toFixed(0)}
                    </p>
                    <p className="text-sm text-gray-600">
                      {remittance.purpose} • {remittance.transfer_method} •
                      Rate: ₹{parseFloat(remittance.effective_rate).toFixed(2)}
                    </p>
                    {remittance.description && (
                      <p className="text-xs text-gray-500">
                        {remittance.description}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => deleteRemittance(remittance.id)}
                    className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                    title="Delete remittance"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderExpenses = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            Add Big Expense - {monthNames[selectedMonth]} {selectedYear}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">
                  Category
                </label>
                <select
                  value={expenseForm.category}
                  onChange={(e) =>
                    setExpenseForm((prev) => ({
                      ...prev,
                      category: e.target.value,
                    }))
                  }
                  className="w-full p-2 border rounded-lg text-gray-900"
                >
                  <option value="Car">Car</option>
                  <option value="Tax">Tax</option>
                  <option value="Investment">Investment</option>
                  <option value="Personal">Personal</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">
                  Amount (USD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={expenseForm.amountUsd}
                  onChange={(e) =>
                    setExpenseForm((prev) => ({
                      ...prev,
                      amountUsd: e.target.value,
                    }))
                  }
                  className="w-full p-2 border rounded-lg text-gray-900"
                  placeholder="1500.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">
                  Amount (INR)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={expenseForm.amountInr}
                  onChange={(e) =>
                    setExpenseForm((prev) => ({
                      ...prev,
                      amountInr: e.target.value,
                    }))
                  }
                  className="w-full p-2 border rounded-lg text-gray-900"
                  placeholder="125000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">
                  Date
                </label>
                <input
                  type="date"
                  value={expenseForm.expenseDate}
                  onChange={(e) =>
                    setExpenseForm((prev) => ({
                      ...prev,
                      expenseDate: e.target.value,
                    }))
                  }
                  className="w-full p-2 border rounded-lg text-gray-900"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">
                Description *
              </label>
              <textarea
                value={expenseForm.description}
                onChange={(e) =>
                  setExpenseForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                className="w-full p-2 border rounded-lg text-gray-900"
                rows="3"
                placeholder="Car repair, tax payment, etc."
              />
            </div>

            <button
              onClick={handleExpenseSubmit}
              className="w-full bg-orange-600 text-white py-2 px-4 rounded-lg hover:bg-orange-700"
            >
              Add Expense
            </button>
          </div>
        </CardContent>
      </Card>

      {otherExpenses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Big Expenses This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {otherExpenses.map((expense) => (
                <div
                  key={expense.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {expense.category}
                    </p>
                    <p className="text-sm text-gray-600">
                      {expense.amount_usd &&
                        `$${parseFloat(expense.amount_usd).toFixed(2)}`}
                      {expense.amount_usd && expense.amount_inr && " • "}
                      {expense.amount_inr &&
                        `₹${parseFloat(expense.amount_inr).toFixed(0)}`}
                    </p>
                    <p className="text-xs text-gray-500">
                      {expense.description}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteExpense(expense.id)}
                    className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                    title="Delete expense"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderTransactions = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            Add Other Transaction - {monthNames[selectedMonth]} {selectedYear}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">
                  Type *
                </label>
                <select
                  value={transactionForm.type}
                  onChange={(e) =>
                    setTransactionForm((prev) => ({
                      ...prev,
                      type: e.target.value,
                    }))
                  }
                  className="w-full p-2 border rounded-lg text-gray-900"
                >
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                  <option value="owes_me">Owes Me</option>
                  <option value="i_owe">I Owe</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">
                  Category *
                </label>
                <input
                  type="text"
                  value={transactionForm.category}
                  onChange={(e) =>
                    setTransactionForm((prev) => ({
                      ...prev,
                      category: e.target.value,
                    }))
                  }
                  className="w-full p-2 border rounded-lg text-gray-900"
                  placeholder="Friend repayment, Freelance, Shopping, etc."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">
                  Amount *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={transactionForm.amount}
                  onChange={(e) =>
                    setTransactionForm((prev) => ({
                      ...prev,
                      amount: e.target.value,
                    }))
                  }
                  className="w-full p-2 border rounded-lg text-gray-900"
                  placeholder="100.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">
                  Currency
                </label>
                <select
                  value={transactionForm.currency}
                  onChange={(e) =>
                    setTransactionForm((prev) => ({
                      ...prev,
                      currency: e.target.value,
                    }))
                  }
                  className="w-full p-2 border rounded-lg text-gray-900"
                >
                  <option value="USD">USD</option>
                  <option value="INR">INR</option>
                </select>
              </div>
              {transactionForm.currency === "USD" && (
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">
                    Amount (INR) - Optional
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={transactionForm.amountInr}
                    onChange={(e) =>
                      setTransactionForm((prev) => ({
                        ...prev,
                        amountInr: e.target.value,
                      }))
                    }
                    className="w-full p-2 border rounded-lg text-gray-900"
                    placeholder="8350.00"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">
                  Source/Destination
                </label>
                <input
                  type="text"
                  value={transactionForm.source}
                  onChange={(e) =>
                    setTransactionForm((prev) => ({
                      ...prev,
                      source: e.target.value,
                    }))
                  }
                  className="w-full p-2 border rounded-lg text-gray-900"
                  placeholder="Friend name, company, store, etc."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">
                  Date
                </label>
                <input
                  type="date"
                  value={transactionForm.transactionDate}
                  onChange={(e) =>
                    setTransactionForm((prev) => ({
                      ...prev,
                      transactionDate: e.target.value,
                    }))
                  }
                  className="w-full p-2 border rounded-lg text-gray-900"
                />
              </div>

              {/* Debt specific fields */}
              {(transactionForm.type === "owes_me" ||
                transactionForm.type === "i_owe") && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">
                      Debt Status
                    </label>
                    <select
                      value={transactionForm.debtStatus}
                      onChange={(e) =>
                        setTransactionForm((prev) => ({
                          ...prev,
                          debtStatus: e.target.value,
                        }))
                      }
                      className="w-full p-2 border rounded-lg text-gray-900"
                    >
                      <option value="pending">Pending</option>
                      <option value="partial">Partially Paid</option>
                      <option value="settled">Settled</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">
                      Expected Payment Date
                    </label>
                    <input
                      type="date"
                      value={transactionForm.expectedDate}
                      onChange={(e) =>
                        setTransactionForm((prev) => ({
                          ...prev,
                          expectedDate: e.target.value,
                        }))
                      }
                      className="w-full p-2 border rounded-lg text-gray-900"
                    />
                  </div>
                </>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">
                Description *
              </label>
              <textarea
                value={transactionForm.description}
                onChange={(e) =>
                  setTransactionForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                className="w-full p-2 border rounded-lg text-gray-900"
                rows="2"
                placeholder="Detailed description..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">
                Notes
              </label>
              <textarea
                value={transactionForm.notes}
                onChange={(e) =>
                  setTransactionForm((prev) => ({
                    ...prev,
                    notes: e.target.value,
                  }))
                }
                className="w-full p-2 border rounded-lg text-gray-900"
                rows="2"
                placeholder="Additional notes..."
              />
            </div>

            <button
              onClick={handleTransactionSubmit}
              className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700"
            >
              Add Transaction
            </button>
          </div>
        </CardContent>
      </Card>

      {otherTransactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Other Transactions This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {otherTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      <span
                        className={`inline-block w-20 text-xs px-2 py-1 rounded ${
                          transaction.type === "income"
                            ? "bg-green-100 text-green-800"
                            : transaction.type === "expense"
                            ? "bg-red-100 text-red-800"
                            : transaction.type === "owes_me"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-orange-100 text-orange-800"
                        }`}
                      >
                        {transaction.type === "owes_me"
                          ? "OWES ME"
                          : transaction.type === "i_owe"
                          ? "I OWE"
                          : transaction.type.toUpperCase()}
                      </span>
                      <span className="ml-2">{transaction.category}</span>
                      {(transaction.type === "owes_me" ||
                        transaction.type === "i_owe") && (
                        <span
                          className={`ml-2 text-xs px-1 py-0.5 rounded ${
                            transaction.debt_status === "settled"
                              ? "bg-green-100 text-green-700"
                              : transaction.debt_status === "partial"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {transaction.debt_status}
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-gray-600">
                      {transaction.amount_usd &&
                        `$${parseFloat(transaction.amount_usd).toFixed(2)}`}
                      {transaction.amount_inr &&
                        ` • ₹${parseFloat(transaction.amount_inr).toFixed(0)}`}
                      {transaction.source && ` • ${transaction.source}`}
                      {transaction.expected_date &&
                        ` • Due: ${new Date(
                          transaction.expected_date
                        ).toLocaleDateString()}`}
                    </p>
                    <p className="text-xs text-gray-500">
                      {transaction.description}
                    </p>
                    {transaction.notes && (
                      <p className="text-xs text-gray-400">
                        Notes: {transaction.notes}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => deleteTransaction(transaction.id)}
                    className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                    title="Delete transaction"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Personal Finance Tracker
          </h1>
          <p className="text-gray-600">
            Monthly salary and remittance tracking with debt management
          </p>
        </div>

        <div className="mb-6">
          <nav className="flex space-x-4">
            {[
              { id: "all-months", label: "All Months", icon: Calendar },
              { id: "single-month", label: "Single Month", icon: Calendar },
              { id: "salary", label: "Salary", icon: DollarSign },
              { id: "remittances", label: "Remittances", icon: Home },
              { id: "expenses", label: "Big Expenses", icon: Car },
              {
                id: "transactions",
                label: "Other Transactions",
                icon: Receipt,
              },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setCurrentView(id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  currentView === id
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {currentView === "all-months" && renderAllMonthsOverview()}
        {currentView === "single-month" && renderSingleMonthOverview()}
        {currentView === "salary" && renderSalaryEntry()}
        {currentView === "remittances" && renderRemittances()}
        {currentView === "expenses" && renderExpenses()}
        {currentView === "transactions" && renderTransactions()}
      </div>
    </div>
  );
};

export default ExpenseTracker;
