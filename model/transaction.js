// models/transaction.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const transactionSchema = new Schema({
  instructorId: { type: Schema.Types.ObjectId, ref: 'Tutorinstructor', required: true },
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  type: { type: String, enum: ['Payout', 'Earning'], required: true },
  status: { type: String, enum: ['Pending', 'Completed'], default: 'Pending' },
});

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;
