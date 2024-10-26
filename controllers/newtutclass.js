const TutorClass = require('../model/tutclass');  // Adjust the path as needed
const { StatusCodes } = require('http-status-codes');

const createClass = async (req, res) => {
  try {
    const { className, availableTime, grade, howManyStudents, price, createUser, roomId } = req.body;

    // Check for required fields
    if (!className || !availableTime || !grade || !howManyStudents || !price || !createUser || !roomId) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: 'All fields are required' });
    }

    // Create a new tutor class
    const newClass = await TutorClass.create({
      className,
      availableTime,
      grade,
      howManyStudents,
      price,
      createUser,
      roomId
    });

    return res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Class created successfully',
      class: newClass
    });
  } catch (error) {
    console.error(error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
  }
};

// Controller to get all classes
const getAllClasses = async (req, res) => {
    try {
      const classes = await TutorClass.find();
      return res.status(StatusCodes.OK).json({
        success: true,
        classes
      });
    } catch (error) {
      console.error(error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
    }
  };
  
  // Controller to get a class by ID
  const getClassById = async (req, res) => {
    try {
      const { id } = req.params;
      const classData = await TutorClass.findById(id);
  
      if (!classData) {
        return res.status(StatusCodes.NOT_FOUND).json({ error: 'Class not found' });
      }
  
      return res.status(StatusCodes.OK).json({
        success: true,
        class: classData
      });
    } catch (error) {
      console.error(error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
    }
  };
  
  // Controller to get classes by tutor instructor ID
  const getClassesByTutorInstructorId = async (req, res) => {
    try {
      const { instructorId } = req.params;
      const classes = await TutorClass.find({ createUser: instructorId });
  
      if (classes.length === 0) {
        return res.status(StatusCodes.NOT_FOUND).json({ error: 'No classes found for this instructor' });
      }
  
      return res.status(StatusCodes.OK).json({
        success: true,
        classes
      });
    } catch (error) {
      console.error(error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
    }  

}

// Controller to update a class
const updateClass = async (req, res) => {
    try {
      const { id } = req.params;
      const updatedClass = await TutorClass.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
  
      if (!updatedClass) {
        return res.status(StatusCodes.NOT_FOUND).json({ error: 'Class not found' });
      }
  
      return res.status(StatusCodes.OK).json({
        success: true,
        message: 'Class updated successfully',
        class: updatedClass
      });
    } catch (error) {
      console.error(error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
    }
  };
  
  // Controller to delete a class
  const deleteClass = async (req, res) => {
    try {
      const { id } = req.params;
      const deletedClass = await TutorClass.findByIdAndDelete(id);
  
      if (!deletedClass) {
        return res.status(StatusCodes.NOT_FOUND).json({ error: 'Class not found' });
      }
  
      return res.status(StatusCodes.OK).json({
        success: true,
        message: 'Class deleted successfully',
        class: deletedClass
      });
    } catch (error) {
      console.error(error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
    }
  };

module.exports = {
  createClass,
  getAllClasses,
  getClassById,
  getClassesByTutorInstructorId,
  deleteClass,
  updateClass
};
