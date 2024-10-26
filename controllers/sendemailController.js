const nodemailer = require('nodemailer');
require('dotenv').config(); // To use environment variables from .env file

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const sendRejectionEmail = (to, reason) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: to,
    subject: 'Instructor Application Rejected',
    text: `Dear Instructor,\n\nYour application has been rejected for the following reason:\n\n${reason}\n\nBest regards,\nYour Team`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log('Error sending email:', error);
    } else {
      console.log('Email sent:', info.response);
    }
  });
};


const sendApprovalEmail = (to) => {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: to,
      subject: 'Instructor Application Approved',
      text: `Dear Instructor,\n\nCongratulations! Your application has been approved.\n\nBest regards,\nYour Team`,
    };
  
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log('Error sending email:', error);
      } else {
        console.log('Email sent:', info.response);
      }
    });
  };
module.exports = {
  sendRejectionEmail,
  sendApprovalEmail
};
