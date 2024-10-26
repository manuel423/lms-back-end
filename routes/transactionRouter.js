const express = require('express');
const router = express.Router();
const { authenticateUser, authorizePermissions } = require("../middleware/authentication");
const instructorController = require('../controllers/InstructorController');
const transactionController = require('../controllers/transactionController');

router.post('/request-payout/:instructorId', authenticateUser, authorizePermissions('tutorinstructor'), instructorController.requestPayout);
router.get('/transactions', authenticateUser, authorizePermissions('admin'), transactionController.getAllTransactions);
router.get('/transactions/:instructorId', authenticateUser, authorizePermissions('admin', 'tutorinstructor'), transactionController.getTransactionsByInstructorId);

module.exports = router;
