const Course = require("../model/course");
const User = require("../model/user");
const { StatusCodes } = require("http-status-codes");
const baseURL = process.env.BASE_URL;
const path = require("path");

const fs = require ('fs')

const createCourse = async (req, res) => {
  const {
    courseId,
    paymentType,
    price,
    courseDescription,
    aboutCourse,
    categories,
    courseDuration,
    LessonName,
    userId,
    courseName,
    lessons,
    createCourseas,
  } = req.body;

  try {
    let lessonFiles = [];

    // Process uploaded lesson files if available
    if (req.files && req.files["files"]) {
      lessonFiles = req.files["files"].map((file, index) => ({
        LessonUrl: file.location,
        LesssonText: lessons && lessons[index] ? lessons[index].lessonText : '',
        LessonType: lessons && lessons[index] ? lessons[index].lessonTitle : '',
      }));
    }

    let coverPage;
    if (req.files && req.files["coverPage"]) {
      coverPage = req.files["coverPage"][0].location;
    }

    const existingCourse = await Course.findOne({ _id: courseId });
    if (existingCourse) {
      const newChapter = {
        LessonName: LessonName,
        LessonFile: lessonFiles,
      };

      existingCourse.chapter.push(newChapter);

      if (coverPage) {
        existingCourse.coverPage.push(coverPage);
      }

      const updatedCourse = await existingCourse.save();
      return res.status(200).json(updatedCourse);
    } else {
      const course = new Course({
        coverPage,
        courseId,
        courseName,
        paymentType,
        price,
        courseDescription,
        aboutCourse,
        categories,
        courseDuration,
        createUser: userId,
        createCourseas
      });

      const savedCourse = await course.save();
      return res.status(201).json(savedCourse);
    }
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
};

const updateCourseById = async (req, res) => {
  try {
    const { id: courseId } = req.params;
    const { userId } = req.body;

    // Find the course by ID
    const updatedCourse = await Course.findById(courseId);

    if (!updatedCourse) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "Course not found" });
    }

    // Ensure that the user is the creator of the course
    if (updatedCourse.createUser.toString() !== userId) {
      return res.status(StatusCodes.FORBIDDEN).json({ error: "You are not authorized to update this course" });
    }

    // Destructure relevant properties from the request body
    const {
      paymentType,
      price,
      courseDescription,
      aboutCourse,
      categories,
      courseDuration,
      courseName,
    } = req.body;

    // Update course properties if available
    updatedCourse.paymentType = paymentType || updatedCourse.paymentType;
    updatedCourse.price = price || updatedCourse.price;
    updatedCourse.courseDescription = courseDescription || updatedCourse.courseDescription;
    updatedCourse.aboutCourse = aboutCourse || updatedCourse.aboutCourse;
    updatedCourse.categories = categories || updatedCourse.categories;
    updatedCourse.courseDuration = courseDuration || updatedCourse.courseDuration;
    updatedCourse.courseName = courseName || updatedCourse.courseName;

    // Process uploaded lesson files if available
    let lessonFiles = [];
    if (req.files && req.files["files"]) {
      lessonFiles = req.files["files"].map((file, index) => ({
        LessonUrl: file.location,
        LesssonText: req.body.lessons && req.body.lessons[index] ? req.body.lessons[index].lessonText : '',
        LessonType: req.body.lessons && req.body.lessons[index] ? req.body.lessons[index].lessonTitle : '',
      }));
    }

    // Handle cover page update if available
    let coverPage;
    if (req.files && req.files["coverPage"]) {
      coverPage = req.files["coverPage"][0].location;
      // Optionally, delete the previous cover page from S3 if necessary
      if (updatedCourse.coverPage && updatedCourse.coverPage.length > 0) {
        const params = {
          Bucket: process.env.BUCKET_NAME,
          Key: updatedCourse.coverPage[0].split("/").pop(),
        };
        s3.deleteObject(params, (err, data) => {
          if (err) {
            console.error(`Error deleting previous cover page: ${err.message}`);
          } else {
            console.log("Previous cover page deleted successfully");
          }
        });
      }
      updatedCourse.coverPage = [coverPage];
    }

    // Add lesson files to the course if available
    if (lessonFiles.length > 0) {
      updatedCourse.chapter.push({
        LessonName: req.body.LessonName,
        LessonFile: lessonFiles,
      });
    }

    // Save the updated course
    await updatedCourse.save();

    res.status(StatusCodes.OK).json({ message: "Course updated successfully", course: updatedCourse });
  } catch (error) {
    console.error("Error updating course by ID:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
  }
};
const addLessonFile = async (req, res) => {
  const courseId = req.params.id;
  const { chapterId, lessonText, lessonType } = req.body;

  try {
    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "Course not found" });
    }

    let chapter = course.chapter.id(chapterId);

    if (!chapter) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "Chapter not found" });
    }

    let lessonUrl;
    if (req.file && req.file.location) {
      lessonUrl = req.file.location; // Use the S3 file location directly
    }

    const newLessonFile = {
      LesssonText: lessonText,
      LessonType: lessonType,
      LessonUrl: lessonUrl,
      questions: [],
    };

    chapter.LessonFile.push(newLessonFile);

    const updatedCourse = await course.save();

    return res.status(StatusCodes.OK).json(updatedCourse);
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message });
  }
};

const editLessonById = async (req, res) => {
  const courseId = req.params.courseId;
  const chapterId = req.params.chapterId;
  const lessonId = req.params.lessonId;
  const { lessonText, lessonType } = req.body;

  try {
    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "Course not found" });
    }

    let chapter = course.chapter.id(chapterId);

    if (!chapter) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "Chapter not found" });
    }

    let lesson = chapter.LessonFile.id(lessonId);

    if (!lesson) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "Lesson not found" });
    }

    // Update lesson details
    lesson.LesssonText = lessonText || lesson.LesssonText;
    lesson.LessonType = lessonType || lesson.LessonType;

    // Upload file if available
    if (req.file && req.file.location) {
      lesson.LessonUrl = req.file.location; // Use the S3 file location directly
    }

    // Save the updated course
    const updatedCourse = await course.save();

    return res.status(StatusCodes.OK).json(updatedCourse);
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message });
  }
};


// const addLessonFile = async (req, res) => {
//   const courseId = req.params.id;
//   const { chapterId, lessonText, lessonType } = req.body;

//   try {
//     const course = await Course.findById(courseId);

//     if (!course) {
//       return res.status(StatusCodes.NOT_FOUND).json({ error: "Course not found" });
//     }

//     let chapter = course.chapter.id(chapterId);

//     if (!chapter) {
//       return res.status(StatusCodes.NOT_FOUND).json({ error: "Chapter not found" });
//     }

//     let lessonUrl;
//     if (req.file && req.file.path) {
//       lessonUrl = baseURL + "/uploads/course/" + req.file.filename;
//     }

//     const newLessonFile = {
//       LesssonText: lessonText,
//       LessonType: lessonType,
//       LessonUrl: lessonUrl,
//       questions: [],
//     };

//     chapter.LessonFile.push(newLessonFile);

//     const updatedCourse = await course.save();

//     return res.status(StatusCodes.OK).json(updatedCourse);
//   } catch (error) {
//     return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message });
//   }
// };

// const editLessonById = async (req, res) => {
//   const courseId = req.params.courseId;
//   const chapterId = req.params.chapterId;
//   const lessonId = req.params.lessonId;
//   const { lessonText, lessonType } = req.body;

//   try {
//     const course = await Course.findById(courseId);

//     if (!course) {
//       return res.status(StatusCodes.NOT_FOUND).json({ error: "Course not found" });
//     }

//     let chapter = course.chapter.id(chapterId);

//     if (!chapter) {
//       return res.status(StatusCodes.NOT_FOUND).json({ error: "Chapter not found" });
//     }

//     let lesson = chapter.LessonFile.id(lessonId);

//     if (!lesson) {
//       return res.status(StatusCodes.NOT_FOUND).json({ error: "Lesson not found" });
//     }

//     // Delete previous lesson file if it exists
//     if (lesson.LessonUrl) {
//       const filename = lesson.LessonUrl.split("/").pop();
//       const filePath = path.join(__dirname, "..", "uploads", "course", filename);
//       try {
//         fs.unlinkSync(filePath);
//         console.log(`Deleted previous lesson file: ${filePath}`);
//       } catch (err) {
//         console.error(`Error deleting previous lesson file: ${filePath}`, err);
//       }
//     }

//     // Update lesson details
//     lesson.LesssonText = lessonText || lesson.LesssonText;
//     lesson.LessonType = lessonType || lesson.LessonType;

//     // Upload file if available
//     if (req.file && req.file.path) {
//       lesson.LessonUrl = baseURL + "/uploads/course/" + req.file.filename;
//     }

//     // Save the updated course
//     const updatedCourse = await course.save();

//     return res.status(StatusCodes.OK).json(updatedCourse);
//   } catch (error) {
//     return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message });
//   }
// };

// using beka works  perfectly
// const createCourse = async (req, res) => {
//   const {
//     courseId,
//     paymentType,
//     price,
//     courseDescription,
//     aboutCourse,
//     categories,
//     courseDuration,
//     LessonName,
//     courseName,
//     lessons,
//     createCourseas,
//   } = req.body;

//   try {
//     let lessonFiles = [];

//     // Process uploaded lesson files if available
//     if (req.files && req.files["files"]) {
//       lessonFiles = req.files["files"].map((file, index) => ({
//         LessonUrl: file.location,
//         LesssonText: lessons && lessons[index] ? lessons[index].lessonText : '',
//         LessonType: lessons && lessons[index] ? lessons[index].lessonTitle : '',
//       }));
//     }

//     let coverPage;
//     if (req.files && req.files["coverPage"]) {
//       coverPage = req.files["coverPage"][0].location;
//     }

//     const existingCourse = await Course.findOne({ _id: courseId });
//     if (existingCourse) {
//       const newChapter = {
//         LessonName: LessonName,
//         LessonFile: lessonFiles,
//       };

//       existingCourse.chapter.push(newChapter);

//       if (coverPage) {
//         existingCourse.coverPage.push(coverPage);
//       }

//       const updatedCourse = await existingCourse.save();
//       return res.status(200).json(updatedCourse);
//     } else {
//       const course = new Course({
//         coverPage,
//         courseId,
//         courseName,
//         paymentType,
//         price,
//         courseDescription,
//         aboutCourse,
//         categories,
//         courseDuration,
//         createCourseas,
//       });

//       const savedCourse = await course.save();
//       return res.status(201).json(savedCourse);
//     }
//   } catch (err) {
//     return res.status(400).json({ message: err.message });
//   }
// };


// Create course function


const addQuestion = async (req, res) => {
  const { courseId, chapterId, questions } = req.body;

  try {
    // Find the course by courseId
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Find the chapter by chapterId
    const chapter = course.chapter.id(chapterId);
    if (!chapter) {
      return res.status(404).json({ message: "Chapter not found" });
    }

    // Ensure questionsGroup object is initialized
    if (!chapter.questionsGroup) {
      chapter.questionsGroup = { questions: [] };
    }

    // Validate that each question in the incoming questions array has the required fields
    questions.forEach(question => {
      if (!question.questionText || !question.type || !Array.isArray(question.options) || !Array.isArray(question.correctAnswers)) {
        return res.status(400).json({ message: "Each question must have 'questionText', 'type', 'options', and 'correctAnswers' fields." });
      }
    });

    // Add the new questions to the existing questions in questionsGroup
    chapter.questionsGroup.questions.push(...questions);

    // Save the updated course
    await course.save();

    return res.status(200).json(course);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};



async function getAllCourses(req, res) {
  try {
    // Parse query parameters for pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10; // Default limit is 10

    // Calculate skip value based on page and limit
    const skip = (page - 1) * limit;

    // Get filter parameters from query
    const { createCourseas, paymentType, status, categories } = req.query;

    // Build the filter object
    const filter = {};
    const filter1 = {
      status: "Approved" // Filter by "Approved" status
    };
    if (createCourseas) filter.createCourseas = createCourseas;
    if (paymentType) filter.paymentType = paymentType;
    if (status) filter.status = status;
    if (categories) filter.categories = { $in: categories.split(',') };

    // Get total number of courses that match the filter
    const totalCourses = await Course.countDocuments(filter); 
   
    // Query for courses with pagination and filtering
    const courses = await Course.find(filter)
      .populate("createUser")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();



    const approvedCoursesCategories = await Course.distinct('categories', filter1);

    res.status(200).json({
      courses,
      currentPage: page,
      totalPages: Math.ceil(totalCourses / limit),
      totalCourses,
      categories: approvedCoursesCategories// Add all categories to the response
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
}


async function getCourseById(req, res) {
  const courseId = req.params.id;
  try {
    const course = await Course.findById(courseId)
      .populate("createUser")
      .populate({
        path: "userWhoHasBought",
        select: "fullname email phoneNumber role",
        populate: {
          path: "enrolledCourses",
          select: "progress"
        }
      })
      .populate("reviews");
      
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }
    res.status(200).json(course);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server Error" });
  }
}



const deleteCourseById = async (req, res) => {
  const courseId = req.params.id;
  try {
    // Find the course by ID
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Delete all related lesson files
    for (const chapter of course.chapter) {
      for (const lessonFile of chapter.LessonFile) {
        if (lessonFile.LessonUrl) {
          const filename = lessonFile.LessonUrl.split("/").pop();
          const filePath = path.join(__dirname, "..", "uploads", "course", filename);
          try {
            fs.unlinkSync(filePath);
            console.log(`Deleted lesson file: ${filePath}`);
          } catch (err) {
            console.error(`Error deleting lesson file: ${filePath}`, err);
          }
        }
      }
    }

    // Delete the cover page if it exists
    if (course.coverPage && course.coverPage.length > 0) {
      for (const coverPage of course.coverPage) {
        const filename = coverPage.split("/").pop();
        const filePath = path.join(__dirname, "..", "uploads", "course", "coverpage", filename);
        try {
          fs.unlinkSync(filePath);
          console.log(`Deleted cover page: ${filePath}`);
        } catch (err) {
          console.error(`Error deleting cover page: ${filePath}`, err);
        }
      }
    }

    // Delete the course
    await Course.findByIdAndDelete(courseId);
    res.status(200).json({ message: "Course deleted successfully" });
  } catch (err) {
    console.error("Error deleting course:", err);
    res.status(500).json({ message: "Server Error" });
  }
};

async function deleteAllCourses(req, res) {
  try {
    // Delete all courses
    await Course.deleteMany({});

    res
      .status(StatusCodes.OK)
      .json({ message: "All courses deleted successfully" });
  } catch (error) {
    console.error("Error deleting all courses:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Internal server error" });
  }
}

async function getCoursesByUserId(req, res) {
  const userId = req.params.userId; // Assuming the user ID is passed as a parameter in the URL
  try {
    const courses = await Course.find({ createUser: userId }).sort({
      createdAt: -1,
    });
    if (!courses || courses.length === 0) {
      return res
        .status(404)
        .json({ message: "No courses found for this user" });
    }
    res.status(200).json(courses);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server Error" });
  }
}

async function getCoursesByName(req, res) {
  try {
    const courseName = req.query.coursename; // Assuming the course name is passed as a query parameter

    // Perform a case-insensitive search for courses containing the provided name
    const courses = await Course.find({
      title: { $regex: courseName, $options: "i" },
    })
      .populate("createUser")
      .sort({ createdAt: -1 });

    if (!courses || courses.length === 0) {
      return res
        .status(404)
        .json({ message: "No courses found matching the provided name" });
    }

    res.status(200).json(courses);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server Error" });
  }
}

const deleteChapterByChapterIdFirst = async (req, res) => {
  const { courseId, chapterId } = req.params;

  try {
    // Find the course by ID
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Find the chapter by ID
    const chapterIndex = course.chapter.findIndex(
      (chapter) => chapter._id.toString() === chapterId
    );
    if (chapterIndex === -1) {
      return res.status(404).json({ message: "Chapter not found" });
    }

    // Extract the URLs of the files associated with the chapter
    const lessonFiles = course.chapter[chapterIndex].LessonFile;
    const fileUrls = lessonFiles.map((file) => file.LessonUrl);

    // Remove the chapter from the course
    course.chapter.splice(chapterIndex, 1);

    // Delete the associated files from storage
    fileUrls.forEach((url) => {
      const filename = url.split("/").pop();
      const filePath = path.join(__dirname, "..", "uploads", "course", filename);
      try {
        fs.unlinkSync(filePath);
        console.log(`Deleted file: ${filePath}`);
      } catch (err) {
        console.error(`Error deleting file: ${filePath}`, err);
      }
    });

    // Save the updated course
    await course.save();

    return res.status(200).json({ message: "Chapter deleted successfully" });
  } catch (err) {
    console.error("Error deleting chapter:", err);
    return res.status(500).json({ message: "Server Error" });
  }
};


const deleteLessonFileById = async (req, res) => {
  const { courseId, chapterId, fileId } = req.params;

  try {
    // Find the course by ID
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Find the chapter by ID
    const chapter = course.chapter.find(
      (chap) => chap._id.toString() === chapterId
    );
    if (!chapter) {
      return res.status(404).json({ message: "Chapter not found" });
    }

    // Find the lesson file by ID
    const lessonFileIndex = chapter.LessonFile.findIndex(
      (file) => file._id.toString() === fileId
    );
    if (lessonFileIndex === -1) {
      return res.status(404).json({ message: "Lesson file not found" });
    }

    // Extract the URL of the lesson file
    const fileUrl = chapter.LessonFile[lessonFileIndex].LessonUrl;

    // Remove the lesson file from the chapter
    chapter.LessonFile.splice(lessonFileIndex, 1);

    // Delete the associated file from storage
    const filename = fileUrl.split("/").pop();
    const filePath = path.join(__dirname, "..", "uploads", "course", filename);
    try {
      fs.unlinkSync(filePath);
      console.log(`Deleted file: ${filePath}`);
    } catch (err) {
      console.error(`Error deleting file: ${filePath}`, err);
    }

    // Save the updated course
    await course.save();

    return res.status(200).json({ message: "Lesson file deleted successfully" });
  } catch (err) {
    console.error("Error deleting lesson file:", err);
    return res.status(500).json({ message: "Server Error" });
  }
};

const getAllQuestions = async (req, res) => {
  const { courseId, chapterId } = req.params;

  try {
    // Find the course by courseId
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Find the chapter by chapterId
    const chapter = course.chapter.id(chapterId);
    if (!chapter) {
      return res.status(404).json({ message: "Chapter not found" });
    }

    // Extract questions from the chapter
    const questions = chapter.questionsGroup;

    return res.status(200).json(questions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const editLessonNameByChapterId = async (req, res) => {
  try {
    const { courseId, chapterId } = req.params;
    const { LessonName } = req.body;

    // Find the course by ID
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Course not found' });
    }

    // Find the chapter by ID
    const chapter = course.chapter.id(chapterId);
    if (!chapter) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Chapter not found' });
    }

    // Update the LessonName
    chapter.LessonName = LessonName || chapter.LessonName;

    // Save the updated course
    await course.save();

    res.status(StatusCodes.OK).json({ message: 'Lesson name updated successfully', course });
  } catch (error) {
    console.error('Error updating lesson name by chapter ID:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
  }
};


const approveCourse = async (req, res) => {
  const { courseId } = req.params;

  try {
    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "Course not found" });
    }

    // Update the status to "Approved"
    course.status = "Approved";
    await course.save();

    return res.status(StatusCodes.OK).json({ message: "Course approved successfully" });
  } catch (error) {
    console.error(error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
  }
};

const pendingcourse = async (req, res) => {
  const { courseId } = req.params;

  try {
    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "Course not found" });
    }

    // Update the status to "Approved"
    course.status = "Pending";
    await course.save();

    return res.status(StatusCodes.OK).json({ message: "Course Pending successfully" });
  } catch (error) {
    console.error(error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
  }
};

const draftcourse = async (req, res) => {
  const { courseId } = req.params;

  try {
    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "Course not found" });
    }

    // Update the status to "Approved"
    course.status = "draft";
    await course.save();

    return res.status(StatusCodes.OK).json({ message: "Course draft successfully" });
  } catch (error) {
    console.error(error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
  }
};


const rejectCourse = async (req, res) => {
  const { courseId } = req.params;
  const { rejectionReason } = req.body;

  try {
    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "Course not found" });
    }

    // Update the status to "Rejected" and save the rejection reason
    course.status = "Rejected";
    course.rejectionReason = rejectionReason;
    await course.save();

    return res.status(StatusCodes.OK).json({ message: "Course rejected successfully" });
  } catch (error) {
    console.error(error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
  }
};


const getAllApprovedCourses = async (req, res) => {
  try {
    // Parse query parameters for pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10; // Default limit is 10

    // Calculate skip value based on page and limit
    const skip = (page - 1) * limit;

    // Get createCourseas parameter from query
    const createCourseasParam = req.query.createCourseas;

    // Query for approved courses with pagination
    let approvedCoursesQuery = Course.find({ status: "Approved" })
      .populate("createUser")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Filter approved courses based on createCourseasParam
    if (createCourseasParam) {
      approvedCoursesQuery = approvedCoursesQuery.where('createCourseas').equals(createCourseasParam);
    }

    const approvedCourses = await approvedCoursesQuery.exec();

    res.status(StatusCodes.OK).json(approvedCourses);
  } catch (error) {
    console.error(error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
  }
};

const getRejectedCourses = async (req, res) => {
  try {
    const rejectedCourses = await Course.find({ status: "Rejected" });

    return res.status(StatusCodes.OK).json(rejectedCourses);
  } catch (error) {
    console.error(error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
  }
};

const deleteQuestion = async (req, res) => {
  const { courseId, chapterId, questionId } = req.params;

  try {
    // Find the course by courseId
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Course not found" });
    }

    // Find the chapter by chapterId
    const chapter = course.chapter.id(chapterId);
    if (!chapter) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Chapter not found" });
    }

    // Check if the chapter has a questionsGroup and a questions array
    if (!chapter.questionsGroup || !chapter.questionsGroup.questions) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Questions not found" });
    }

    // Find the index of the question in the questions array
    const questionIndex = chapter.questionsGroup.questions.findIndex(q => q._id.equals(questionId));
    if (questionIndex === -1) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Question not found" });
    }

    // Remove the question from the questions array
    chapter.questionsGroup.questions.splice(questionIndex, 1);

    // Save the updated course
    await course.save();

    return res.status(StatusCodes.OK).json({ message: "Question deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
  }
};

const getCourseStatsByUserId = async (req, res) => {
  const userId = req.params.userId;

  try {
    // Fetch all courses created by the user
    const allCoursesCreated = await Course.find({ createUser: userId });

    // Calculate the total amount earned from all courses (paid and free)
    const totalAmountEarned = allCoursesCreated.reduce((total, course) => total + course.totalAmountEarned, 0);

    // Count the total number of courses created by the user
    const totalCourseCount = allCoursesCreated.length;

    // Fetch all paid courses created by the user
    const paidCoursesCreated = await Course.find({ createUser: userId, paymentType: 'paid' });

    // Count the number of paid courses created by the user
    const paidCourseCount = paidCoursesCreated.length;

    // Calculate the total number of users enrolled in the user's paid courses
    const enrolledUsersCount = paidCoursesCreated.reduce((total, course) => total + course.userWhoHasBought.length, 0);

    res.status(200).json({
      totalCourseCount,
      totalAmountEarned,
      paidCourseCount,
      enrolledUsersCount
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server Error" });
  }
};




module.exports = {
  createCourse,
  getAllCourses,
  getCourseById,
  deleteCourseById,
  deleteAllCourses,
  getCoursesByUserId,
  updateCourseById,
  getCoursesByName,
  deleteChapterByChapterIdFirst,
  deleteLessonFileById,
  editLessonById,
  addLessonFile,
  addQuestion,
  editLessonNameByChapterId,
  getAllQuestions,
  approveCourse,
  getAllApprovedCourses,
  deleteQuestion,
  rejectCourse,
  getRejectedCourses,
  pendingcourse,
  draftcourse,
  getCourseStatsByUserId
};






