const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const { Transaction, Budget, IncomeStatement } = require('./models');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Connect to MongoDB
mongoose.connect('mongodb+srv://aditya:hello@financial.mwt9frk.mongodb.net/?retryWrites=true&w=majority&appName=financial', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected...'))
    .catch(err => console.error('MongoDB connection error:', err));

// Define CRUD operations for transactions
// Add transaction
app.post('/transactions', async (req, res) => {
    const { date, description, amount, category } = req.body;
    const newTransaction = new Transaction({ date, description, amount, category });
    try {
        await newTransaction.save();
        await updateIncomeStatement(); // Update and save income statement after adding transaction
        res.json(newTransaction);
    } catch (err) {
        res.status(400).json({ error: 'Failed to add transaction' });
    }
});

// Get all transactions
app.get('/transactions', async (req, res) => {
    try {
        const transactions = await Transaction.find();
        res.json(transactions);
    } catch (err) {
        res.status(400).json({ error: 'Failed to fetch transactions' });
    }
});

// Delete a transaction
app.delete('/transactions/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await Transaction.findByIdAndDelete(id);
        await updateIncomeStatement(); // Update and save income statement after deleting transaction
        res.json({ message: 'Transaction deleted successfully' });
    } catch (err) {
        res.status(400).json({ error: 'Failed to delete transaction' });
    }
});

// Define CRUD operations for budgets
// Add budget
app.post('/budgets', async (req, res) => {
    const { category, allocatedAmount, actualAmount } = req.body;
    const newBudget = new Budget({ category, allocatedAmount, actualAmount });
    try {
        await newBudget.save();
        await updateIncomeStatement(); // Update and save income statement after adding budget
        res.json(newBudget);
    } catch (err) {
        res.status(400).json({ error: 'Failed to add budget' });
    }
});

// Get all budgets
app.get('/budgets', async (req, res) => {
    try {
        const budgets = await Budget.find();
        res.json(budgets);
    } catch (err) {
        res.status(400).json({ error: 'Failed to fetch budgets' });
    }
});

// Delete a budget
app.delete('/budgets/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await Budget.findByIdAndDelete(id);
        await updateIncomeStatement(); // Update and save income statement after deleting budget
        res.json({ message: 'Budget deleted successfully' });
    } catch (err) {
        res.status(400).json({ error: 'Failed to delete budget' });
    }
});

// Get all income statements
app.get('/income-statements', async (req, res) => {
    try {
        const incomeStatements = await IncomeStatement.find();
        res.json(incomeStatements);
    } catch (error) {
        console.error('Error fetching income statements:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Update income statement function
async function updateIncomeStatement() {
    try {
        // Fetch existing income statements
        const incomeStatements = await IncomeStatement.find();

        // Reset income and expenses to recalculate
        for (let statement of incomeStatements) {
            statement.income = 0;
            statement.expenses = 0;
            statement.netIncome = 0;
        }

        // Fetch all transactions and budgets
        const transactions = await Transaction.find();
        const budgets = await Budget.find();

        // Update income and expenses based on transactions
        transactions.forEach(transaction => {
            const month = transaction.date.toLocaleString('default', { month: 'long' });
            const year = transaction.date.getFullYear();
            const statement = incomeStatements.find(s => s.month === `${month} ${year}`);

            if (statement) {
                statement.income += transaction.amount > 0 ? transaction.amount : 0;
                statement.expenses += transaction.amount < 0 ? -transaction.amount : 0;
            }
        });

        // Update expenses based on budgets
        budgets.forEach(budget => {
            const month = new Date().toLocaleString('default', { month: 'long' });
            const year = new Date().getFullYear();
            const statement = incomeStatements.find(s => s.month === `${month} ${year}`);

            if (statement) {
                statement.expenses += budget.actualAmount;
            }
        });

        // Calculate net income for each statement
        incomeStatements.forEach(async statement => {
            statement.netIncome = statement.income - statement.expenses;
            await statement.save(); // Save each updated income statement
        });
    } catch (error) {
        console.error('Error updating income statement:', error);
        throw new Error('Failed to update income statement');
    }
}

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
