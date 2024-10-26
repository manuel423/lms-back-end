const express = require('express');
const noteController = require('../controllers/noteController');

const router = express.Router();

router.post('/', noteController.createOrUpdateNote);
router.get('/notes/:userId/:courseId/:lessonId', noteController.getNotesByLesson);

module.exports = router;