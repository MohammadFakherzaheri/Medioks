const bcrypt = require("bcryptjs/dist/bcrypt");
const express = require("express");
const config = require("config");
const avatar = require("gravatar");
const jwt = require("jsonwebtoken");
const router = express.Router();
const { check, validationResult, Result } = require("express-validator");
const sendGridAPiKey = process.env.SENDGRID_KEY;
const sgMail = require("@sendgrid/mail");
const fromEmail = process.env.FROM_EMAIL;
const forgotPasswordTemplateId = process.env.FORGOTPASSWORD_TEMPLATEID;
const cors = require("cors");
const multer = require("multer");
const path = require("path");

// models route
const SignUp = require("../models/SignUp");
const auth = require("../middleware/auth");
const DeliveryAddress = require("../models/Delivery");
const ContactUs = require("../models/ContactUs");
const BookQuery = require("../models/BookQuery");
const AddCategory = require("../models/Category");
const SubCategory = require("../models/SubCategory");
const AddProduct = require("../models/Product");
const WishList = require("../models/WishList");
const RatingProduct = require("../models/Rating");
const AddToCart = require("../models/Cart");
const { resolveSoa } = require("dns");

// @Rout POST /api/signUp
// @desc Register User
// @access Public
router.post("/signUp",
  [
    check("name", "Name is required").trim().not().isEmpty(),
    check("email", "Email is required").isEmail(),
    check(
      "password",
      "Please add a password with 6 or more characters"
    ).isLength({ min: 6 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res
        .status(400)
        .json({ success: false, response: "error", errors: errors.array() });
    }

    const { name, email, password } = req.body;

    try {
      // check if the user already exists or not
      let user_email = await SignUp.findOne({email});

      if(user_email){
        res.status(400).json({success:false,response:"error",errors:[{msg:'User already exists'}]})
      }
      // check the avater of email if any
      const avatarURL = avatar.url(email, {
        s: 200,
        r: "pg",
        d: "mm",
      });

      const newSignUp = new SignUp({
        name,
        email,
        avatar: avatarURL,
        password,
      });

      // decrypt the password
      const salt = await bcrypt.genSalt(10);
      newSignUp.password = await bcrypt.hash(password, salt);
      await newSignUp.save();
      res.status(200).json({
        msg: "User registered successfully",
        success: true,
        response: "successful",
        data: newSignUp,
      });
    } catch (err) {
      res
        .status(500)
        .json({
          errors: [{ msg: "Server error", param: "server", location: "body" }],
        });
    }
  }
);

// @Rout POST /api/login
// @desc login details
// @access Public
router.post("/login",
  [
    check("email", "Email is required").isEmail(),
    check("password", "Password is required").exists(),
  ],
  async (req, res) => {
    let errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res
        .status(400)
        .json({ success: false, response: "error", errors: errors.array() });
    }
    const { email, password } = req.body;
    try {
      let user = await SignUp.findOne({ email });
      if (!user) {
        return res
          .status(400)
          .json({ errors: [{success: false, response: "error", msg: "Invalid credential" }] });
      }
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res
          .status(400)
          .json({ errors: [{success: false, response: "error", msg: "Invalid credential" }] });
      }

      //Generate Token

      const payload = {
        user: {
          id: user.id,
        },
      };

      jwt.sign(
        payload,
        config.get("tokeSecret"),
        { expiresIn: 3600000 },
        (err, token) => {
          if (err) throw err;
          res.status(200).json({success:true,response:'successful' ,data:token });
        }
      );
    } catch (error) {
      res.status(500).json({
        errors: [{ msg: "Server error", param: "server", location: "body" }],
      });
    }
  }
);

// @Rout POST /api/forgotPassword
// @desc Forgot password api
// @access Public
router.post("/forgotPassword",
  [check("email", "Please add valid email").isEmail()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    const { email } = req.body;
    try {
      let user = await SignUp.findOne({ email });
      if (!user) {
        return res.status(400).json({
          success: false,
          response: "error",
          errors: [{ msg: "Please include registerd email" }],
        });
      } else {
        let email_varification_code = Math.floor(
          100000 + Math.random() * 900000
        );
        let otp_expired = new Date();
        otp_expired.setMinutes(otp_expired.getMinutes() + 5);
        const passwordObject = {};
        passwordObject.otp_expired = otp_expired;
        passwordObject.otp = email_varification_code;
        console.log(passwordObject.otp, "otp");
        passwordObject.updated_at = new Date();
        try {
          let personalData = {};
          personalData = await SignUp.findOneAndUpdate(
            { _id: user._id },
            { $set: passwordObject }
          );

          res
          .status(200)
          .json({
            msg: "Please check your email for OTP verification",
            success: true,
            response: "successful",
            data: {otp:passwordObject.otp,user_id:user._id,email:user.email}
          });

          // sgMail.setApiKey(sendGridAPiKey);
          // sgMail.setApiKey(process.env.SENDGRID_KEY);
          // console.log(personalData, "personalData");
          // const msg = {
          //   to: "mohammadfakher.fresco@gmail.com",
          //   from: {
          //     email: "fakher@frescowebservices.com",
          //     // fromEmail,
          //     },
          //   subject: "Forgot Password",
          //   html:
          // '<style>.first{width:100%}</style>'+
          // '<div class="row" style="background-color:#f3f3f3;border: 3px solid #c3c3c3;">'+
          //   '<div style="text-align: center;padding:7px;">'+
          //     '<h1> Your Otp is: '+passwordObject.otp+ '.</h1>'+

          //   '</div>'+


          //     '<div class="row col-md-12" style="text-align:center;background-color:#c3c3c3;color:white;height: auto;padding-top: 0px;">'+
          //       '<div style="margin-top:6px;margin-bottom:6px;padding-top:6px;padding: 5px;color: black;font-family: -webkit-pictograph;font-size: 14px;font-weight: 600;">'+
          //       'Copyright © 2022 LMS , All rights reserved'+
          //     '</div>'+
          //   '</div>'+

          // '</div>',
          //   // templateId:forgotPasswordTemplateId,
          //   // dynamicTemplateData:{
          //   //     subject:"Forgot Password",
          //   //     otp:passwordObject.otp
          //   // },
          // };

          // sgMail.send(msg, (err, result) => {
          //   if (err) {
          //     console.log(err);
          //   } else {
          //     console.log("Send email to user done!");
          //     console.log(result);
          //     return res.json({
          //       success: true,
          //       response: "successful",
          //       msg: "Please check your email for OTP verification",
          //       data: {
          //         id: user.id,
          //         email: email,
          //       },
          //     });
          //   }
          // });
        } catch (error) {
          console.error(error.message);
          res.status(500).send("Server Error 1");
        }
      }
    } catch (error) {
      console.error(error.message);
      res.status(500).send("Server Error2");
    }
  }
);

// @Rout POST /api/verify/:id
// @desc Verify the OTP with id
// @access Public
router.post("/verifyOtp/:id",
  [check("otp", "OTP must be of 6 digit numbers").matches(/^[0-9]{6}$/)],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    const { otp } = req.body;
    let user_id = req.params.id;
    try {
      function time_gap(dt2, dt1) {
        var diff = (dt2.getTime() - dt1.getTime()) / 1000;
        diff /= 60;
        return Math.round(diff);
      }
      let userData = await SignUp.findOne({ _id: user_id });

      // console.log(userData);
      if (userData) {
        let otp_expired = userData.otp_expired;

        let currentDateTime = new Date();
        let expiredDateTime = new Date(otp_expired);
        var expiringDifference = time_gap(currentDateTime, expiredDateTime);
        //console.log(expiringDifference);
        if (otp == userData.otp) {
          if (expiringDifference < 0) {
            var userDetails = {};
            userDetails.otp = null;
            userDetails.otp_expired = currentDateTime;
            var user_otpToken = Math.random().toString(36).substring(2, 10);
            userDetails.otp_token = user_otpToken;

            await SignUp.findOneAndUpdate(
              { _id: user_id },
              { $set: userDetails }
            );

            res.json({
              success: true,
              msg: "OTP verified successfully",
              data: {
                id: user_id,
                otptoken: user_otpToken,
              },
            });
          } else {
            res.status(400).send({
              success: false,
              errors: [
                {
                  msg: "OTP get expired",
                  param: "otp",
                  location: "body",
                },
              ],
            });
          }
        } else if (otp != userData.otp) {
          res.status(400).send({
            success: false,
            errors: [
              {
                msg: "OTP is not valid",
                param: "otp",
                location: "body",
              },
            ],
          });
        }
      } else {
        res.status(400).send({
          success: false,
          errors: [
            {
              msg: "No Otp in this id",
              param: "id",
              location: "url",
            },
          ],
        });
      }
    } catch (err) {
      console.error(err.message);
      res.status(500).send({
        success: false,
        errors: [
          {
            msg: "Server error",
            param: "server",
            location: "body",
          },
        ],
      });
    }
  }
);

// @route    PUT /v1/reset_password/:id/:otptoken
// @desc     reset pssword after otp verification
// @access   Public
router.put("/resetPassword/:id/:otptoken",
  [
    [
      check(
        "password",
        "New password should have( one uppercase , one lower case, one special char, one digit and min 6 char long )"
      ).matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])(?=.{6,})/
      ),
      check(
        "confirm_password",
        "Confirm Password should matched with new password"
      ).matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])(?=.{6,})/
      ),
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    const { password, confirm_password } = req.body;
    let user_id = req.params.id;
    let user_otptoken = req.params.otptoken;
    let user = await SignUp.findOne({ _id: user_id });

    if (!user) {
      return res.status(400).json({
        success: false,
        errors: [
          {
            status: 0,
            response: "error",
            param: "_id",
            msg: "Something Went Wrong..",
          },
        ],
      });
    }

    if (user.otp_token !== user_otptoken) {
      return res.status(400).json({
        success: false,
        errors: [
          {
            response: "error",
            param: "otp_token",
            msg: "Link Expired",
          },
        ],
      });
    }

    if (password !== confirm_password) {
      return res.status(400).json({
        success: false,
        errors: [
          {
            status: 0,
            response: "error",
            param: "confirm_password",
            msg: "Confirm password does not matched with new password",
          },
        ],
      });
    }

    // Build passwordObject
    const salt = await bcrypt.genSalt(10);

    const passwordObject = {};
    if (password) passwordObject.password = await bcrypt.hash(password, salt);
    passwordObject.otp_token = null;
    passwordObject.updated_at = new Date();

    try {
      let personalData = null;

      // Using upsert option (creates new doc if no match is found):
      personalData = await SignUp.findOneAndUpdate(
        { _id: user_id },
        { $set: passwordObject }
      );

      if (personalData) {
        res.json({
          success: true,
          status: 1,
          response: "successful",
          msg: "Password is updated successfully",
        });
      } else {
        res.json({
          success: false,
          status: 0,
          response: "error",
          msg: "No record found",
        });
      }
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server Error");
    }
  }
);

// @route    PUT /v1/profile/editProfile
// @desc     Edit the profile of user
// @access   Private
router.put("/editProfile",
  [
    auth,
    [
      check("name", "Please fill all mandatory fields.!")
        .trim()
        .not()
        .isEmpty(),
      check("last_name", "Please fill all mandatory fields.!")
        .trim()
        .not()
        .isEmpty(),
      check("contact_no", "Please fill all mandatory fields.!").isLength({
        min: 10,
        max: 14,
      }),
      check("date_of_brith", "Please fill all mandatory fields.!")
        .not()
        .isEmpty(),
      check("residence_city", "Please fill all mandatory fields.!")
        .trim()
        .not()
        .isEmpty(),
      check("college_name", "Please fill all mandatory fields.!")
        .trim()
        .not()
        .isEmpty(),
      check("course_name", "Please fill all mandatory fields.!")
        .trim()
        .not()
        .isEmpty(),
      check("course_year", "Please fill all mandatory fields.!")
        .trim()
        .not()
        .isEmpty(),
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res
        .status(400)
        .json({ success: false, response: "error", errors: errors.array() });
    }

    const {
      name,
      last_name,
      contact_no,
      date_of_brith,
      residence_city,
      college_name,
      course_name,
      course_year,
    } = req.body;

    const userProfile = {};
    if (name) userProfile.name = name;
    if (last_name) userProfile.last_name = last_name;
    if (contact_no) userProfile.contact_no = contact_no;
    if (date_of_brith) userProfile.date_of_brith = date_of_brith;
    if (residence_city) userProfile.residence_city = residence_city;
    if (college_name) userProfile.college_name = college_name;
    if (course_name) userProfile.course_name = course_name;
    if (course_year) userProfile.course_year = course_year;

    try {
      if (userProfile) {
        await SignUp.findByIdAndUpdate(
          req.user.id,
          { $set: userProfile },
          { new: true }
        );
      }
      res.status(200).json({
        success: true,
        response: "successful",
        msg: "Successfully update profile",
      });
    } catch (err) {
      res.status(500).json({ success: false, response: "error", msg: "Server error" });
    }
  }
);

// @route    Get /v1/getProfile
// @desc     Show the user detials
// @access   Private
router.get("/getProfile",
 auth, async (req, res) => {
  try {
    const userDetials = await SignUp.findById(req.user.id).select("-password");
    res
      .status(200)
      .json({ success: true, response: "successful", data: userDetials });
  } catch (err) {
    console.log(err.message);
    res.status(500).json({ success: false, response: "error", msg: "Server error" });
  }
});

// @route    Get /v1/getProfile
// @desc     Show the user detials
// @access   Private
router.put('/changePassword',
[
  auth,
  [
    check("oldPassword",'Password is not correct')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])(?=.{6,})/),
    check('newPassword','Please enter your new password')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])(?=.{6,})/),
    check('confirmPassword','Please enter confirm password')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])(?=.{6,})/),
  ],
],
async(req,res)=>{
  const errors = validationResult(req);
  if(!errors.isEmpty()){
    res
    .status(400)
    .json({success:false,response:'error',errors:errors.array()})
  }
  const {oldPassword,newPassword,confirmPassword} = req.body;

  const user = await SignUp.findOne({_id:req.user.id})
  const isMatch = await bcrypt.compare(oldPassword,user.password)
  if(!isMatch){
    return res.status(400).json({
      errors: [
        {
          success: false,
          response: "error",
          param: "oldPassword",
          msg: "Old password is invalid",
        },
      ],
    });
  }
  if(newPassword !== confirmPassword){
    return res.status(400).json({
      errors: [
        {
          success: false,
          response: "error",
          param: "confirm_password",
          msg: "Confirm password does not matched with new password",
        },
      ],
    });
  }

  const salt = await bcrypt.genSalt(10);

  const updatePassword = {};
  if(updatePassword) updatePassword.password = await bcrypt.hash(newPassword, salt);
  updatePassword.updated_at = new Date();

  try {
    await SignUp.findOneAndUpdate(
      {_id:req.user.id},
      {$set:updatePassword}
    );
    res.status(200)
        .json({
      success: true,
      response: "successful",
      msg: "Password is updated successfully",
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
})
// @route    POST /v1/deliveryAddress
// @desc     Add delivery address to the user profile
// @access   Private
router.post("/deliveryAddress",
  [
    auth,
    [
      check("name", "Name field is required").trim().not().isEmpty(),
      check("address", "Address field is required").trim().not().isEmpty(),
      check("state", "Address field is required").trim().not().isEmpty(),
      check("city", "City field is required").trim().not().isEmpty(),
      check("zipcode", "Zipcode must be include 6 digit numbers").isLength({
        min: 6,
        max: 6,
      }),
      check("contact_no", "Please add a valid contact number").isLength({
        min: 10,
        max: 14,
      }),
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res
        .status(400)
        .json({ success: false, response: "error", errors: errors.array() });
    }
    const { name, address, state, city, zipcode, contact_no } = req.body;
    const user = req.user.id;
    // build a newObject the address for user
    try {
      const deliveryAddress = new DeliveryAddress({
        user,
        name,
        address,
        state,
        city,
        zipcode,
        contact_no,
      });
      await deliveryAddress.save();
      res
        .status(200)
        .json({ success: true, response: "successful", data: deliveryAddress });
    } catch (err) {
      console.log(err.message);
      res.status(500).json({ success: false, response: "error", msg: "Server error" });
    }
  }
);

// @route    GET /v1/getDelivaryAddress
// @desc     Get delivery address of user
// @access   Private
router.get("/getDeliveryAddress",
 auth, async (req, res) => {
  try {
    const userDeliveryAddress = await DeliveryAddress.find();
    if (userDeliveryAddress.length > 0) {
      res
        .status(200)
        .json({
          success: true,
          response: "successful",
          data: userDeliveryAddress,
        });
    } else {
      return res
        .status(400)
        .json({
          success: false,
          response: "error",
          errors: [{ msg: "No record found" }],
        });
    }
  } catch (err) {
    console.log(err.message);
    res.status(500).json({ success: false, response: "error", msg: "Server error" });
  }
});

// @route    GET /v1/getDelivaryAddress/:id
// @desc     Get delivery address of user by delivery id
// @access   Private
router.get("/getDeliveryAddress/:id",
 auth, async (req, res) => {
  const deli_id = req.params.id;
  try {
    const userDeliveryAddress = await DeliveryAddress.findById({id:deli_id});
      res
        .status(200)
        .json({
          success: true,
          response: "successful",
          msg: "Data fetched successfully",
          data: userDeliveryAddress ,
        });
  } catch (err) {
    if (err.kind === "ObjectId") {
      res
        .status(404)
        .json({ success: false, response: "error", msg: "Date not found" });
    }
    res.status(500).json({ success: false, response: "error", msg: "Server error" });
  }
});

// @route    Put /v1/contact_us
// @desc     Get quiry of users
// @access   Private
router.put("/updateDeliveryAddress/:id",
  [
    auth,
    [
      check("name", "Name field is required").trim().not().isEmpty(),
      check("address", "Address field is required").trim().not().isEmpty(),
      check("state", "Address field is required").trim().not().isEmpty(),
      check("city", "City field is required").trim().not().isEmpty(),
      check("zipcode", "Zipcode must be include 6 digit numbers").isLength({
        min: 6,
        max: 6,
      }),
      check("contact_no", "Please add a valid contact number").isLength({
        min: 10,
        max: 14,
      }),
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res
        .status(400)
        .json({ success: false, response: "error", errors: errors.array() });
    }
    const deli_id = req.params.id;
    const { name, address, state, city, zipcode, contact_no } = req.body;

    // Create new Object
    const updatedDeliveryAddress = {};
    if (name) updatedDeliveryAddress.name = name;
    if (address) updatedDeliveryAddress.address = address;
    if (state) updatedDeliveryAddress.state = state;
    if (city) updatedDeliveryAddress.city = city;
    if (zipcode) updatedDeliveryAddress.zipcode = zipcode;
    if (contact_no) updatedDeliveryAddress.contact_no = contact_no;

    try {
      if (updatedDeliveryAddress) {
        await DeliveryAddress.findByIdAndUpdate(
          deli_id,
          { $set: updatedDeliveryAddress },
          { new: true }
        );
        res
          .status(200)
          .json({
            success: true,
            response: "successful",
            msg: "Delivery address update successfully",
          });
      } else {
        res.status(400).json({ msg: "Data not found" });
      }
    } catch (err) {
      if (err.kind === "ObjectId") {
        res
          .status(404)
          .json({
            success: false,
            response: "error",
            msg: "Error: Please try again",
          });
      }
      res.status(500).json({ msg: "Server Error final" });
    }
  }
);

// @route    Delete /v1/deleteDeliveryAddres/:id
// @desc     Delete delivery address by id
// @access   Private
router.delete("/deleteDeliveryAddress/:id",
 auth, async (req, res) => {
  try {
    const deli_id = req.params.id;
    await DeliveryAddress.findByIdAndRemove(deli_id);
    res
      .status(200)
      .json({
        success: true,
        response: "successful",
        msg: "Record deleted successfully",
      });
  } catch (err) {
    if (err.kind === "ObjectId") {
      res
        .status(404)
        .json({ success: false, response: "error", msg: "Record not found" });
    }
    res.status(500).json({ success: false, response: "error", msg: "Server error" });
  }
});

// @router   POST /v1/contact_us
// @desc     Get quiry of users
// @access   Private
router.post("/contactUs",
  [
    auth,
    [
      check("name", "All fields are required.").trim().not().isEmpty(),
      check("email", "All fields are required.").trim().isEmail(),
      check("contact_no", "All fields are required.")
        .trim()
        .isLength({ min: 10, max: 14 }),
      check("feedback", "All fields are required.").trim().not().isEmpty(),
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res
        .status(400)
        .json({ success: false, response: "error", errors: errors.array() });
    }
    const { name, email, contact_no, feedback } = req.body;
    // find the user Id
    const user = req.user.id;
    try {
      // build new object
      const newContactUs = new ContactUs({
        user,
        name,
        email,
        contact_no,
        feedback,
      });
      await newContactUs.save();
      res
        .status(200)
        .json({
          success: true,
          response: "successful",
          msg: "Form submitted successfully",
          data: newContactUs,
        });
    } catch (err) {
      console.log(err.message);
      res.status(500).json({ success: false, response: "error", msg: "Server error" });
    }
  }
);

// @router   POST /v1/bookQuery
// @desc     post the query cant't find book by user
// @ access  Private
router.post("/bookQuery",
  [
    auth,
    [
      check("name", "Please fill all mendatory fields").trim().not().isEmpty(),
      check("email", "Please fill all mendatory fields").trim().isEmail(),
      check("contact_no", "Please fill all mendatory fields")
        .trim()
        .isLength({ min: 10, max: 14 }),
      check("book_name", "Please fill all mendatory fields")
        .trim()
        .not()
        .isEmpty(),
      check("book_publisher", "Please fill all mendatory fields")
        .trim()
        .not()
        .isEmpty(),
      check("book_author", "Please fill all mendatory fields")
        .trim()
        .not()
        .isEmpty(),
      check("book_edition", "Please fill all mendatory fields")
        .trim()
        .not()
        .isEmpty(),
      check("book_ISBN", "Please add proper ISBN,Containing 10 to 13 digits")
        .trim()
        .isLength({ min: 10, max: 13 }),
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res
        .status(400)
        .json({
          success: false,
          response: "successful",
          errors: errors.array(),
        });
    }

    // pull out all elements from body
    const {
      name,
      email,
      contact_no,
      book_name,
      book_publisher,
      book_author,
      book_edition,
      book_ISBN,
      date,
    } = req.body;
    const user = req.user.id;
    try {
      // build the new object
      const newBookQuery = new BookQuery({
        user,
        name,
        email,
        contact_no,
        book_name,
        book_publisher,
        book_author,
        book_edition,
        book_ISBN,
        date,
      });
      await newBookQuery.save();
      res
        .status(200)
        .json({
          success: true,
          response: "successful",
          msg: "Query form submitted successfully",
          data: newBookQuery,
        });
    } catch (err) {
      console.log(err.message);
      res.status(500).json({ success: false, response: "error", msg: "Server error" });
    }
  }
);

// @router   POST /v1/addCategory
// @desc     Create the categories by this api
// @access   Private
router.post("/addCategory",
  [
    auth,
    [
      check("category_name", "Pleae enter the category name")
        .trim()
        .not()
        .isEmpty(),
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res
        .status(400)
        .json({
          success: false,
          response: "successful",
          errors: errors.array(),
        });
    }
    const { category_name } = req.body;

    try {
      const newCategory = new AddCategory({
        category_name,
      });
      await newCategory.save();
      res
        .status(200)
        .json({ success: true, response: "successful", data: newCategory });
    } catch (err) {
      console.log(err.message);
      res.status(500).json({ success: false, response: "error", msg: "Server error" });
    }
  }
);

// @router  GET /v1/allCategories
// @desc    Get all categories
// @access  Private
router.get("/allCategories",
 auth, async (req, res) => {
  try {
    const AllCategories = await AddCategory.find();
    if (AllCategories.length > 0) {
      res
        .status(200)
        .json({ success: true, response: "successful", data: AllCategories });
    } else {
      return res
        .status(400)
        .json({
          success: false,
          response: "error",
          errors: [{ msg: "No record found" }],
        });
    }
  } catch (err) {
    console.log(err.message);
    res.status(500).json({ success: false, response: "error", msg: "Server error" });
  }
});

// @router  GET /v1/category/:id
// @desc    Get category by its id
// @access  Private
router.get("/category/:category_id",
 auth, async (req, res) => {
  const category_id = req.params.category_id;
  try {
    const categoryById = await AddCategory.findById(category_id);
    if(!categoryById){
      res
      .status(200)
      .json({ success: false, response: "error", msg: "Record not found" });
    }
    res
      .status(200)
      .json({ success: true, response: "successful", data: categoryById });
  } catch (err) {
    if (err.kind === "ObjectId") {
      res
        .status(400)
        .json({ success: false, response: "error", msg: "Record not found" });
    }
    res.status(500).json({ success: false, response: "error", msg: "Server error" });
  }
});

//  @Router  POST/v1/addSubcategory
//  @desc    Add subcategory alone with category
//  @access  Private
router.post("/addSubcategory",
  [
    auth,
    [
      check("sub_categoryName", "Please enter the subcategory name")
        .trim()
        .not()
        .isEmpty(),
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res
        .status(400)
        .json({ success: false, response: "error", errors: errors.array() });
    }

    const { sub_categoryName, category_id } = req.body;
    try {
      let subcategory_id = await SubCategory.findOne({sub_categoryName});

      if(subcategory_id){
        res.status(400).json({success:false,response:"error",errors:[{msg:'Subcategory already exists'}]})
      }
      const newSubCategory = new SubCategory({
        category_id,
        sub_categoryName,
      });
      await newSubCategory.save();
      res
        .status(200)
        .json({
          success: true,
          response: "successful",
          msg: "SubCategory added successfully",
          data: newSubCategory,
        });
    } catch (err) {
      res.status(500).json({ success: false, response: "error", msg: "Server error" });
    }
  }
);

// @router  GET /v1/getSubcategory/:categoryId
// @desc    Get all subcategory by the category id
// @access  Private
router.get("/allSubCategories",
 auth, async (req, res) => {
  try {
    const AllCategories = await SubCategory.find();
    if (AllCategories.length > 0) {
      res
        .status(200)
        .json({ success: true, response: "successful", data: AllCategories });
    } else {
      return res
        .status(400)
        .json({
          success: false,
          response: "error",
          errors: [{ msg: "No record found" }],
        });
    }
  } catch (err) {
    if (err.kind === "ObjectId") {
      res
        .status(404)
        .json({ success: false, response: "error", msg: "Record not found" });
    }
    res
      .status(500)
      .json({
        success: false,
        response: "error",
        errors: [{ msg: "Server Error" }],
      });
  }
});

// @router  GET /v1/getSubcategory/:categoryId
// @desc    Get all subcategory by the category id
// @access  Private
router.get("/allSubCategories/:categoryId",
 auth, async (req, res) => {
  try {
    const AllCategories = await SubCategory.find({
      category_id: req.params.categoryId,
    });
    if (AllCategories.length > 0) {
      res
        .status(200)
        .json({ success: true, response: "successful", data: AllCategories });
    } else {
      return res
        .status(400)
        .json({
          success: false,
          response: "error",
          errors: [{ msg: "No record found" }],
        });
    }
  } catch (err) {
    if (err.kind === "ObjectId") {
      res
        .status(404)
        .json({ success: false, response: "error", msg: "Record not found" });
    }
    res
      .status(500)
      .json({
        success: false,
        response: "error",
        errors: [{ msg: "Server Error" }],
      });
  }
});

// @router  GET /v1/getSubcategory/:categoryId/:subcategory_id
// @desc    Get one subcategory by the category id
// @access  Private
router.get("/SubCategories/:subcategory_id",
 auth, async (req, res) => {
  try {
    const AllCategories = await SubCategory.findById(req.params.subcategory_id);
    if(!AllCategories){
      res
      .status(200)
      .json({ success: false, response: "error", msg: "Record not found" });
    }
    res
      .status(200)
      .json({ success: true, response: "successful", data: AllCategories });
  } catch (err) {
    if (err.kind === "ObjectId") {
      res
        .status(404)
        .json({ success: false, response: "error", msg: "Record not found" });
    }
    res.status(500).json({ success: false, response: "error", msg: "Server error" });
  }
});

// @router  POST/v1/addProduct
// @desc    Add new product ( for data entering test)
// @access  Private
router.post("/addProduct",
  [
    auth,
    [
      check("book_ISBN", "Please add proper ISBN,Containing 10 to 13 digits")
        .trim()
        .isLength({ min: 10, max: 13 }),
      check("book_name", "Please fill the book name field")
        .trim()
        .not()
        .isEmpty(),
      check("book_author", "Please fill the book author name field")
        .trim()
        .not()
        .isEmpty(),
      check("add_publisher", "Please select the publisher method field")
        .not()
        .isEmpty(),
      check("publisher", "Please fill the publisher name field")
        .not()
        .isEmpty(),
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res
        .status(400)
        .json({ success: false, response: "error", errors: errors.array() });
    }

    const {
      category_id,
      subcategory_id,
      book_ISBN,
      book_name,
      book_author,
      add_publisher,
      publisher,
      book_edition,
      publication_year,
      price: [{ cureency_type, discount, origial_price, sale_price }],
      description,
      dimension: [{ length, width, height }],
      miscellaneous: [
        {
          binding,
          min_day,
          max_day,
          Weight,
          condition,
          quantity,
          stock_location,
        },
      ],
    } = req.body;

    try {
      const newAddProduct = await AddProduct({
        category_id,
        subcategory_id,
        book_ISBN,
        book_name,
        book_author,
        add_publisher,
        publisher,
        book_edition,
        publication_year,
        price: [
          {
            cureency_type,
            discount,
            origial_price,
            sale_price,
          },
        ],
        description,
        dimension: [
          {
            length,
            width,
            height,
          },
        ],
        miscellaneous: [
          {
            binding,
            min_day,
            max_day,
            Weight,
            condition,
            quantity,
            stock_location,
          },
        ],
      });
      await newAddProduct.save();
      res
        .status(200)
        .json({
          success: true,
          response: "successful",
          msg: "Product added successfully",
          data: newAddProduct,
        });
    } catch (err) {
      res.status(500).json({ success: false, response: "error", msg: "Server error" });
    }
  }
);

// @router  POST/v1/getProduct
// @desc    get Product by product id and subcategory id ( for data entering test)
// @access  Private
router.get('/getProduct/:category_id',
auth,
async (req,res)=>{
  try {
    const subcategory_id = req.query.subcategory_id;
    const category_id = req.params.category_id;
    
      var AllProducts = !subcategory_id ? 
        await AddProduct.find({category_id:category_id})
        :await AddProduct.find({category_id:category_id,subcategory_id:subcategory_id}); 
        if(!AllProducts){
          res
          .status(200)
          .json({ success: false, response: "error", msg: "Record not found" });
        }
      res
      .status(200)
      .json({ success: true, response: "successful", data:AllProducts });
  } 
  catch (err) {
    console.log(err.message)
    if (err.kind === "ObjectId") {
      res
        .status(404)
        .json({ success: false, response: "error", msg: "Record not found" });
    }
    res.status(500).json({ success: false, response: "error", msg: "Server error" });  
  }
})

// @router  Get/v1/getProductSingle/:product_id
// @desc    get the single product with its details
// @access  Private
router.get('/getProductSingle/:product_id',
auth,
async (req,res)=>{
  try {
   
    const product_id = req.params.product_id;
    
      var AllProducts = await AddProduct.findOne({_id:product_id});
      var rating = await RatingProduct.findOne({product_id:product_id});
      res
      .status(200)
      .json({ success: true, response: "successful", data:{AllProducts,rating} });
  } 
  catch (err) {
    console.log(err.message)
    if (err.kind === "ObjectId") {
      res
        .status(404)
        .json({ success: false, response: "error", msg: "Record not found" });
    }
    res.status(500).json({ success: false, response: "error", msg: "Server error" });  
  }
})

// @router  POST/v1/addWishlist
// @desc    Add to which list for storing the product for later 
// @access  Private
router.post('/wishList',
[auth,[
  check("product","product ID is required").trim().not().isEmpty()
]],
async(req,res)=>{
  const errors =validationResult(req);
  if(!errors.isEmpty()){
    res
        .status(400)
        .json({ success: false, response: "error", errors: errors.array() });
  }
  const {product} = req.body;
  const user_id = req.user.id;
  try {
    const newWishList = new WishList({
      user_detail:user_id,
      product
    });
    await newWishList.save();
    res.status(200).json({success:true,response:"successful",msg:"Product has been successfully added in wishlist", data:newWishList})
  } catch (err) {
    res.status(500).json({success:false,response:"error",error:[{msg:"Server error"}]})
  }
});

// @router  GET/v1/getAllWishList
// @desc    Get all wishlist
// @access  Private
router.get('/getAllWishList',
auth,
async(req,res)=>{
  try {
    const getWishlists = await WishList.find().populate({path:"product",select:["book_name","book_author","price.origial_price","price.sale_price"]})
    // .populate("product") instade of this method i user aggregation method
    //.aggregate([{$project:{product:{"book_name":1,"book_author":1}}}]);
    console.log(getWishlists.length,'getWishlists');
    if(getWishlists && getWishlists.length > 0){
      res.status(200).json({success:true,response:"successful",msg:"Data fetched successfully",data:getWishlists})
    }
    res.status(400).json({success:false,response:"error",errors:[{msg:"No record found"}]}) 
  } catch (err) {
    res.status(500).json({success:false,response:"error",errors:[{msg:"server error"}]}) 
  }
})

// @router  GET/v1/getWishlists
// @desc    Get all wishlist by specifice Product id
// @access  Private
router.get('/getWishList/:wishlist_id',
auth,
async(req,res)=>{
  const wishlist_id = req.params.wishlist_id;
  try {
    const getWishlist = await  WishList.find({wishlist_id:wishlist_id}).populate({path:"product",select:["book_name","book_author","price.origial_price","price.sale_price"]});
      res.status(200).json({success:true,response:"successful",msg:"Data fetched successfully",data:getWishlist})
  } catch (err) {
    res.status(500).json({success:false,response:"error",errors:[{msg:"server error"}]}) 
  }
})

// @router  Delete/v1/deleteWishList/:id
// @desc    Remove the wish list by its Id
// @access  Private
router.delete('/deleteWishList/:wishlist_id',
auth,
async(req,res)=>{
  const wishlist_id = req.params.wishlist_id;
  try {
    await WishList.findByIdAndDelete(wishlist_id);
    res
      .status(200)
      .json({
        success: true,
        response: "successful",
        msg: "Record deleted successfully",
      });
  } catch (err) {
    res.status(500).json({success:false,response:"error",errors:[{msg:"server error"}]}) 
  }
})

// @router  Post/v1/deleteWishList/:id
// @desc    Remove the wish list by its Id
// @access  Private
router.post('/ratingProduct/:product_id',
auth,
async(req,res)=>{
    const product_id = req.params.product_id;
    const user_id = req.user.id;
     const {rating_no,review} = req.body
     try {

      const newRating = new RatingProduct({
        user_id:user_id,
        product_id:product_id,
        review,
        rating_no
      });
      await newRating.save();
    // product_Rating.ratings.unshift({user:req.user.id});
    res.status(200)
    .json({
      success: true,
      response: "successful",
      msg: "Record added successfully",
      data:newRating
    });
  } catch (err) {
    console.error(err)
    res.status(500).json({success:false,response:"error",errors:[{msg:"server error"}]}) 
  }
})

// @router  Post/v1/addToCart/:Product_id
// @desc    Add a product by its ID to cart
// @access  Private
router.post('/addToCart/:Product_id',
auth,
async(req,res)=>{
    const user_id = req.user.id;
    const product_id= req.params.Product_id;

    const {quantity} = req.body;
    try {
      const oldProduct = await AddToCart.findOne({product_id:product_id})
      if(oldProduct){
        res.status(200)
        .json({
          success: false,
          response: "error",
          msg: "Record added already",
        });
      }
      const newCart = new AddToCart({
        user_detail:user_id,
        product:product_id,
        quantity
      })
      await newCart.save();
      res.status(200)
      .json({
        success: true,
        response: "successful",
        msg: "Record added successfully",
        data:newCart
      });
    } catch (err) {
      console.error(err)
      res.status(500).json({success:false,response:"error",errors:[{msg:"server error"}]}) 
    }
});

// @router  Get/v1/getMyCart
// @desc    Show all list of product which is in cart db
// @access  Private
router.get('/getMyCart',
auth,
async(req,res)=>{
  try {
    const allCartList = await AddToCart.find().populate({path:'product',select:["book_name","book_author","price.origial_price","price.sale_price"]});
    if(allCartList.length > 0){
      res.status(200).json({success:true,response:"successful",msg:"Data fetched successfully",data:allCartList})
    }
    res.json({
      success: false,
      status: 0,
      response: "error",
      msg: "No record found",
    });

  } catch (err) {
    res.status(500).json({success:false,response:"error",errors:[{msg:"server error"}]}) 
  }
});

// @router  Put/v1/updateCartProduct/:Product_id
// @desc    Update the quantity of the product
// @access  Private
router.put('/updateCartProduct/:product_id',
auth,
async(req,res)=>{
  const product_id = req.params.product_id;
  const {quantity} = req.body;
  const newQuantity = {}
  if(quantity) newQuantity.quantity = quantity;
  try {
    if(newQuantity){
      await AddToCart.findOneAndUpdate(product_id,
        {$set:newQuantity},
        {new:true}
        );
        res
        .status(200)
        .json({
          success: true,
          response: "successful",
          msg: "Data updated successfully",
        });
      }else{
        res.status(400).json({ msg: "Data not found" });
      }
  } catch (err) {
    res.status(500).json({success:false,response:"error",errors:[{msg:"server error"}]}) 
  }
});

// @router  Delete/v1/deleteCartProduct/:cart_id
// @desc    Delete the quantity of the product
// @access  Private
router.delete('/deleteCartProduct/:id',
auth,
async(req,res)=>{
  try {
    const cart_id= req.params.id;
    await AddToCart.findByIdAndRemove(cart_id);
    res
    .status(200)
    .json({
      success: true,
      response: "successful",
      msg: "Record deleted successfully",
    });
  } catch (err) {
    console.log(err.message);

    if(err.kind === "ObjectId" ){
      res
        .status(404)
        .json({ success: false, response: "error", msg: "Record not found" });
    }
    res.status(500).json({success:false,response:"error",errors:[{msg:"server error"}]});
  }
})







// @router  POST/v1/upload
// @desc    Upload image ( for testing)
// @access  public
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "Images");
    console.log(file, "files desti");
  },
  filename: (req, file, cb) => {
    console.log(file);
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

router.get("/upload", (req, res) => {
  res.json({ msg: "data" });
});

router.post("/upload", upload.single("image"), (req, res) => {
  const file = req.file;
  res.json({ msg: "Image uploaded", data: file });
});

module.exports = router;
