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
          .json({ errors: [{ msg: "Invalid credential" }] });
      }
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res
          .status(400)
          .json({ errors: [{ msg: "Invalid credential" }] });
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
          res.json({ token });
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
          // sgMail.setApiKey(sendGridAPiKey);
          sgMail.setApiKey(process.env.SENDGRID_KEY);
          console.log(personalData, "personalData");
          const msg = {
            to: "mohammadfakher.fresco@gmail.com",
            from: fromEmail,
            subject: "Sending otp",
            text: "and easy to do anywhere, even with Node.js",
            html: "<strong>and easy to do anywhere, even with Node.js</strong>",
            // templateId:forgotPasswordTemplateId,
            // dynamicTemplateData:{
            //     subject:"Forgot Password",
            //     otp:passwordObject.otp
            // },
          };

          sgMail.send(msg, (err, result) => {
            if (err) {
              console.log(err);
            } else {
              console.log("Send email to user done!");
              console.log(result);
              return res.json({
                success: true,
                response: "successful",
                msg: "Please check your email for OTP verification",
                data: {
                  id: user.id,
                  email: email,
                },
              });
            }
          });
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
    var err = [];
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

// @route    POST /v1/profile/editProfile
// @desc     Edit the profile of user
// @access   Private
router.put("/profile/editProfile",
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
      res.status(500).json({ msg: "Server Error" });
    }
  }
);

// @route    POST /v1/getProfile
// @desc     Show the user detials
// @access   Private
router.get("/profile/getProfile",
 auth, async (req, res) => {
  try {
    const userDetials = await SignUp.findById(req.user.id).select("-password");
    res
      .status(200)
      .json({ success: true, response: "successful", data: userDetials });
  } catch (err) {
    console.log(err.message);
    res.status(500).json({ msg: "Server error" });
  }
});

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
      res.status(500).json({ msg: "Server Error" });
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
    res.status(500).json({ msg: "Server Error" });
  }
});

// @route    GET /v1/getDelivaryAddress/:id
// @desc     Get delivery address of user by delivery id
// @access   Private
router.get("/getDeliveryAddress/:id",
 auth, async (req, res) => {
  const deli_id = req.params.id;
  try {
    const userDeliveryAddress = await DeliveryAddress.findById(deli_id);
    res
      .status(200)
      .json({
        success: true,
        response: "successful",
        msg: "Data fetched successfully",
        data: userDeliveryAddress,
      });
  } catch (err) {
    if (err.kind === "ObjectId") {
      res
        .status(404)
        .json({ success: false, response: "error", msg: "Date not found" });
    }
    res.status(500).json({ msg: "Server Error" });
  }
});

// @route    POST /v1/contact_us
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
        res.status(500).json({ msg: "Server Error" });
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

// @route    DELETE /v1/deleteDeliveryAddres/:id
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
    res.status(500).json({ msg: "server error" });
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
      res.status(500).json({ msg: "Server Error" });
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
      res.status(500).json({ msg: "Server Error" });
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
      res.status(500).json({ msg: "Server Error" });
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
    res.status(500).json({ msg: "Server Error" });
  }
});

// @router  GET /v1/category/:id
// @desc    Get category by its id
// @access  Private
router.get("/category/:id",
 auth, async (req, res) => {
  const category_id = req.params.id;
  try {
    const categoryById = await AddCategory.findById(category_id);
    res
      .status(200)
      .json({ success: true, response: "successful", data: categoryById });
  } catch (err) {
    if (err.kind === "ObjectId") {
      res
        .status(404)
        .json({ success: false, response: "error", msg: "Record not found" });
    }
    res.status(500).json({ msg: "Server Error" });
  }
});

//  @Router  POST/v1/addSubcategory
//  @desc    Add subcategory alone with category
//  @access  Private
router.post(
  "/addSubcategory",
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
      res.status(500).json({ msg: "Server Error" });
    }
  }
);

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

    res
      .status(200)
      .json({ success: true, response: "successful", data: AllCategories });
  } catch (err) {
    if (err.kind === "ObjectId") {
      res
        .status(404)
        .json({ success: false, response: "error", msg: "Record not found" });
    }
    res.status(500).json({ msg: "Server Error" });
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
      res.status(500).json({ msg: "Server Error" });
    }
  }
);

// @router  POST/v1/getProduct
// @desc    get Product by product id and subcategory id ( for data entering test)
// @access  Private
// router.get('/getProduct')
























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
