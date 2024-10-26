const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define schema for available time slots
const AvailableTimeSchema = new Schema({
  day: { type: [String], required: true },
  timeSlots: [{ type: String, required: true }]  // Array of time slots available on the day
});

// Define schema for tutor classes
const TutorClassSchema = new Schema({
  className: { type: String, required: true },
  availableTime: [AvailableTimeSchema],  // Array of available time objects
  grade: { type: String, required: true },
  howManyStudents: { type: Number, required: true },
  price: { type: Number, required: true },
  createUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  userWhoHasEnrolled: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]  ,
  roomId: { type: String, required: true }  // Assuming roomId is a string identifier
});

// Create model from schema
const TutorClass = mongoose.model('TutorClass', TutorClassSchema);

module.exports = TutorClass;
