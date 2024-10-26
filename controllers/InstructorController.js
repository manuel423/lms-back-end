const Instructor = require('../model/instructor');
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { StatusCodes } = require('http-status-codes');
const { sendApprovalEmail, sendRejectionEmail } = require('./sendemailController'); 
const Transaction = require('../model/transaction');
const aws = require('aws-sdk');
const path = require('path');
const s3 = new aws.S3();

const createtutorInstructor = async (req, res) => {
  try {
    const { userName, fullName, phoneNumber, email, password, gender, price, experience, location, bio, pictures, availableTime, teachingCapacity, categories, grade, Roomid, startDateTutor } = req.body;
    const role = "tutorinstructor";
    const emailAlreadyExists = await Instructor.findOne({ email });

    if (emailAlreadyExists) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: "Email already exists" });
    }

    const phoneNumberAlreadyExists = await Instructor.findOne({ phoneNumber });
    if (phoneNumberAlreadyExists) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: "Phone number already exists" });
    }

    // Validate teaching capacity
    if (!teachingCapacity || teachingCapacity <= 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: "Teaching capacity must be provided and greater than 0" });
    }

    // Check if files are included in the request for ID cards and instructor license
    if (!req.files || !req.files['idCard'] || req.files['idCard'].length === 0 || !req.files['instructorLicense'] || req.files['instructorLicense'].length === 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: 'ID card and instructor license files are required' });
    }

    // Map uploaded ID card image files to their URLs
    const idCardImages = req.files['idCard'].map(file => file.location);

    // Map uploaded instructor license image files to their URLs
    const instructorLicenseImages = req.files['instructorLicense'].map(file => file.location);

    // Create instructor
    const instructor = await Instructor.create({
      userName,
      fullName,
      phoneNumber,
      email,
      grade,
      categories,
      password,
      gender,
      experience,
      bio,
      location,
      idCard: idCardImages,
      instructorLicense: instructorLicenseImages, // Store instructor license URLs
      role,
      availableTime,
      pictures,
      price,
      Roomid,
      teachingCapacity,
      startDateTutor // Add start date tutor
    });

    const secretKey = process.env.JWT_SECRET;
    const tokenExpiration = process.env.JWT_LIFETIME;

    if (!secretKey || !tokenExpiration) {
      throw new Error("JWT secret key or token expiration is not configured.");
    }

    const token = jwt.sign(
      { 
        userId: instructor._id,
        email: instructor.email,
        role: instructor.role,
        userName: instructor.userName,
        fullName: instructor.fullName,
        phoneNumber: instructor.phoneNumber,
        gender: instructor.gender,
        experience: instructor.experience,
        location: instructor.location,
        idCard: instructor.idCard,
        instructorLicense: instructor.instructorLicense, // Include instructor license URLs in the token
        availableTime: instructor.availableTime,
        pictures: instructor.pictures,
        teachingCapacity: instructor.teachingCapacity,
        startDateTutor: instructor.startDateTutor // Include start date tutor in the token
      },
      secretKey,
      { expiresIn: tokenExpiration }
    );

    // Set the token as a cookie
    res.cookie('token', token, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });

    return res.status(StatusCodes.CREATED).json({
      success: true,
      message: "Successfully registered",
      token,
      instructor
    });
  } catch (error) {
    console.error(error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
  }
};

const updatetutorInstructorById = async (req, res) => {
  try {
    const { id } = req.params;
    const { userName, fullName, phoneNumber, email, password, gender, experience, location, availableTime, teachingCapacity, categories, grade, Roomid, startDateTutor } = req.body;

    // Check if the instructor exists
    const instructor = await Instructor.findById(id);
    if (!instructor) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "Instructor not found" });
    }

    // Handle ID card file update
    if (req.files && req.files['idCard'] && req.files['idCard'].length > 0) {
      // Delete previous ID card images from S3
      if (instructor.idCard && instructor.idCard.length > 0) {
        const deleteParams = instructor.idCard.map(image => ({
          Bucket: process.env.BUCKET_NAME,
          Key: image.split('/').pop()
        }));
        s3.deleteObjects({ Delete: { Objects: deleteParams } }, (err, data) => {
          if (err) console.error('Error deleting previous ID cards from S3:', err);
          else console.log('Previous ID cards deleted successfully from S3');
        });
      }

      // Map uploaded ID card image files to their URLs
      const idCardImages = req.files['idCard'].map(file => file.location);
      instructor.idCard = idCardImages;
    }

    // Handle instructor license file update
    if (req.files && req.files['instructorLicense'] && req.files['instructorLicense'].length > 0) {
      // Delete previous instructor license images from S3
      if (instructor.instructorLicense && instructor.instructorLicense.length > 0) {
        const deleteParams = instructor.instructorLicense.map(image => ({
          Bucket: process.env.BUCKET_NAME,
          Key: image.split('/').pop()
        }));
        s3.deleteObjects({ Delete: { Objects: deleteParams } }, (err, data) => {
          if (err) console.error('Error deleting previous instructor licenses from S3:', err);
          else console.log('Previous instructor licenses deleted successfully from S3');
        });
      }

      // Map uploaded instructor license image files to their URLs
      const instructorLicenseImages = req.files['instructorLicense'].map(file => file.location);
      instructor.instructorLicense = instructorLicenseImages;
    }

    // Update instructor information
    instructor.userName = userName || instructor.userName;
    instructor.fullName = fullName || instructor.fullName;
    instructor.phoneNumber = phoneNumber || instructor.phoneNumber;
    instructor.email = email || instructor.email;
    if (password) {
      instructor.password = await bcrypt.hash(password, 10);
    }
    instructor.gender = gender || instructor.gender;
    instructor.experience = experience || instructor.experience;
    instructor.location = location || instructor.location;
    instructor.availableTime = availableTime || instructor.availableTime;
    instructor.teachingCapacity = teachingCapacity || instructor.teachingCapacity;
    instructor.categories = categories || instructor.categories;
    instructor.grade = grade || instructor.grade;
    instructor.Roomid = Roomid || instructor.Roomid;
    instructor.startDateTutor = startDateTutor || instructor.startDateTutor; // Add start date tutor

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

const getAlltutorInstructors = async (req, res) => {
  try {
    // Parse query parameters for pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10; // Default limit is 10
    const skip = (page - 1) * limit;

    // Parse filtering query parameters
    const { status, categories, grade, gender, location } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (categories) filter.categories = { $in: categories.split(',') };
    if (grade) filter.grade = grade;
    if (gender) filter.gender = gender;
    if (location) filter.location = { $in: location.split(',') };

    // Get total number of instructors that match the filter
    const totalInstructors = await Instructor.countDocuments(filter);

    // Fetch instructors with pagination and filtering
    const instructors = await Instructor.find(filter)
      .populate('reviews')
      .sort({ createdAt: -1 }) // Sort by creation date in descending order
      .skip(skip)
      .limit(limit)
      .exec();

    res.status(200).json({
      instructors,
      currentPage: page,
      totalPages: Math.ceil(totalInstructors / limit),
      totalInstructors
    });
  } catch (error) {
    console.error("Error fetching all instructors:", error);
    res.status(500).json({ message: error.message });
  }
};

const getInstructorByRoomId = async (req, res) => {
  try {
    const { roomId, userId } = req.params;
    const instructor = await Instructor.findOne({ Roomid: roomId });

    if (!instructor) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: 'Instructor not found' });
    }

    const isUserEnrolled = instructor.userWhoHasEnrolled.includes(userId);

    if (isUserEnrolled) {
      return res.status(StatusCodes.OK).json({ message: 'User is enrolled', enrolled: true });
    } else {
      return res.status(StatusCodes.OK).json({ message: 'User is not enrolled', enrolled: false });
    }
  } catch (error) {
    console.error("Error fetching instructor by room ID:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
  }
};

const logintutorInstructor = async (req, res) => {
  try {
    const { emailOrPhoneNumber, password } = req.body;

    if (!emailOrPhoneNumber || !password) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "Please provide email or phone number and password" });
    }

    const user = await Instructor.findOne({
      $or: [{ email: emailOrPhoneNumber }, { phoneNumber: emailOrPhoneNumber }]
    });

    if (!user) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "Invalid Credentials" });
    }

    const isPasswordCorrect = await user.comparePassword(password);

    if (!isPasswordCorrect) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "Password is incorrect" });
    }

    const secretKey = process.env.JWT_SECRET;
    const tokenExpiration = process.env.JWT_LIFETIME;

    if (!secretKey || !tokenExpiration) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "JWT secret key or token expiration not configured" });
    }

    const token = jwt.sign(
      { 
        userId: user._id,
        email: user.email,
        role: user.role,
        pictures: user.pictures,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        status: user.status
      },
      secretKey,
      { expiresIn: tokenExpiration }
    );

    // Attach the token as a cookie
    res.cookie('token', token, {
      // httpOnly: true, // Prevents client-side access to the cookie
      maxAge: 1000 * 60 * 60 * 24 * 7, // Cookie expiry time (7 days in this case)
      // secure: true, // Uncomment this line if using HTTPS
      // sameSite: 'none' // Uncomment this line if using cross-site requests
    });

    res.status(StatusCodes.OK).json({ token });
  } catch (error) {
    console.error(error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "Internal server error" });
  }
};

const updateInstructorEarnings = async (req, res) => {
  try {
    const { id } = req.params;
    const { percentage } = req.body; // Get the percentage from the request body

    if (!percentage || percentage < 0 || percentage > 100) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "Invalid percentage value" });
    }

    const instructor = await Instructor.findById(id).populate("reviews");

    if (!instructor) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Instructor not found" });
    }

    // Update the earningsPercentage
    instructor.earningsPercentage = percentage;

    // Calculate totalAmountEarned based on the number of users who have enrolled
    const totalAmountEarned = instructor.price * instructor.userWhoHasEnrolled.length;
    const calculatedTotalAmountEarned = totalAmountEarned * (percentage / 100);

    // Update the instructor object with the calculated fields
    instructor.totalAmountEarned = totalAmountEarned;
    instructor.calculatedTotalAmountEarned = calculatedTotalAmountEarned;

    // Save the updated instructor document
    await instructor.save();

    res.status(StatusCodes.OK).json({
      ...instructor.toObject(),
      totalAmountEarned,
      calculatedTotalAmountEarned
    });
  } catch (error) {
    console.error(error.message);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

const gettutorInstructorById = async (req, res) => {
  try {
    const { id } = req.params;
    const instructor = await Instructor.findById(id).populate("reviews");

    if (!instructor) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Instructor not found" });
    }

    // Calculate totalAmountEarned based on the number of users who have enrolled
    const totalAmountEarned = instructor.price * instructor.userWhoHasEnrolled.length;
    const calculatedTotalAmountEarned = totalAmountEarned * (instructor.earningsPercentage / 100);

    // Update the instructor object with the calculated fields
    instructor.totalAmountEarned = totalAmountEarned;
    instructor.calculatedTotalAmountEarned = calculatedTotalAmountEarned;

    res.status(StatusCodes.OK).json({
      ...instructor.toObject(),
      totalAmountEarned,
      calculatedTotalAmountEarned
    });
  } catch (error) {
    console.error(error.message);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};


// const gettutorInstructorById = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const instructor = await Instructor.findById(id).populate("reviews");

//     if (!instructor) {
//       return res.status(StatusCodes.NOT_FOUND).json({ message: "Instructor not found" });
//     }

//     // Calculate totalAmountEarned based on the number of users who have enrolled
//     const totalAmountEarned = instructor.price * instructor.userWhoHasEnrolled.length;
//     const calculatedTotalAmountEarned = totalAmountEarned * 0.60; // 60% of the total amount earned

//     // Update the instructor object with the calculated fields
//     instructor.totalAmountEarned = totalAmountEarned;
//     instructor.calculatedTotalAmountEarned = calculatedTotalAmountEarned;

//     res.status(StatusCodes.OK).json({
//       ...instructor.toObject(),
//       totalAmountEarned,
//       calculatedTotalAmountEarned
//     });
//   } catch (error) {
//     console.error(error.message);
//     res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
//   }
// };


const approvetutorInstructorById = async (req, res) => {
  try {
    const { id } = req.params;
    const {email}= req.body;
    const updatedInstructor = await Instructor.findByIdAndUpdate(id, { status: "Approved" }, { new: true });

    if (!updatedInstructor) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Instructor not found" });
    }
     // Send approval email
     sendApprovalEmail(email);

    res.status(StatusCodes.OK).json({ instructor: updatedInstructor, message: "Instructor approved successfully" });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

const rejecttutorInstructorById = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason, email } = req.body; // Extract rejection reason from request body

    const updatedInstructor = await Instructor.findByIdAndUpdate(
      id,
      { 
        status: "Rejected",
        rejectionReason: rejectionReason // Save rejection reason
      },
      { new: true }
    );

    if (!updatedInstructor) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Instructor not found" });
    }

    sendRejectionEmail(email, rejectionReason);

    res.status(StatusCodes.OK).json({ instructor: updatedInstructor, message: "Instructor rejected successfully" });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

const deletetutorInstructorById = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedInstructor = await Instructor.findByIdAndDelete(id);

    if (!deletedInstructor) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Instructor not found' });
    }

    // Delete images associated with the instructor
    await deleteInstructorImages(deletedInstructor.idCard, deletedInstructor.instructorLicense);

    res.status(StatusCodes.OK).json({ message: 'Instructor deleted successfully' });
  } catch (error) {
    console.error('Error deleting instructor by ID:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
  }
};

const deleteInstructorImages = async (idCardImages, instructorLicenseImages) => {
  try {
    const deleteImages = async (images, folder) => {
      images.forEach((image) => {
        const filename = path.basename(image);
        const imagePath = path.join(__dirname, '..', 'uploads', 'instructor', folder, filename);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      });
    };

    await deleteImages(idCardImages, 'idcards');
    await deleteImages(instructorLicenseImages, 'instructorlicense');
  } catch (error) {
    console.error('Error deleting instructor images:', error);
  }
};


const gettutorInstructorProfile = async (req, res) => {
  try {
    const { id } = req.user;
    const instructor = await Instructor.findById(id);

    if (!instructor) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Instructor not found"});
    }
      res.status(200).json(vendor);
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ message: error.message });
    }
};


// const requestPayout = async (req, res) => {
//   try {
//       const { instructorId } = req.params;
//       const { requestedAmount } = req.body;

//       if (!requestedAmount) {
//           return res.status(400).json({ message: 'Requested amount is required' });
//       }

//       const instructor = await Instructor.findById(instructorId);

//       if (!instructor) {
//           return res.status(404).json({ message: 'Instructor not found' });
//       }

//       const now = new Date();
//       const oneMonthAgo = new Date(now);
//       oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

//       if (instructor.lastPayoutDate && instructor.lastPayoutDate > oneMonthAgo) {
//           return res.status(403).json({ message: 'Payout request is not eligible yet. Please wait until one month after the last payout.' });
//       }

//       if (requestedAmount > instructor.calculatedTotalAmountEarned) {
//           return res.status(400).json({ message: 'Requested amount exceeds total earned amount.' });
//       }

//       // Logic to process the payout request
//       instructor.calculatedTotalAmountEarned -= requestedAmount;
//       instructor.lastPayoutDate = now;
//       await instructor.save();

//       res.status(200).json({ message: 'Payout request processed successfully' });
//   } catch (error) {
//       console.error(error);
//       res.status(500).json({ message: 'Server error' });
//   }
// };

const requestPayout = async (req, res) => {
  try {
      const { instructorId } = req.params;
      const { requestedAmount } = req.body;

      if (!requestedAmount) {
          return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Requested amount is required' });
      }

      const instructor = await Instructor.findById(instructorId);

      if (!instructor) {
          return res.status(StatusCodes.NOT_FOUND).json({ message: 'Instructor not found' });
      }

      const now = new Date();
      const oneMonthAgo = new Date(now);
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

      if (instructor.lastPayoutDate && instructor.lastPayoutDate > oneMonthAgo) {
          return res.status(StatusCodes.FORBIDDEN).json({ message: 'Payout request is not eligible yet. Please wait until one month after the last payout.' });
      }

      if (requestedAmount > instructor.calculatedTotalAmountEarned) {
          return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Requested amount exceeds total earned amount.' });
      }

      // Logic to process the payout request
      instructor.calculatedTotalAmountEarned -= requestedAmount;
      instructor.lastPayoutDate = now;
      await instructor.save();

      // Save the transaction
      const transaction = new Transaction({
          instructorId: instructor._id,
          amount: requestedAmount,
          type: 'Payout',
          status: 'Completed'
      });
      await transaction.save();

      res.status(StatusCodes.OK).json({ message: 'Payout request processed successfully' });
  } catch (error) {
      console.error(error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Server error' });
  }
};

module.exports = {
    createtutorInstructor,
    getAlltutorInstructors,
    gettutorInstructorById,
    logintutorInstructor,
    updatetutorInstructorById,
    approvetutorInstructorById,
    rejecttutorInstructorById,
    deletetutorInstructorById,
    gettutorInstructorProfile,
    getInstructorByRoomId,
    updateInstructorEarnings,
    requestPayout
    
    
}