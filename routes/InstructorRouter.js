const express = require('express');
const router = express.Router();
const multer = require('multer');
const multerS3 = require('multer-s3');
const aws = require('aws-sdk');
const path = require('path');
const instructorController = require('../controllers/InstructorController');
const { authenticateUser, authorizePermissions } = require("../middleware/authentication");

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



// Routes for Instructor CRUD operations
router.post("/", upload.fields([
    { name: 'idCard', maxCount: 6 },
    { name: 'instructorLicense', maxCount: 6 }
]), instructorController.createtutorInstructor);

router.put("/:id", upload.fields([
    { name: 'idCard', maxCount: 6 },
    { name: 'instructorLicense', maxCount: 6 }
]), instructorController.updatetutorInstructorById);




router.get("/", instructorController.getAlltutorInstructors);

router.get("/:id", instructorController.gettutorInstructorById);


router.post('/instructor/:instructorId/request-payout', instructorController.requestPayout);

router.post("/login", instructorController.logintutorInstructor);

router.put("/reject/:id", instructorController.rejecttutorInstructorById);

router.put("/approve/:id", instructorController.approvetutorInstructorById);

router.delete("/:id", instructorController.deletetutorInstructorById);

router.get('/instructors/room/:roomId/:userId', instructorController.getInstructorByRoomId);

router.put('/instructor/:id/earnings', instructorController.updateInstructorEarnings);

module.exports = router;
