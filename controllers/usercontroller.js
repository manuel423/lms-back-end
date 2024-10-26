const User = require("../model/user");
const Course = require('../model/course');
const TutorClass = require('../model/tutclass');
const TutorInstructor = require('../model/instructor');
const CustomError = require("../errors"); 
const { StatusCodes } = require("http-status-codes");
const { sendApprovalEmail, sendRejectionEmail } = require('./sendemailController'); 
const moment = require("moment");
const mongoose = require('mongoose');

require("dotenv").config();

const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, role, status, gender, location } = req.query;

    // Parse page and limit to integers
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    // Build the filter object
    const filter = {};
    if (role) filter.role = role;
    if (status) filter.status = status;
    if (gender) filter.Gender = gender;
    if (location) filter.Location = location;

    // Calculate total number of users with the applied filters
    const totalUsers = await User.countDocuments(filter);

    // Fetch the users with pagination, filtering, and sorting
    const users = await User.find(filter)
      .sort({ createdAt: -1 }) // Sort by creation date in descending order
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber);

    // Calculate total number of pages
    const totalPages = Math.ceil(totalUsers / limitNumber);

    res.status(StatusCodes.OK).json({
      users,
      currentPage: pageNumber,
      totalPages,
      totalUsers,
    });
  } catch (error) {
    console.error(error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Something went wrong" });
  }
};


// const getAllUsers = async (req, res) => {
//   try {
//     const { page = 1, limit = 10, role, status, gender, location } = req.query;

//     // Parse page and limit to integers
//     const pageNumber = parseInt(page, 10);
//     const limitNumber = parseInt(limit, 10);

//     // Build the filter object
//     const filter = {};
//     if (role) filter.role = role;
//     if (status) filter.status = status;
//     if (gender) filter.Gender = gender;
//     if (location) filter.Location = location;

//     // Calculate total number of users with the applied filters
//     const totalUsers = await User.countDocuments(filter);

//     // Fetch the users with pagination, filtering, and sorting
//     const users = await User.find(filter)
//       .sort({ createdAt: -1 }) // Sort by creation date in descending order
//       .skip((pageNumber - 1) * limitNumber)
//       .limit(limitNumber);

//     // Calculate total number of pages
//     const totalPages = Math.ceil(totalUsers / limitNumber);

//     // Calculate date ranges for current and previous periods
//     const now = moment();
//     const startOfWeek = now.startOf('week').toDate();
//     const startOfMonth = now.startOf('month').toDate();
//     const startOfYear = now.startOf('year').toDate();

//     const startOfLastWeek = moment().subtract(1, 'weeks').startOf('week').toDate();
//     const startOfLastMonth = moment().subtract(1, 'months').startOf('month').toDate();
//     const startOfLastYear = moment().subtract(1, 'years').startOf('year').toDate();

//     // Count registrations for the current week, month, and year
//     const currentWeekRegistrations = await User.countDocuments({
//       ...filter,
//       createdAt: { $gte: startOfWeek }
//     });

//     const currentMonthRegistrations = await User.countDocuments({
//       ...filter,
//       createdAt: { $gte: startOfMonth }
//     });

//     const currentYearRegistrations = await User.countDocuments({
//       ...filter,
//       createdAt: { $gte: startOfYear }
//     });

//     // Count registrations for the previous week, month, and year
//     const lastWeekRegistrations = await User.countDocuments({
//       ...filter,
//       createdAt: { $gte: startOfLastWeek, $lt: startOfWeek }
//     });

//     const lastMonthRegistrations = await User.countDocuments({
//       ...filter,
//       createdAt: { $gte: startOfLastMonth, $lt: startOfMonth }
//     });

//     const lastYearRegistrations = await User.countDocuments({
//       ...filter,
//       createdAt: { $gte: startOfLastYear, $lt: startOfYear }
//     });

//     // Calculate percentage increase
//     const calculatePercentageIncrease = (current, previous) => {
//       if (previous === 0) return current === 0 ? 0 : 100;
//       return ((current - previous) / previous) * 100;
//     };

//     const weekIncrease = calculatePercentageIncrease(currentWeekRegistrations, lastWeekRegistrations).toFixed(2);
//     const monthIncrease = calculatePercentageIncrease(currentMonthRegistrations, lastMonthRegistrations).toFixed(2);
//     const yearIncrease = calculatePercentageIncrease(currentYearRegistrations, lastYearRegistrations).toFixed(2);

//     res.status(StatusCodes.OK).json({
//       users,
//       currentPage: pageNumber,
//       totalPages,
//       totalUsers,
//       metrics: {
//         currentWeekRegistrations,
//         lastWeekRegistrations,
//         weekIncrease: `${weekIncrease}%`,
//         currentMonthRegistrations,
//         lastMonthRegistrations,
//         monthIncrease: `${monthIncrease}%`,
//         currentYearRegistrations,
//         lastYearRegistrations,
//         yearIncrease: `${yearIncrease}%`,
//       }
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Something went wrong" });
//   }
// };


const getUserById = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: "Something went wrong" });
  }
};

const updateInstructor = async (req, res) => {
  try {
    const { userName } = req.params;
    const { fullname, phoneNumber, email, password, Gender, Exprience, Location, createCourseas } = req.body;
    
    // Check if instructor exists
    const instructor = await User.findOne({ userName });
    if (!instructor) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "Instructor not found" });
    }

    // Handle ID card file update
    if (req.files && req.files['idCard'] && req.files['idCard'].length > 0) {
      // Delete previous ID card images
      if (instructor.idCard && instructor.idCard.length > 0) {
        instructor.idCard.forEach(async (image) => {
          const filename = image.split('/').pop();
          const imagePath = path.join(__dirname, '..', 'uploads', 'instructor', 'idcards', filename);
          try {
            if (fs.existsSync(imagePath)) {
              fs.unlinkSync(imagePath);
              console.log(`Deleted previous ID card: ${imagePath}`);
            } else {
              console.log(`Previous ID card not found: ${imagePath}`);
            }
          } catch (error) {
            console.error(`Error deleting previous ID card: ${imagePath}`, error);
          }
        });
      }

      // Map uploaded ID card image files to their URLs with base URL
      const idCardImages = req.files['idCard'].map(file => baseURL + "/uploads/instructor/idcards/" + file.filename);
      instructor.idCard = idCardImages;
    }

    // Handle instructor license file update
    if (req.files && req.files['instructorLicense'] && req.files['instructorLicense'].length > 0) {
      // Delete previous instructor license images
      if (instructor.instructorLicense && instructor.instructorLicense.length > 0) {
        instructor.instructorLicense.forEach(async (image) => {
          const filename = image.split('/').pop();
          const imagePath = path.join(__dirname, '..', 'uploads', 'instructor', 'instructorlicense', filename);
          try {
            if (fs.existsSync(imagePath)) {
              fs.unlinkSync(imagePath);
              console.log(`Deleted previous instructor license: ${imagePath}`);
            } else {
              console.log(`Previous instructor license not found: ${imagePath}`);
            }
          } catch (error) {
            console.error(`Error deleting previous instructor license: ${imagePath}`, error);
          }
        });
      }

      // Map uploaded instructor license image files to their URLs with base URL
      const instructorLicenseImages = req.files['instructorLicense'].map(file => baseURL + "/uploads/instructor/instructorlicense/" + file.filename);
      instructor.instructorLicense = instructorLicenseImages;
    }

    // Update instructor information
    instructor.fullname = fullname;
    instructor.phoneNumber = phoneNumber;
    instructor.email = email;
    instructor.password = password;
    instructor.Gender = Gender;
    instructor.Exprience = Exprience;
    instructor.Location = Location;
    instructor.createCourseas = createCourseas;

    await instructor.save();

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Instructor updated successfully",
      instructor
    });
  } catch (error) {
    console.error(error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
  }
};



//this works perfectly
// const enrollCourse = async (req, res) => {
//   try {
//     const courseId = req.params.courseId;
//     const { userId } = req.body;

//     // Check if the course exists
//     const course = await Course.findById(courseId);
//     if (!course) {
//       return res.status(StatusCodes.NOT_FOUND).json({ error: 'Course not found' });
//     }

//     // Check if the user exists
//     const user = await User.findById(userId);
//     if (!user) {
//       return res.status(StatusCodes.NOT_FOUND).json({ error: 'User not found' });
//     }

//     // Check if the user is already enrolled in the course
//     if (course.userWhoHasBought.includes(userId)) {
//       return res.status(StatusCodes.BAD_REQUEST).json({ error: 'User already enrolled in the course' });
//     }

//     // Add the user to the list of users who have bought the course
//     course.userWhoHasBought.push(userId);

//     // Add the course to the user's enrolled courses with progress set to 0
//     const enrolledCourse = { course: courseId, progress: 0, lesson: [] };

//     // Push all lesson IDs into the lesson array
//     course.chapter.forEach(chap => {
//       chap.LessonFile.forEach(lesson => {
//         enrolledCourse.lesson.push({
//           lessonId: lesson._id.toString(), // Convert ObjectId to string
//           lessonTime: new Date().toISOString(), // Set the lesson time to current time
//           progress: 0 // Set initial progress to 0
//         });
//       });
//     });

//     // Update the total amount earned for the course and the instructor if the course is paid
//     if (course.paymentType === 'paid' && course.price) {
//       course.totalAmountEarned += course.price;

//       const instructor = await User.findById(course.createUser);
//       if (instructor) {
//         instructor.totalAmountEarned += course.price;
//         await instructor.save();
//       }
//     }

//     await course.save();

//     user.enrolledCourses.push(enrolledCourse);
//     await user.save();

//     res.status(StatusCodes.OK).json({ message: 'User enrolled in the course successfully' });
//   } catch (error) {
//     console.error('Error enrolling user in course:', error);
//     res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
//   }
// };

const enrollCourse = async (req, res) => {
  try {
    const courseId = req.params.courseId;
    const { userId } = req.body;

    // Check if the course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: 'Course not found' });
    }

    // Check if the user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: 'User not found' });
    }

    // Check if the user is already enrolled in the course
    if (course.userWhoHasBought.includes(userId)) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: 'User already enrolled in the course' });
    }

    // Add the user to the list of users who have bought the course
    course.userWhoHasBought.push(userId);

    // Add the course to the user's enrolled courses with progress set to 0
    const enrolledCourse = { course: courseId, progress: 0, lesson: [] };

    // Push all lesson IDs and question group IDs into the lesson array
    course.chapter.forEach(chap => {
      if (chap.LessonFile && Array.isArray(chap.LessonFile)) {
        chap.LessonFile.forEach(lesson => {
          if (lesson && lesson._id) {
            enrolledCourse.lesson.push({
              lessonId: lesson._id.toString(), // Convert ObjectId to string
              lessonTime: new Date().toISOString(), // Set the lesson time to current time
              progress: 0, // Set initial progress to 0
            });
          } else {
            console.error('Lesson or lesson._id is undefined:', lesson);
          }
        });
      } else {
        console.error('chap.LessonFile is not an array or undefined:', chap.LessonFile);
      }

      if (chap.questionsGroup && chap.questionsGroup._id) {
        enrolledCourse.lesson.push({
          groupquestionid: chap.questionsGroup._id.toString(), // Convert ObjectId to string
          averagescoreprogress: 0 // Initialize averagescoreprogress
        });
      } else {
        console.error('chap.questionsGroup or chap.questionsGroup._id is undefined:', chap.questionsGroup);
      }
    });

    // Update the total amount earned for the course and the instructor if the course is paid
    if (course.paymentType === 'paid' && course.price) {
      course.totalAmountEarned += course.price;

      const instructor = await User.findById(course.createUser);
      if (instructor) {
        instructor.totalAmountEarned += course.price;
        await instructor.save();
      }
    }

    await course.save();

    user.enrolledCourses.push(enrolledCourse);
    await user.save();

    res.status(StatusCodes.OK).json({ message: 'User enrolled in the course successfully' });
  } catch (error) {
    console.error('Error enrolling user in course:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
  }
};



const enrollClass = async (req, res) => {
  try {
    const classId = req.params.classId;
    const { userId } = req.body;

    // Check if the class exists
    const tutorClass = await TutorClass.findById(classId);
    if (!tutorClass) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: 'Class not found' });
    }

    // Check if the user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: 'User not found' });
    }

    // Check if the user is already enrolled in the class
    if (tutorClass.userWhoHasEnrolled.includes(userId)) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: 'User already enrolled in the class' });
    }

    // Add the user to the list of users who have enrolled in the class
    tutorClass.userWhoHasEnrolled.push(userId);

    // Add the class to the user's enrolled classes
    user.enrolledClasses.push(classId);

    const classCreator = await User.findById(tutorClass.createUser);
    if (classCreator) {
      classCreator.totalAmountEarned += tutorClass.price;
      await classCreator.save();
    }


    await tutorClass.save();
    await user.save();

    res.status(StatusCodes.OK).json({ message: 'User enrolled in the class successfully' });
  } catch (error) {
    console.error('Error enrolling user in class:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
  }
};


const getInstructorById = async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch the instructor by ID
    const instructor = await User.findById(id);

    if (!instructor) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "Instructor not found" });
    }

    // Check if the user role is instructor
    if (instructor.role !== 'instructor') {
      return res.status(StatusCodes.FORBIDDEN).json({ error: "User is not an instructor" });
    }

    // Fetch courses created by the instructor
    const courses = await Course.find({ createUser: id });

    let calculatedTotalAmountEarned = 0;

    for (const course of courses) {
      calculatedTotalAmountEarned += course.totalAmountEarned * (instructor.earningsPercentage / 100);
    }

    // Save the calculated total amount earned in the database
    instructor.calculatedTotalAmountEarned = calculatedTotalAmountEarned;
    await instructor.save();

    // Return instructor details along with calculated totalAmountEarned
    res.status(StatusCodes.OK).json({
      success: true,
      instructor: {
        ...instructor.toObject(),
        calculatedTotalAmountEarned: calculatedTotalAmountEarned
      }
    });
  } catch (error) {
    console.error("Error fetching instructor by ID:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
  }
};


const updateInstructorEarnings = async (req, res) => {
  try {
    const { id } = req.params;
    const { percentage } = req.body; // Get the percentage from the request body

    if (!percentage || percentage < 0 || percentage > 100) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "Invalid percentage value" });
    }

    const instructor = await User.findById(id);

    if (!instructor) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Instructor not found" });
    }

    // Update the earningsPercentage
    instructor.earningsPercentage = percentage;

    // Save the updated instructor document
    await instructor.save();

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Earnings percentage updated successfully",
      instructor: instructor.toObject()
    });
  } catch (error) {
    console.error("Error updating instructor earnings percentage:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "Internal server error" });
  }
};

const withdrawAmount = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount } = req.body;

    // Fetch the instructor by ID
    const instructor = await User.findById(id);

    if (!instructor) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "Instructor not found" });
    }

    // Check if the user role is instructor
    if (instructor.role !== 'instructor') {
      return res.status(StatusCodes.FORBIDDEN).json({ error: "User is not an instructor" });
    }

    // Check if the instructor has enough funds to withdraw
    if (instructor.calculatedTotalAmountEarned < amount) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: "Insufficient funds" });
    }

    // Process the withdrawal
    instructor.calculatedTotalAmountEarned -= amount;
    await instructor.save();

    // Respond with the remaining balance
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Withdrawal successful",
      remainingBalance: instructor.calculatedTotalAmountEarned,
    });
  } catch (error) {
    console.error("Error processing withdrawal:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
  }
};

const deleteuser = async (req, res) => {
  try {
    const { id } = req.params;
    const finduser = await User.findByIdAndDelete({ _id: id });
    if (!finduser) {
      return res.status(400).json({ error: "no such user found" });
    }
    return res.status(200).json({ message: "deleted sucessfully" });
  } catch (error) {
    res.status(500).json({ error: "something went wrong" });
  }
};

const updateUser = async (req, res) => {
  try {
    const {userId} = req.body;
    let updatedUser = await User.findById(userId);

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Update name, bio, and username if available
    if (req.body.fullname) updatedUser.fullname = req.body.fullname;  
    if (req.body.phoneNumber) updatedUser.phoneNumber = req.body.phoneNumber;
  

    // Update email if available and validate format
    if (req.body.email) {
      const emailAlreadyExists = await User.findOne({ email: req.body.email });
      if (emailAlreadyExists) {
        return res.status(400).json({ error: "Email already exists" });
      }
      updatedUser.email = req.body.email;
    }

    // Update password if available
    if (req.body.password) {
      const salt = await bcrypt.genSalt(10);
      updatedUser.password = await bcrypt.hash(req.body.password, salt);
    }

    // Handle pictures update if available
    if (req.files && req.files.length > 0) {
      const newPictures = req.files.map(
        (file) => `${process.env.BASE_URL}/uploads/profile/${file.filename}`
      );
      updatedUser.pictures = newPictures;
    }

    await updatedUser.save();

    // Respond with updated user data (excluding password)
    res.status(200).json({
      message: "User updated successfully",
      user: {
        _id: updatedUser._id,
        fullname: updatedUser.fullname,
        email: updatedUser.email,
        phoneNumber: updatedUser.phoneNumber,
        pictures: updatedUser.pictures,
    
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const updateUserPassword = async (req, res) => {
  const { oldPassword, newPassword,userId } = req.body;
  if (!oldPassword || !newPassword) {
    throw new CustomError.BadRequestError("Please provide both values");
  }
  const user = await User.findOne({ _id: userId });

  const isPasswordCorrect = await user.comparePassword(oldPassword);
  if (!isPasswordCorrect) {
    throw new CustomError.UnauthenticatedError("Invalid Credentials");
  }
  user.password = newPassword;

  await user.save();
  res.status(StatusCodes.OK).json({ msg: "Success! Password Updated." });
};

const deleteAllUsers = async (req, res) => {
  try {
    console.log("Before deleting all users");
    const result = await User.deleteMany ({});
    console.log("After deleting all users", result);

    res.status(200).json({ message: "All users deleted successfully" });
  } catch (error) {
    console.error("Error deleting all users:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const enrollTutorInstructor = async (req, res) => {
  try {
    const { instructorId, userId } = req.body;

    // Check if the instructor exists
    const instructor = await TutorInstructor.findById(instructorId);
    if (!instructor) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: 'Instructor not found' });
    }

    // Check if the user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: 'User not found' });
    }

    // Check if the user is already enrolled with the instructor
    if (user.enrolledInstructors.some(inst => inst.instructor.equals(instructorId))) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: 'User already enrolled with this instructor' });
    }

    // Enroll the user with the instructor
    const enrollment = { instructor: instructorId, enrollmentTime: new Date() };
    user.enrolledInstructors.push(enrollment);
    await user.save();

    // Store the enrolled user's ID in the tutor instructor model
    instructor.userWhoHasEnrolled.push(userId);
    await instructor.save();

    res.status(StatusCodes.OK).json({ message: 'User enrolled with instructor successfully' });
  } catch (error) {
    console.error('Error enrolling user with instructor:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
  }
};

// this have enrollment time
// const enrollTutorInstructor = async (req, res) => {
//   try {
//     const { instructorId, userId, selectedTimeSlot } = req.body;

//     // Check if the instructor exists
//     const instructor = await TutorInstructor.findById(instructorId);
//     if (!instructor) {
//       return res.status(StatusCodes.NOT_FOUND).json({ error: 'Instructor not found' });
//     }

//     // Check if the user exists
//     const user = await User.findById(userId);
//     if (!user) {
//       return res.status(StatusCodes.NOT_FOUND).json({ error: 'User not found' });
//     }

//     // Check if the user is already enrolled with the instructor
//     if (user.enrolledInstructors.some(inst => inst.instructor.equals(instructorId))) {
//       return res.status(StatusCodes.BAD_REQUEST).json({ error: 'User already enrolled with this instructor' });
//     }

//     // Validate if the selected time slot is available
//     if (!instructor.availableTime.includes(selectedTimeSlot)) {
//       return res.status(StatusCodes.BAD_REQUEST).json({ error: 'Selected time slot is not available for this instructor' });
//     }

//     // Enroll the user with the instructor at the selected time slot
//     const enrollment = { instructor: instructorId, enrollmentTime: new Date(), timeSlot: selectedTimeSlot };
//     user.enrolledInstructors.push(enrollment);
//     await user.save();

//     // Store the enrolled user's ID and selected time slot in the tutor instructor model
//     instructor.userWhoHasEnrolled.push({ userId, timeSlot: selectedTimeSlot });
//     await instructor.save();

//     res.status(StatusCodes.OK).json({ message: 'User enrolled with instructor successfully', timeSlot: selectedTimeSlot });
//   } catch (error) {
//     console.error('Error enrolling user with instructor:', error);
//     res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
//   }
// };


const getEnrolledCoursesByUserId = async (req, res) => {
  try {
    const userId = req.params.id;
    console.log('User ID:', userId);

    const user = await User.findById(userId)
      .populate({
        path: 'enrolledCourses.course',
        populate: {
          path: 'createUser',
          model: 'User'
        }
      });
    console.log('User:', user);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Calculate lesson count as the sum of progress values from all lessons
    const enrolledCoursesWithCounts = user.enrolledCourses.map(enrolledCourse => {
      // Calculate total lesson URL count
      let totalLessonUrls = 0;
      if (enrolledCourse.course.chapter && Array.isArray(enrolledCourse.course.chapter)) {
        enrolledCourse.course.chapter.forEach(chap => {
          if (chap.LessonFile && Array.isArray(chap.LessonFile)) {
            totalLessonUrls += chap.LessonFile.length;
          }
        });
      }
      console.log('Total Lesson URLs:', totalLessonUrls);

      // Multiply total lesson URLs count by 100
      totalLessonUrls *= 100;

      // Calculate lesson count as the sum of progress values from all lessons
      let lessonCount = 0;
      if (enrolledCourse.lesson && Array.isArray(enrolledCourse.lesson)) {
        lessonCount = enrolledCourse.lesson.reduce((totalProgress, lesson) => {
          return totalProgress + (isNaN(lesson.progress) ? 0 : lesson.progress);
        }, 0);
      }
      console.log('Lesson Count:', lessonCount);

      // Calculate progress as a percentage
      let progress = 0;
      if (totalLessonUrls > 0) {
        progress = (lessonCount / totalLessonUrls) * 100;
      }
      console.log('Progress:', progress);

      return {
        ...enrolledCourse.toObject(),
        lessonCount: lessonCount,
        lessonUrlCount: totalLessonUrls,
        progress: progress.toFixed(2) // Convert to percentage and limit to 2 decimal places
      };
    });
    console.log('Enrolled Courses with Counts:', enrolledCoursesWithCounts);

    res.status(200).json({ user, enrolledCourses: enrolledCoursesWithCounts });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

//this below code works perfectly 


// const getEnrolledCourseByUserIdAndCourseId = async (req, res) => {
//   try {
//     const {userId} = req.body;
//     console.log(userId);
//     const courseId = req.params.courseId;

//     const user = await User.findById(userId).populate({
//       path: 'enrolledCourses.course',
//       populate: {
//         path: 'createUser',
//         model: 'User'
//       }
//     });

//     if (!user) {
//       return res.status(404).json({ error: "User not found" });
//     }

//     // Find the enrolled course by courseId
//     const enrolledCourse = user.enrolledCourses.find(course => course.course.equals(courseId));

//     if (!enrolledCourse) {
//       return res.status(404).json({ error: "Course not found in enrolled courses" });
//     }

//     // No need to populate the course separately, as it's already populated
//     const populatedCourse = enrolledCourse.course;

//     // Count the number of LessonUrl objects in the course
//     let totalLessonUrls = 0;
//     populatedCourse.chapter.forEach(chap => {
//       if (chap.LessonFile && Array.isArray(chap.LessonFile)) {
//         totalLessonUrls += chap.LessonFile.length;
//       }
//     });

//     // Multiply totalLessonUrls by 100
//     totalLessonUrls *= 100;

//     // Calculate total progress by summing up the progress values of each lesson
//     let totalProgress = 0;
//     enrolledCourse.lesson.forEach(lesson => {
//       totalProgress += lesson.progress;
//     });

//     // If the enrolled course is found, return it with populated fields, counts, progress, and lesson array
//     res.status(200).json({
//       course: populatedCourse,
//       progress: ((totalProgress / totalLessonUrls) * 100).toFixed(2), // Limit to 2 decimal places
//       _id: enrolledCourse._id,
//       lessonCount: totalProgress, // Now representing total progress instead of lesson count
//       lessonUrlCount: totalLessonUrls,
//       lesson: enrolledCourse.lesson // Include the lesson array
//     });
//   } catch (error) {
//     console.error(error); // Log the error to the console for debugging
//     res.status(500).json({ error: "Internal server error" });
//   }
// };


const getEnrolledCourseByUserIdAndCourseId = async (req, res) => {
  try {
    const { userId } = req.body;
    const courseId = req.params.courseId;

    const user = await User.findById(userId).populate({
      path: 'enrolledCourses.course',
      populate: {
        path: 'createUser',
        model: 'User'
      }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const enrolledCourse = user.enrolledCourses.find(course => course.course.equals(courseId));

    if (!enrolledCourse) {
      return res.status(404).json({ error: "Course not found in enrolled courses" });
    }

    const populatedCourse = enrolledCourse.course;

    let totalLessonUrls = 0;
    populatedCourse.chapter.forEach(chap => {
      if (chap.LessonFile && Array.isArray(chap.LessonFile)) {
        totalLessonUrls += chap.LessonFile.length;
      }
    });

    totalLessonUrls *= 100;

    let totalProgress = 0;
    enrolledCourse.lesson.forEach(lesson => {
      if (!isNaN(lesson.progress)) {
        totalProgress += lesson.progress;
      }
    });

    let progress = 0;
    if (totalLessonUrls > 0) {
      progress = ((totalProgress / totalLessonUrls) * 100).toFixed(2);
    } else {
      progress = "0.00";  // Assign default value if totalLessonUrls is zero
    }

    res.status(200).json({
      course: populatedCourse,
      progress,
      _id: enrolledCourse._id,
      lessonCount: totalProgress,
      lessonUrlCount: totalLessonUrls,
      lesson: enrolledCourse.lesson
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};


const approveInstructor = async (req, res) => {
  const { instructorId } = req.params; // Assuming you pass the instructor's ID in the request params
  const { email } = req.body;
  try {
    const instructor = await User.findById(instructorId);

    if (!instructor) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "Instructor not found" });
    }

    if (instructor.role !== "instructor" && instructor.role !== "tutorinstructor") {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: "User is not an instructor or tutorinstructor" });
    }

    instructor.status = "Approved"; 
    await instructor.save();

    // Send approval email
    sendApprovalEmail(email);

    return res.status(StatusCodes.OK).json({ message: "Instructor approved successfully" });
  } catch (error) {
    console.error(error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
  }
};

const rejectInstructor = async (req, res) => {
  const { instructorId } = req.params; // Assuming you pass the instructor's ID in the request params
  const { rejectionReason, email } = req.body; // Assuming you pass the rejection reason in the request body

  try {
    const instructor = await User.findById(instructorId);

    if (!instructor) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "Instructor not found" });
    }

    if (instructor.role !== "instructor" && instructor.role !== "tutorinstructor") {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: "User is not an instructor or tutorinstructor" });
    }

    instructor.status = "Rejected";
    instructor.rejectionReason = rejectionReason; // Save rejection reason
    await instructor.save();

    // Send rejection email
    sendRejectionEmail(email, rejectionReason);

    return res.status(StatusCodes.OK).json({ message: "Instructor rejected successfully" });
  } catch (error) {
    console.error(error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
  }
};



async function updateLessonProgress(req, res) {
  try {
    const { courseId, lessonId, lessonTime, progress } = req.body; // Assuming courseId, lessonId, lessonTime, and progress are sent in the request body
    const {userId} = req.body; // Assuming userId is available in the request user object

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const index = user.enrolledCourses.findIndex(course => course.course.equals(courseId));
    if (index !== -1) {
      // Check if the lesson exists in the enrolled course, if not, add it
      const lessonIndex = user.enrolledCourses[index].lesson.findIndex(lesson => lesson.lessonId === lessonId);
      if (lessonIndex === -1) {
        user.enrolledCourses[index].lesson.push({ lessonId, lessonTime, progress });
      } else {
        // Update existing lesson's time and progress if it's not already at 100%
        if (user.enrolledCourses[index].lesson[lessonIndex].progress < 100) {
          user.enrolledCourses[index].lesson[lessonIndex].lessonTime = lessonTime;
          user.enrolledCourses[index].lesson[lessonIndex].progress = progress;
        }
      }

      await user.save();
      return res.status(200).json({ message: 'Course progress and lesson updated successfully' });
    } else {
      return res.status(404).json({ error: 'Course not found in enrolledCourses' });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}


const updateFinalAverage = async (req, res) => {
  try {
    const { userId, courseId, chapterId, finalaverage } = req.body;

    // Find the user by userId
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Find the enrolled course of the user by courseId
    const enrolledCourse = user.enrolledCourses.find(course => course.course.equals(courseId));
    if (!enrolledCourse) {
      return res.status(404).json({ error: 'Course not found in enrolled courses' });
    }

    console.log('Enrolled Course:', enrolledCourse); // Debugging

    // Ensure the course object contains a course property
    if (!enrolledCourse.course) {
      return res.status(404).json({ error: 'Course object does not contain a course property' });
    }

    // Ensure the course property is an array
    if (!Array.isArray(enrolledCourse.course)) {
      return res.status(404).json({ error: 'Course property is not an array' });
    }

    // Ensure the course object contains a chapter property and it is an array
    if (!enrolledCourse.course.chapter || !Array.isArray(enrolledCourse.course.chapter)) {
      return res.status(404).json({ error: 'Course object does not contain a chapter property or it is not an array' });
    }

    // Find the chapter in the enrolled course
    const chapter = enrolledCourse.course.chapter.find(chap => chap._id.equals(chapterId));
    if (!chapter) {
      return res.status(404).json({ error: 'Chapter not found in the enrolled course' });
    }

    // Update the finalaverage for the chapter's questions
    if (chapter.questions && Array.isArray(chapter.questions)) {
      chapter.questions.forEach(question => {
        question.finalaverage = finalaverage;
      });
    }

    // Save the updated user
    await user.save();

    res.status(200).json({ message: 'Final average updated successfully' });
  } catch (error) {
    console.error('Error updating final average:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


const enrollCourseForMultipleEmails = async (req, res) => {
  try {
    const { emails, courseId } = req.body;

    if (!Array.isArray(emails) || emails.length === 0 || emails.length > 10) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: 'Invalid or too many emails provided' });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: 'Course not found' });
    }

    const enrolledCourses = [];

    for (const email of emails) {
      const user = await User.findOne({ email });
      if (!user) {
        console.log(`User with email ${email} not found, skipping...`);
        continue;
      }

      if (course.userWhoHasBought.includes(user._id)) {
        console.log(`User with email ${email} is already enrolled in the course, skipping...`);
        continue;
      }

      course.userWhoHasBought.push(user._id);
      await course.save();

      const enrolledCourse = { course: courseId, progress: 0, lesson: [] };

      // Push all lesson IDs into the lesson array
      course.chapter.forEach(chap => {
        chap.LessonFile.forEach(lesson => {
          enrolledCourse.lesson.push({
            lessonId: lesson._id.toString(), // Convert ObjectId to string
            lessonTime: new Date().toISOString(), // Set the lesson time to current time
            progress: 0 // Set initial progress to 0
          });
        });
      });

      user.enrolledCourses.push(enrolledCourse);
      await user.save();

      enrolledCourses.push({ email, courseId });
    }

    res.status(StatusCodes.OK).json({ message: 'Courses enrolled successfully', enrolledCourses });
  } catch (error) {
    console.error('Error enrolling courses for multiple emails:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
  }
};



const getEnrolledInstructorsByUserId = async (req, res) => {
    try {
      const userId = req.params.id;
      console.log('User ID:', userId);
  
      const user = await User.findById(userId)
        .populate({
          path: 'enrolledClasses',
          populate: {
            path: 'createUser',
            model: 'User'
          }
        });
      console.log('User:', user);
  
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
  
      // Calculate additional class-related details if needed
      const enrolledClassesWithDetails = user.enrolledClasses.map(enrolledClass => {
        return {
          ...enrolledClass.toObject(),
          // Add any additional details you need for the response
        };
      });
      console.log('Enrolled Classes with Details:', enrolledClassesWithDetails);
  
      res.status(200).json({ user, enrolledClasses: enrolledClassesWithDetails });
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ error: "Something went wrong" });
    }
  };


const updateAverageScoreProgress = async (req, res) => {
  try {
    const { userId, courseId, groupQuestionId, averagescoreprogress } = req.body;

    // Find the user by ID
    const user = await User.findById(userId);
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "User not found" });
    }

    console.log("User data:", JSON.stringify(user, null, 2));

    // Check if user has enrolledCourses
    if (!user.enrolledCourses || user.enrolledCourses.length === 0) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "User has no enrolled courses" });
    }

    // Find the enrolled course for the user
    const enrolledCourse = user.enrolledCourses.find(course => course.course.equals(courseId));
    if (!enrolledCourse) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "Course not found in enrolled courses" });
    }

    console.log("Enrolled Course data:", JSON.stringify(enrolledCourse, null, 2));

    // Check if the enrolled course has lessons
    if (!enrolledCourse.lesson || enrolledCourse.lesson.length === 0) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "No lessons found in enrolled course" });
    }

    // Find the group question in the enrolled course's lessons array
    const groupQuestion = enrolledCourse.lesson.find(lesson => lesson.groupquestionid === groupQuestionId);
    if (!groupQuestion) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "Group question not found in enrolled course lessons" });
    }

    // Update the averagescoreprogress for the group question
    groupQuestion.averagescoreprogress = averagescoreprogress;

    // Save the updated user document
    await user.save();

    res.status(StatusCodes.OK).json({ message: "Average score progress updated successfully" });
  }  catch (error) {
    console.error("Error updating average score progress:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
  }
};



module.exports = {
 getAllUsers,
  getUserById,
  deleteuser,
  updateUser,
  deleteAllUsers,
  updateUserPassword,
  getEnrolledCoursesByUserId,
  enrollCourse,
  updateLessonProgress,
  updateInstructor,
  getEnrolledCourseByUserIdAndCourseId,
  approveInstructor,
  updateFinalAverage,
  enrollCourseForMultipleEmails,
  enrollTutorInstructor,
  rejectInstructor,
  getInstructorById,
  withdrawAmount,
  getEnrolledInstructorsByUserId,
  updateInstructorEarnings,
  updateAverageScoreProgress,
  enrollClass
};
