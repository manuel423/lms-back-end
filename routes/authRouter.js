const express = require("express");
const router = express.Router();
const authcontroller = require("../controllers/authController");
const upload = require("../config/awsConfig");
const {
    authenticate
} = require("../middleware/authentication")

// Routes for Instructor CRUD operations
router.post("/registerinsructor", upload.fields([
  { name: 'idCard', maxCount: 1 },
  { name: 'instructorLicense', maxCount: 6 }
]), authcontroller.registerInstructor);

router.put("/instructors/:instructorId", upload.fields([
    { name: 'idCard', maxCount: 1 },
    { name: 'instructorLicense', maxCount: 6 }
  ]), authcontroller.updateInstructorById);

  router.post("/registertutinsructor", upload.fields([
    { name: 'idCard', maxCount: 1 },
    { name: 'instructorLicense', maxCount: 6 },
    { name: 'images', maxCount: 10 }
  ]), authcontroller.registertutInstructor);
// Other authentication routes
router.post("/registerasacompany", authcontroller.registerUsersAsCompany);
router.post("/registerasacompanyowner", authcontroller.registercompanyowner);

router.post("/login", authcontroller.signin);
router.post('/reguser', authcontroller.registeruser);
router.post("/forgot-password", authcontroller.forgotPassword);
router.post("/reset-password", authcontroller.ResetPassword);
router.get('/instructors', authcontroller.getAllInstructors);
router.get('/instructors/:instructorId', authcontroller.getInstructorById);
router.get("/users/:userId",authcontroller.getUsersByUserId);
router.post('/logout', authenticate, authcontroller.logout);

  router.put("/users/:userId", authcontroller.updateUserById);
router.get('/protected-route', authenticate, (req, res) => {
    res.status(200).json({ message: 'This is a protected route', user: req.user });
  });

  router.get('/dashboard/users', authcontroller.getAllUsersDashboard);
  
module.exports = router;
