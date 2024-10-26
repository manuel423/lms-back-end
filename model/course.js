
const mongoose = require('mongoose');

// Question schema
const questionSchema = new mongoose.Schema({
  questionText: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
  },
  options: [{
    type: String,
    required: true,
  }],
  correctAnswers: [{
    type: String,
    required: true,
  }]
});

// Questions group schema
const questionsGroupSchema = new mongoose.Schema({
  questions: [questionSchema]
});

// Lesson file schema
const lessonFileSchema = new mongoose.Schema({
  LesssonText: String,
  LessonType: {
    type: String,
    required: true,
  },
  LessonUrl: String,
});

// Chapter schema
const chapterSchema = new mongoose.Schema({
  LessonName: String,
  LessonFile: [lessonFileSchema],
  questionsGroup: questionsGroupSchema
});

// Course schema
const courseSchema = new mongoose.Schema(
  {
    courseName: String,
    paymentType: {
      type: String,
      required: true,
      enum: ['free', 'paid']
    },
    createCourseas: {
      type: String,
      enum: [
        "Buisness",
        "individual",
        "Government",
        "all",
        "universities",
        "schools",
        "Buisness and Government and individual",
        " Buisness and Government",
        "universities and schools "
      ]
    },
    eligiblesusers: {
      type: String,
    },
    price: Number,
    priceInUSD: {
      type: Number,
      default: 0,
    },
    courseDescription: String,
    aboutCourse: String,
    createUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    totalAmountEarned: {
      type: Number,
      default: 0,
    },
    categories: [String],
    averageRating: {
      type: Number,
      default: 0,
    },
    numOfReviews: {
      type: Number,
      default: 0,
    },
    status: { type: String, enum: ["Pending", "Approved", "Rejected", "draft"], default: 'draft' },
    rejectionReason: {
      type: String,
    },
    courseDuration: String,
    userWhoHasBought: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    coverPage: [String],
    chapter: [chapterSchema]
  },
  {
    timestamps: true
  }
);

courseSchema.virtual('reviews', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'product',
  justOne: false,
});

const Course = mongoose.model('Course', courseSchema);
module.exports = Course;

