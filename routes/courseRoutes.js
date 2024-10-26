// const express = require('express');
// const fs = require('fs');
// const router = express.Router();
// const multer = require('multer');
// const courseController = require('../controllers/courseController');
// const path = require('path');

// const {
//     authAuthorization,
//     authMiddleware,
// } = require("../middleware/authMiddleware");

// // Create the uploads/course directory if it doesn't exist
// const courseDir = 'uploads/course';
// if (!fs.existsSync(courseDir)) {
//     fs.mkdirSync(courseDir, { recursive: true });
// }

// // Create the uploads/course/coverpage directory if it doesn't exist
// const coverPageDir = 'uploads/course/coverpage';
// if (!fs.existsSync(coverPageDir)) {
//     fs.mkdirSync(coverPageDir, { recursive: true });
// }

// const storage = multer.diskStorage({
//     destination: function (req, file, cb) {
//         // Check the fieldname to determine the destination folder
//         if (file.fieldname === 'coverPage') {
//             cb(null, coverPageDir);
//         } else {
//             // Default destination if fieldname doesn't match
//             cb(null, courseDir);
//         }
//     },
//     filename: function (req, file, cb) {
//         cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
//     }
// });

// const upload = multer({ 
//     storage: storage,
//     limits: { fileSize: 30 * 1024 * 1024 } // 30MB limit
// });

// // Route to create a new course
// router.post('/', upload.fields([
//     { name: 'files', maxCount: 10 }, // Assuming this is for other files like lesson files
//     { name: 'coverPage', maxCount: 1 } // Handle coverPage files
// ]), courseController.createCourse);


const express = require('express');
const courseController = require('../controllers/courseController');
const multer = require('multer');
const multerS3 = require('multer-s3');
const aws = require('aws-sdk');
const path = require("path");

const router = express.Router();

// AWS S3 configuration
const s3 = new aws.S3({
  accessKeyId: process.env.S3_ACCESS_KEY,
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  region: process.env.S3_BUCKET_REGION,
});

// Multer S3 storage configuration
const upload = multer({
  storage: multerS3({
    s3,
    bucket: process.env.BUCKET_NAME,
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
    },
  }),
});

// Route to create a new course
router.post(
  '/',
  upload.fields([
    { name: 'files', maxCount: 10 }, // Assuming this is for other files like lesson files
    { name: 'coverPage', maxCount: 1 } // Handle coverPage files
  ]),
  courseController.createCourse
);
router.put('/:id', upload.fields([
  { name: 'files', maxCount: 10 }, // Assuming this is for other files like lesson files
  { name: 'coverPage', maxCount: 1 } // Handle coverPage files
]), courseController.updateCourseById);
// Route to add a lesson file
router.post('/:id/lessons', upload.single('lessonFile'), courseController.addLessonFile);

// Route to edit a lesson by ID
router.put('/:courseId/chapters/:chapterId/lessons/:lessonId', upload.single('lessonFile'), courseController.editLessonById);
// Multer setup for lesson file upload
const lessonFileStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/course');
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});

// const uploadLessonFile = multer({ 
//   storage: lessonFileStorage,
//   limits: { fileSize: 30 * 1024 * 1024 } // 30MB limit
// });




// router.post('/:id/lessons', uploadLessonFile.single('lessonFile'), courseController.addLessonFile);


// router.put('/:courseId/chapters/:chapterId/lessons/:lessonId', uploadLessonFile.single('lessonFile'), courseController.editLessonById);



// Route to get all courses
router.get('/', courseController.getAllCourses);

// Route to get a course by ID
router.get('/:id', courseController.getCourseById);

// Route to get courses by user ID
router.get('/:userId/courses', courseController.getCoursesByUserId);


// Route to delete a course by ID
router.delete('/:id', courseController.deleteCourseById);

// Route to delete all courses
router.post('/cou', courseController.deleteAllCourses);

router.get('/search', courseController.getCoursesByName);

router.delete("/:courseId/chapter/:chapterId", courseController.deleteChapterByChapterIdFirst); 

router.delete("/:courseId/chapter/:chapterId/lesson/:fileId", courseController.deleteLessonFileById);

router.get('/courses/stats/:userId', courseController.getCourseStatsByUserId);






// Add lesson file to course
  
router.post('/addQuestions', courseController.addQuestion);

router.get("/:courseId/chapter/:chapterId/questions", courseController.getAllQuestions);


router.put("/courses/:courseId/chapters/:chapterId/lessonname", courseController.editLessonNameByChapterId);

router.put("/approve/:courseId", courseController.approveCourse);


router.put("/pending/:courseId", courseController.pendingcourse);

router.put("/draft/:courseId", courseController.draftcourse);



router.post('/:courseId/reject', courseController.rejectCourse);

router.get("/courses/approved", courseController.getAllApprovedCourses);

router.get("/courses/rejected", courseController.getRejectedCourses);




router.delete('/courses/:courseId/chapters/:chapterId/questions/:questionId',courseController.deleteQuestion);

module.exports = router;


