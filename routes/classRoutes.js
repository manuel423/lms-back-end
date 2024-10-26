const express = require('express');
const router = express.Router();
const classController = require('../controllers/newtutclass'); // Adjust the path as needed

// Route to create a new class
router.post('/createClass', classController.createClass);

// Route to get all classes
router.get('/getAllClasses', classController.getAllClasses);

// Route to get a class by ID
router.get('/getClassById/:id', classController.getClassById);

// Route to get classes by tutor instructor ID
router.get('/getClassesByTutorInstructorId/:instructorId', classController.getClassesByTutorInstructorId);


router.put('/updateClass/:id', classController.updateClass);

// Route to delete a class
router.delete('/deleteClass/:id', classController.deleteClass);


module.exports = router;
