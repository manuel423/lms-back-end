const Payment = require("../model/payment");
const jwt = require("jsonwebtoken");
const TutorClass = require('../model/tutclass');


const fs = require("fs");

const axios = require("axios");
const Order = require("../model/order");
const Ordertut=require("../model/ordertutor");
const { StatusCodes } = require('http-status-codes');
const CustomError = require('../errors');
const Course = require("../model/course");
const User = require("../model/user");
const TutorInstructor = require('../model/instructor');

const home = async (req, res) => {
  try {
    const data = {
      status: "success",
      data: "Chapa Integrating..",
    };

    console.log({ data });
    res.status(200).json({ data });
  } catch (error) {
    handleErrors(error, res);
  }
};

const pay = async (req, res) => {
  try {
    // Purposebalck Telebirr Integration API
    // const pbe_telebirr_api = process.env.PBE_TELEBIRR_API;
    const pbe_telebirr_api = "https://telebirr.purposeblacketh.com/";
    // const notify_url = process.env.KAPS_TELEBIRR_NOTIFY_URL;

    // Destructure the value
    const { subject, amount, tranx_id } = req.body;

    const return_url = process.env.KAPS_TELEBIRR_RETURN_URL + "/" + tranx_id;
    const new_data = {
      subject,
      amount,
      tranx_id,
      return_url,
    };
    // Sending a post request to the api endpoint
    axios
      .post(pbe_telebirr_api + "telebirr/payer", new_data)
      .then((response) => {
        // This returns a response
        res.status(200).json({ data: response.data });
      })
      .catch((error) => {
        console.error("Error Sending Payment Request:", error);
        // This returns a error
        res.status(200).json({ error });
      });
  } catch (error) {
    handleErrors(error, res);
  }
};

const generate_unique_reference = async(length) =>{
  try {
    // Generate a 20 random char
    const characters =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let unique_reference = "";
    for (let i = 0; i < length; i++) {
      unique_reference += characters.charAt(
        Math.floor(Math.random() * characters.length)
      );
    }
    return unique_reference;
  } catch (error) {
    throw new Error("Error generating unique reference");
  }
}

/**
 *
 * @param {*} req
 * @param {*} res
 * Call this method to initiate chapa payment
 * This method returns a response that contains a toPayUrl(checkout_url) if success
 * This method may return a failure response on fail
 * @returns
 */
const chapa_pay = async (req, res) => {
  try {
    // Generate or feed your Transaction Reference
    const tx_ref = await  generate_unique_reference(20);
    const order_id = req.body.order_id;
    const base_url = process.env.BASE_URL+"/";
    const baseClientUrl = process.env.CLIENT_BASE_URL+"/";
    const order = await get_order(order_id);

    const user = await get_user(order.user);
    const encrypted_url = encrypt_lesson_url(order.orderItems[0].product);

    let computed_return_url = ''
    if(order.category!=='multiple'){
      computed_return_url = baseClientUrl + "lesson/" + encrypted_url;
    }else{
      computed_return_url= baseClientUrl 
    }

  const payment_data = {
    ot_token: "chapa_lms" + (await  generate_unique_reference(20)),
    first_name:user.fullname,
    last_name: user.fullname,
    user_id: user._id,
    email: user.email,
    amount: order.total,
    reference: "chapa_lms-" + (await  generate_unique_reference(20)),
    callback_url: base_url + "payment/chapa/callback/" + order_id + "/chapa_lms-" + tx_ref,
    return_url: computed_return_url,
    customization: {
      title: "Enroll Course",
      description: "KU - Elearning"
    }
  };
  

  const postUrl =
      process.env.PAYMENT_SERVICE_URL + "payment/api/v1/chapa/payer";

  const payer = await axios.post(postUrl, payment_data, {
    headers: {
      'Access-Token': process.env.PAYMENT_ACCESS_TOKEN
  }});

  const payer_data = payer.data;
  if (payer_data.error) {
    throw new Error(payer_data.data);
  }

  const response = {
    error: false,
    url: payer_data.url,
    message: "Chapa Payment initiated successfully",
  };

  console.log({response})

  return res.status(StatusCodes.OK).json(response);
  } catch (error) {
    console.log({ error:error.response?.data });
    const e_respone = {
      error: true,
      url: "",
      message:
        "An error occurred, please check the reference , amount , email ... are specified correctly and try again",
    };
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(e_respone);
  }
};
// cahapa pay for tutorials
 
const chapa_tut_pay = async (req, res) => {
  try {
      // Generate or feed your Transaction Reference
      const tx_ref = await  generate_unique_reference(20);
    const order_id = req.body.order_id;
      // const base_url = process.env.BASE_URL;
      const base_url = process.env.BASE_URL+"/";
      const baseClientUrl = process.env.CLIENT_BASE_URL;
      const order = await get_ordertut(order_id);
      const user = await get_user(order.user);

    const payment_data = {
      ot_token: "chapa_lms" + (await  generate_unique_reference(20)),
      first_name:user.fullname,
      last_name: user.fullname,
      user_id: user._id,
      email: user.email,
      amount: order.total,
      reference: "chapa_lms-" + (await  generate_unique_reference(20)),
      callback_url:  base_url + "payment/chapa/callbacktut/" + order_id + "/" + tx_ref,
      return_url:  baseClientUrl + "/find/tutor",
      customization: {
        title: "Enroll Course",
        description: "KU - Elearning"
      }
    };
    
  
    const postUrl =
        process.env.PAYMENT_SERVICE_URL + "payment/api/v1/chapa/payer";
  
    const payer = await axios.post(postUrl, payment_data, {
      headers: {
        'Access-Token': process.env.PAYMENT_ACCESS_TOKEN
    }});

  const payer_data = payer.data;
  if (payer_data.error) {
    throw new Error(payer_data.data);
  }

  const response = {
    error: false,
    url: payer_data.url,
    message: "Chapa Payment initiated successfully",
  };

    return res.status(StatusCodes.OK).json(response);
  } catch (error) {
    console.log({ error });
    const e_respone = {
      error: true,
      url: "",
      message:
        "An error occurred, please check the reference , amount , email ... are specified correctly and try again",
    };
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(e_respone);
  }
};

/**
 * A callback url that we feed chapa to notify our server and update some status
 * or may be store a transaction document
 */

const chapa_callback = async (req, res) => {
  try {
    const reference = req.body.reference;

    const order_id = req.params.order_id;


    let order =null;

    if (reference) {
      const data_chapa =req.body

      if(order_id){
        order = await get_order(order_id); 
      }
      if (data_chapa.status === "COMPLETED") {
        const data = {
          transactionID: data_chapa.reference, // This should be a unique ID for the transaction
          amount: data_chapa.amount, // Example amount
          currency: "ETB", // Example currency
          paymentMethod: "Chapa", // Example payment method
          customerID: order.user,// Example customer ID
          orderID: order_id, // Example order ID
        };

        const payment = await save_payment(data);

        if (payment) {
          // Update the order         t
          if(order){
            const updated_order = await updateOrder(order_id,reference);

            if(order.category === 'multiple'){
              const enrolled_course = await enrollCourseForMultipleEmails(order)
            }else{
              const enrolled_course = await enrollCourse(order.orderItems[0].product, order.user)
            }
         }
        }

        res.status(200).json({ success: true });
      }
    } else {
      console.log({ reference: "Reference Error" });
      res.status(500).json({ success: false });
    }
  } catch (error) {
    console.log({ error });
  }
};



const chapa_callbacktut = async (req, res) => {
  try {
    const reference = req.body.reference;


    const order_id = req.params.order_id;


    let order =null;

    if (reference) {
      const data_chapa =req.body

      if(order_id){
        order = await get_ordertut(order_id); 
      }



      if (data_chapa.status === "COMPLETED") {
        const data = {
          transactionID: data_chapa.reference, // This should be a unique ID for the transaction
          amount: data_chapa.amount, // Example amount
          currency: "ETB", // Example currency
          paymentMethod: "Chapa", // Example payment method
          customerID: order.user,// Example customer ID
          orderID: order_id, // Example order ID
        };

        const payment = await save_payment(data);
        console.log (payment);

        if (payment) {
          // Update the ordert
          if(order){
            const updated_order = await updateOrdertut(order_id,reference);

           
              const enrolled_tutorins = await enrollTutorInstructor(order.orderItems[0].product, order.user)
            
         }
        }

        res.status(200).json({ success: true });
      }
    } else {
      console.log({ reference: "Reference Error" });
      res.status(500).json({ success: false });
    }
  } catch (error) {
    console.log({ error });
  }
};


const success = async (req, res) => {
  try {
    // res.status(200).json({ data:"Hello Success"});
    res.status(200).json({
      data: req.body,
      success: {
        data: "redirecting Please Wait",
        status: true,
      },
    });
  } catch (error) {
    console.log({ error });
    // handleErrors(error, res);
  }
};

const notifier = async (req, res) => {
  try {
    console.log("Receiving Notification");
    const data = req.body;
    console.log({ incomingData: data });

    const orderID = data.outTradeNo;

    // const orderID = req.params.orderID;
  } catch (error) {
    console.error("Error processing payment success:", error);
    // Return a generic error message in case of server stop or crash
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const santim_pay_callback = (req, res) => {
  try {
    const publicKey = process.env.SANTIM_PAY_PUBLIC_KEY;
    const headerStringValue = req.headers["signed-token"];
    const decoded = jwt.verify(headerStringValue, publicKey, {
      algorithms: ["ES256"],
    });

    const orderId = parseInt(
      decoded.thirdPartyId.substring(0, decoded.thirdPartyId.length - 16)
    );
    // Process order status based on decoded status
    if (decoded.Status === "COMPLETED") {
      // Update order status to 'processing'
      console.log(`Order ${orderId} payment completed.`);
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Error processing Santimpay webhook:", err.message);
    res.status(500).json({ success: false });
  }
};


// Arif pay Integration

const arifpay_payer = async (req, res) => {

  try{
      const order_id = req.body.order_id;
      const base_url = process.env.BASE_URL+"/";
      const baseClientUrl = process.env.CLIENT_BASE_URL+"/";
      const order = await get_order(order_id);

      const user = await get_user(order.user);
      const encrypted_url = encrypt_lesson_url(order.orderItems[0].product);

      let computed_return_url = ''
      if(order.category!=='multiple'){
        computed_return_url = baseClientUrl + "lesson/" + encrypted_url;
      }

      const payment_data = {
        ot_token: "arifpay_lms" + (await  generate_unique_reference(20)),
        first_name:user.fullname,
        last_name: user.fullname,
        user_id: user._id,
        email: user.email,
        amount: order.total,
        phone_number: user.phoneNumber,
        callback_url: base_url + "payment/arif-pay/callback/" + order_id,
        return_url: base_url+"success",
        error_url: base_url + "error",
        cancel_url: base_url+"cancel",
      };
      
      const postUrl =
      process.env.PAYMENT_SERVICE_URL + "payment/api/v1/arifpay/payer";
    
    // Lets send this data to a post url using axios
    const payer = await axios.post(postUrl, payment_data, {
      headers: {
        'Access-Token': process.env.PAYMENT_ACCESS_TOKEN
    }});
    
    const payer_data = payer.data;
    if (payer_data.error) {
      throw new Error(payer_data.data);
    }
    
    const response = {
      error: false,
      url: payer_data.url,
      message: "Arifpay Payment initiated successfully",
    };

    console.log({response})
    
    return res.status(StatusCodes.OK).json(response);
  }catch (error) {
    console.log({ error });
    const e_respone = {
      error: true,
      url: "",
      message:
        "An error occurred, please check the reference , amount , email ... are specified correctly and try again",
    };
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(e_respone);
  }
}


const arif_pay_callback = async (req, res) => {
    //chapis work arif pay notified

    try{
      const orderId = req.params.order_id;


      const order = await get_order(orderId);

      if(order){
        const data = {
          transactionID: req.body.reference, // This should be a unique ID for the transaction
          amount: req.body.amount, // Example amount
          currency: "ETB", // Example currency
          paymentMethod: "Chapa", // Example payment method
          customerID: order.user,// Example customer ID
          orderID: orderId, // Example order ID
        };

        const payment = await save_payment(data);

        if (payment) {
          // Update the order         t
          if(order){
            const updated_order = await updateOrder(order_id,reference);

            if(order.category === 'multiple'){
              const enrolled_course = await enrollCourseForMultipleEmails(order)
            }else{
              const enrolled_course = await enrollCourse(order.orderItems[0].product, order.user)
            }
         }
        }

        res.status(200).json({ success: true });

      }

      
    }catch(error){
      console.log({error})

      res.status(500).json({error: error});
    }
};


// This function initiates santim pay payment
const santim_pay_process_payment = async (req, res) => {
  try {
    // Grab the credentials from environment variable
    const privateKey = process.env.SANTIM_PAY_PRIVATE_KEY;
    const authToken = process.env.SANTIM_PAY_TOKEN;
    const merchant_id = process.env.SANTIM_PAY_MERCHANT_ID;
    // Get the body of the request
    const orderDetail = req.body;
    const reason = orderDetail.reason;
    // Prepare the payload to be signed
    const data = {
      amount: orderDetail.total,
      phone_number: "0935587112",
      paymentReason: reason,
      merchantId: merchant_id,
      generated: Math.floor(Date.now() / 1000),
    };

    // Sign the payload
    const token = jwt.sign(data, privateKey, { algorithm: "ES256" });
    const base_url = process.env.BASE_URL+"/";
    const baseClientUrl = process.env.CLIENT_BASE_URL;

    // Static data
    const static_data = {
      returnUrl: baseClientUrl,
      failureRedirectUrl: baseClientUrl + "?failed=true",
      notifyUrl:
      base_url+"/payment/santim-pay/callback",
    };
    // Request body for santim-pay
    const body = {
      id: orderDetail.order_id + Math.random().toString(16).substring(2, 10),
      amount: orderDetail.total,
      reason: reason,
      merchantId: merchant_id,
      signedToken: token,
      successRedirectUrl:
        static_data.returnUrl + "CourseDetail/660678ef24f65af4485f2164",
      failureRedirectUrl: static_data.failureRedirectUrl,
      notifyUrl: static_data.notifyUrl,
    };

    // Send request to Santimpay API
    // Example: You can use 'axios' to make HTTP requests
    const response = await axios.post(
      "https://services.santimpay.com/api/v1/gateway/initiate-payment",
      body,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
      }
    );
    // Log the response to track the response
    console.log({ response });
    // return the response to the client app
    return res.status(200).json({ response: response.data });
  } catch (err) {
    console.error("Error processing Santimpay payment:", err.message);
    return res.status(500).json({ err });
  }
};

//

const save_payment = async (data) => {
  // Process Saving The data (save payment Info)
  const newPaymentData = {
    transactionID: data.transactionID, // This should be a unique ID for the transaction
    amount: data.amount, // Example amount
    currency: data.currency, // Example currency
    paymentMethod: data.paymentMethod, // Example payment method
    customerID: data.customerID, // Example customer ID
    orderID: data.orderID, // Example order ID
    status: "completed"
  };
  // Creating a new Payment document
  Payment.create(newPaymentData)
    .then((payment) => {
      console.log("Payment created successfully:", payment);
    })
    .catch((error) => {
      console.error("Error creating payment:", error);
    });
  return true;
};

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// const generateTransacrionReference = async () =>{
//    // Generate or feed your Transaction Reference
//    const tx_ref = await chapa.generateTransactionReference({
//     prefix: "KU", // defaults to `TX`
//     size: 20, // defaults to `15`
//   });

//   return tx_ref
// }

const get_user = async (user_id) => {
  return await User.findById(user_id);
}

// Get single order
const get_order = async (order_id) => {
  const order = await Order.findOne({ _id: order_id });
  if (!order) {
    throw new CustomError.NotFoundError(`No order with id : ${order_id}`);
  }

  return order;
}

const get_ordertut = async (order_id) => {
  const order = await Ordertut.findOne({ _id: order_id });
  if (!order) {
    throw new CustomError.NotFoundError(`No order with id : ${order_id}`);
  }

  return order;
}


const updateOrder = async (orderId, reference) => {
  const order = await Order.findOne({ _id: orderId });
  if (!order) {
    return false;
  }

  order.paymentIntentId = reference;
  order.status = 'paid';
  await order.save();

  return order;
};



const updateOrdertut = async (orderId, reference) => {
  const order = await Ordertut.findOne({ _id: orderId });
  if (!order) {
    return false;
  }

  order.paymentIntentId = reference;
  order.status = 'paid';
  await order.save();

  return order;
};

const encrypt_lesson_url = (product_id) => {
  return btoa(product_id);
}

// const enrollCourse = async (courseId,userId) => {
//   try {

//       // Check if the course exists
//       const course = await Course.findById(courseId);

//       if (!course) {
//           return false
//       }

//       // Check if the user is already enrolled in the course
//       if (course.userWhoHasBought.includes(userId)) {
//           return false
//       }

//       // Add the user to the list of users who have bought the course
//       course.userWhoHasBought.push(userId); 
//       await course.save();

//       // Add the course to the user's enrolled courses
//       const user = await User.findById(userId);

//       if (!user) {
//          return false
//       }
//       // Add the course to the user's enrolled courses with progress set to 0
//       user.enrolledCourses.push({ course: courseId, progress: 0 });
//       await user.save();

//      return user;
//   } catch (error) {
//       console.error('Error enrolling user in course:', error);
//       res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
//   }
// };


const enrollCourse = async (  courseId,  userId) => {
  try {

    // Check if the course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return false;
    }

    // Check if the user exists
    const user = await User.findById(userId);
    if (!user) {
      return false;
    }

    // Check if the user is already enrolled in the course
    if (course.userWhoHasBought.includes(userId)) {
      return false;
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
    return false
    console.error('Error enrolling user in course:', error);
  
  }
};


// const enrollCourse = async (courseId,userId) => {
//   try {

//     // Check if the course exists
//     const course = await Course.findById(courseId);
//     if (!course) {
//       return false;
//     }

//     // Check if the user is already enrolled in the course
//     if (course.userWhoHasBought.includes(userId)) {
//       return false
//     }

//     // Add the user to the list of users who have bought the course
//     course.userWhoHasBought.push(userId);
//     await course.save();

//     // Add the course to the user's enrolled courses
//     const user = await User.findById(userId);
//     if (!user) {
//       return false;
//     }

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

//       enrolledCourse.lesson.push({
//         groupquestionid: chap.questionsGroup._id.toString(), // Convert ObjectId to string
//         averagescoreprogress: 0 // Initialize averagescoreprogress
//       });
//     });

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

//     return true

    
//   } catch (error) {
//     return false
//     console.error('Error enrolling user in course:', error);
  
//   }
// };




const enrollCourseForMultipleEmails = async  (order) => {
  try {
    const emails = order.emails
    const courseId= order.orderItems[0].product
    if (!Array.isArray(emails) || emails.length === 0 || emails.length > 10) {
      return false;
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return false;
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
return true;
  } catch (error) {
    console.error('Error enrolling courses for multiple emails:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
  }
};


const enrollTutorInstructor = async (classId, userId) => {
  
  try {
    // const classId = req.params.classId;
    // const { userId } = req.body;

    // Check if the class exists
    const tutorClass = await TutorClass.findById(classId);
    if (!tutorClass) {
      return false
    }

    // Check if the user exists
    const user = await User.findById(userId);
    if (!user) {
      return false
    }

    // Check if the user is already enrolled in the class
    if (tutorClass.userWhoHasEnrolled.includes(userId)) {
      return false
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

   return false
  } catch (error) {
    console.error('Error enrolling user in class:', error);
    return false
  }
};


//chapiworks

const getAllPayments = async (req, res) => {
  try {
    // Parse query parameters for pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10; // Default limit is 10

    // Calculate skip value based on page and limit
    const skip = (page - 1) * limit;

    // Get total number of payments
    const totalPayments = await Payment.countDocuments();

    // Fetch payments with pagination and populate the order details
    const payments = await Payment.find()
      .skip(skip)
      .limit(limit)
      .populate({
        path: 'orderID',
        populate: {
          path: 'orderItems.product',
          model: 'Course'
        }
      })// Populate order details
      .exec();

    // Calculate the total amount
    const totalAmount = await Payment.aggregate([
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);

    res.status(StatusCodes.OK).json({
      payments,
      totalAmount: totalAmount[0]?.total || 0,
      currentPage: page,
      totalPages: Math.ceil(totalPayments / limit),
      totalPayments
    });
  } catch (error) {
    console.error("Error fetching all payments:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
  }
};


const getSinglePaymentById = async (req, res) => {
  try {
    const { id } = req.params;
    const payment = await Payment.findById(id);
    if (!payment) {
      throw new CustomError.NotFoundError(`No payment found with id: ${id}`);
    }
    res.status(StatusCodes.OK).json({ payment });
  } catch (error) {
    console.error("Error fetching payment by id:", error);
    if (error instanceof CustomError.NotFoundError) {
      res.status(StatusCodes.NOT_FOUND).json({ error: error.message });
    } else {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
    }
  }
};
module.exports = {
  home,
  pay,
  chapa_pay,
  arifpay_payer,
  chapa_callback,
  santim_pay_process_payment,
  santim_pay_callback,
  success,
  notifier,
  arif_pay_callback,
  chapa_callbacktut,
  getAllPayments,
  getSinglePaymentById,
  chapa_tut_pay
};