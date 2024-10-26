const mongoose = require("mongoose");

// Define address schema
const addressSchema = new mongoose.Schema({
  street: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String },
  postalCode: { type: String, required: true },
  country: { type: String, required: true },
});

// Define payment schema
const paymentSchema = new mongoose.Schema({
  transactionID: { type: String, required: true, unique: true },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, required: true },
  paymentMethod: { type: String, required: true },
  customerID: {  type: mongoose.Schema.Types.ObjectId,
    ref: 'User' },
  orderID: {  type: mongoose.Schema.Types.ObjectId,
    ref: 'Order' },
  status: { type: String },
},
{
timestamps: true
});

const Payment = mongoose.model("Payment", paymentSchema);

module.exports = Payment;
