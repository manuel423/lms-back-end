const Note = require('../model/note');
const { StatusCodes } = require('http-status-codes');

const createOrUpdateNote = async (req, res) => {
  const { userId, courseId, lessonId, content } = req.body;

  try {
    let note = await Note.findOne({ userId, courseId, lessonId });

    if (note) {
      // Update existing note
      note.content = content;
      note.updatedAt = Date.now();
      await note.save();
    } else {
      // Create new note
      note = new Note({
        userId,
        courseId,
        lessonId,
        content,
      });
      await note.save();
    }

    res.status(StatusCodes.OK).json({ note });
  } catch (error) {
    console.error('Error creating/updating note:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
  }
};

const getNotesByLesson = async (req, res) => {
  const { userId, courseId, lessonId } = req.params;

  try {
    const notes = await Note.find({ userId, courseId, lessonId });
    res.status(StatusCodes.OK).json({ notes });
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
  }
};

module.exports = { createOrUpdateNote, getNotesByLesson };
