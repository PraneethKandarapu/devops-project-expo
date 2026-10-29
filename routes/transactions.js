const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const auth = require('../middleware/auth');

// All transaction routes require authentication
router.use(auth);

// GET /api/transactions - Get all transactions for current user
router.get('/', async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.user.id }).sort({ date: -1 });
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving transactions' });
  }
});

// POST /api/transactions - Create new transaction
router.post('/', async (req, res) => {
  try {
    const { title, amount, type, category, date } = req.body;

    const transaction = new Transaction({
      userId: req.user.id,
      title,
      amount: Number(amount),
      type,
      category,
      date: date ? new Date(date) : new Date(),
    });

    const saved = await transaction.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/transactions/:id - Delete a single transaction
router.delete('/:id', async (req, res) => {
  try {
    const transaction = await Transaction.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found or unauthorized' });
    }

    res.json({ message: 'Transaction deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete transaction' });
  }
});

// DELETE /api/transactions/all - Clear all records for this user
router.delete('/', async (req, res) => {
  try {
    await Transaction.deleteMany({ userId: req.user.id });
    res.json({ message: 'All user transactions cleared' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to clear transactions' });
  }
});

// POST /api/transactions/sample - Load default sample transactions for user
router.post('/sample', async (req, res) => {
  try {
    const sampleData = [
      {
        userId: req.user.id,
        title: 'Monthly Pocket Money',
        amount: 8000,
        type: 'income',
        category: 'Salary',
        date: new Date(Date.now() - 5 * 86400000),
      },
      {
        userId: req.user.id,
        title: 'Semester Textbooks',
        amount: 1450,
        type: 'expense',
        category: 'Education',
        date: new Date(Date.now() - 3 * 86400000),
      },
      {
        userId: req.user.id,
        title: 'Hostel Mess & Groceries',
        amount: 1200,
        type: 'expense',
        category: 'Food',
        date: new Date(Date.now() - 2 * 86400000),
      },
      {
        userId: req.user.id,
        title: 'Metro Smart Card Recharge',
        amount: 500,
        type: 'expense',
        category: 'Travel',
        date: new Date(Date.now() - 1 * 86400000),
      },
    ];

    await Transaction.insertMany(sampleData);
    const all = await Transaction.find({ userId: req.user.id }).sort({ date: -1 });
    res.status(201).json(all);
  } catch (err) {
    res.status(500).json({ message: 'Failed to insert sample transactions' });
  }
});

module.exports = router;