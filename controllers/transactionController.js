const Transaction = require('../model/transaction');

const getAllTransactions = async (req, res) => {
  try {
      const transactions = await Transaction.find().populate('instructorId');
      res.status(200).json({ transactions });
  } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
  }
};

const getTransactionsByInstructorId = async (req, res) => {
  try {
      const { instructorId } = req.params;
      const transactions = await Transaction.find({ instructorId }).populate('instructorId');
      res.status(200).json({ transactions });
  } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
  }
};


module.exports = {

    getAllTransactions,
    getAllTransactions

}