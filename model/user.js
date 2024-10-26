const mongoose = require('mongoose');
const bcrypt = require("bcryptjs");

const Schema = mongoose.Schema;

const UserSchema = new Schema({
  fullname: {
    type: String,
  },
  enrolledCourses: [{
    course: {
      type: Schema.Types.ObjectId,
      ref: 'Course'
    },
    progress: {
      type: Number,
      default: 0
    },
    lesson: [{
      lessonId: String,
      lessonTime: String,
      progress: Number,
      questionid: String,
      Average: Number,
      groupquestionid: String,
      averagescoreprogress: Number,
    }]
  }],
  enrolledClasses: [{  // Array of class IDs the user is enrolled in
    type: Schema.Types.ObjectId,
    ref: 'TutorClass'
  }],
  enrolledInstructors: [{
    instructor: {
      type: Schema.Types.ObjectId,
      ref: 'Tutorinstructor'
    },
    enrollmentTime: {
      type: Date,
      default: Date.now
    }
  }],
  email: {
    type: String,
  },
  password: {
    type: String,
  },
  phoneNumber: {
    type: String,
  },
  images: {
    type: [String]
  },
  coursesBought: [{
    type: Schema.Types.ObjectId,
    ref: 'Course'
  }],
  cart: [{
    type: Schema.Types.ObjectId,
    ref: 'Course'
  }],
  Gender: {
    type: String,
    enum: ['male', 'female'],
  },
  userName:{type:String},
  Exprience: { type: String },
  Location: { type: String },
  idCard: {
    type: [String],
    default: [],
  },
  instructorLicense: {
    type: [String],
    default: [],
  },
  role: {
    type: String,
    enum: ['admin', 'user', 'instructor', "company_owner", "tutorinstructor"],
    default: 'user',
    required: true
  },
  userId: {
    type: [String],
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
  productionstudio: {
    type: String,
    enum: ["kegebrew University", "Indiviual"],
    default: 'Indiviual'
  },
  api_permission: {
    type: String,
  },
  totalAmountEarned: {
    type: Number,
    default: 0,
  },
  calculatedTotalAmountEarned: {
    type: String,
    default: 0,
  },
  sessionToken: { type: String },
  status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: 'Pending' },
}, {
  timestamps: true
});

UserSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

UserSchema.methods.comparePassword = async function (candidatePassword) {
  const isMatch = await bcrypt.compare(candidatePassword, this.password);
  return isMatch;
};

UserSchema.methods.updateCourseProgress = async function (courseId, progress) {
  const index = this.enrolledCourses.findIndex(course => course.course.equals(courseId));
  if (index !== -1) {
    this.enrolledCourses[index].progress = progress;
    await this.save();
    return true;
  }
  return false;
};

module.exports = mongoose.model("User", UserSchema);
