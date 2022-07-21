const bcrypt = require("bcryptjs/dist/bcrypt");
const express = require('express');
const config = require('config');
const avatar = require('gravatar');
const jwt = require('jsonwebtoken');
const router = express.Router();
const {check, validationResult, Result} = require('express-validator');
const sendGridAPiKey = process.env.SENDGRID_KEY;
const sgMail = require('@sendgrid/mail');
const fromEmail = process.env.FROM_EMAIL;
const forgotPasswordTemplateId = process.env.FORGOTPASSWORD_TEMPLATEID;

// models rout
const SignUp = require("../models/SignUp");
const auth = require('../middleware/auth');
const DeliveryAddress = require('../models/Delivery')






// @Rout POST /api/signUp
// @desc Register User
// @access Public

router.post("/signUp",
    [
        check('name','Name is required').trim().not().isEmpty(),
        check('email','Email is required').isEmail(),
        check('password','Please add a password with 6 or more characters').isLength({min:6})
    ],
    async(req,res)=>{
   
            const errors = validationResult(req)
            if(!errors.isEmpty()){
                return res.status(400).json({success:false,response:'error',errors:errors.array()});
            }
           
            const {name,email,password} = req.body;

            try {

            // check the avater of email if any
            const avatarURL = avatar.url(email,{
                s:200,
                r:'pg',
                d:'mm'
            });

            const newSignUp = new SignUp({
                name,
                email,
                avatar:avatarURL,
                password
            });
            
            // decrypt the password
            const salt = await bcrypt.genSalt(10);
            newSignUp.password = await bcrypt.hash(password,salt)
            await newSignUp.save();
            res
                .status(200)
                .json({msg:'User registered successfully',success:true,response:'successful',data:newSignUp})
        } catch (err) {
            res
        .status(500)

        .json({
          errors: [{ msg: "Server error", param: "server", location: "body" }],
        });
        }
    }
)

// @Rout POST /api/login
// @desc login details
// @access Public
router.post('/login',
[
    check('email','Email is required').isEmail(),
    check('password','Password is required').exists(),
],
async (req,res)=>{
    let errors = validationResult(req);
    if(!errors.isEmpty()){
        return res.status(400).json({success:false,response:'error',errors:errors.array()});
    }
    const {email,password} = req.body;
    try {
        let user = await SignUp.findOne({email})
        if(!user){
            return res.status(400).json({errors:[{msg:'Invalid credential'}]})
        }
        const isMatch= await bcrypt.compare(password,user.password)
        if(!isMatch){
            return res.status(400).json({errors:[{msg:'Invalid credential'}]})
        }

        //Generate Token

        const payload = {
            user:{
                id:user.id
            }
        };

        jwt.sign(
            payload,
            config.get('tokeSecret'),
            {expiresIn:3600000},
            (err,token)=>{
                if(err) throw err;
                res.json({token})
            }
        )

    } catch (error) {
        res
        .status(500)
        .json({
          errors: [{ msg: "Server error", param: "server", location: "body" }],
        });
    }
}
)

// @Rout POST /api/forgotPassword
// @desc Forgot password api
// @access Public
router.post('/forgotPassword',
[
    check('email','Please add valid email').isEmail()
],async (req,res)=>{
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        return res.status(400).json({success: false, errors: errors.array()});
    }
    const {email} = req.body;
    try{
        let user = await SignUp.findOne({email})
        if(!user){
            return res.status(400).json({success:false,response:'error',errors:[{msg:'Please include registerd email'}]});
        }else{
            let email_varification_code = Math.floor( 100000 + Math.random() * 900000);
            let otp_expired = new Date();
            otp_expired.setMinutes(otp_expired.getMinutes() + 5);
            const passwordObject = {};
            passwordObject.otp_expired = otp_expired;
            passwordObject.otp = email_varification_code;
            console.log(passwordObject.otp,'otp');
            passwordObject.updated_at = new Date();
            try {
                let personalData = {};
                personalData = await SignUp.findOneAndUpdate(
                    {_id: user._id},
                    {$set:passwordObject}
                );
                // sgMail.setApiKey(sendGridAPiKey);
                sgMail.setApiKey(process.env.SENDGRID_KEY);
                console.log(personalData,'personalData')
                const msg={
                    to:'mohammadfakher.fresco@gmail.com',
                    from:fromEmail,
                    subject: 'Sending otp',
                    text: 'and easy to do anywhere, even with Node.js',
                    html: '<strong>and easy to do anywhere, even with Node.js</strong>',
                    // templateId:forgotPasswordTemplateId,
                    // dynamicTemplateData:{
                    //     subject:"Forgot Password",
                    //     otp:passwordObject.otp
                    // },
                };

                sgMail.send(msg,(err,result)=>{
                    if (err) {
                        console.log(err);
                      }else{
                          console.log('Send email to user done!');
                          console.log(result);
                          return res.json({
                              success:true,
                              response:'successful',
                              msg:'Please check your email for OTP verification',
                              data:{
                                  id:user.id,
                                  email:email
                              }
                          })
                      }
                })
            } catch (error) {
                console.error(error.message);
                res.status(500).send("Server Error 1");
            }
        }

    }
    catch(error){
        console.error(error.message);
        res.status(500).send("Server Error2");
    }
})

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

// @route    POST /v1/deliveryAddress
// @desc     Add delivery address to the user profile
// @access   Private
router.post('/deliveryAddress',
[auth,
[
    check('name','Name field is required').trim().not().isEmpty(),
    check('address','Address field is required').trim().not().isEmpty(),
    check('city','City field is required').trim().not().isEmpty(),
    check('zipcode','Zipcode must be includ 6 digit number').isLength({min:6,max:6,}),
    check('contact_no','Please add a valid number').isLength({min:10,max:14}),
]],
async(req,res)=>{
    const errors=validationResult(req);
    if(!errors.isEmpty()){
        return res.status(400).json({success:false,response:'error',errors:errors.array()});
    }
    const {name,address,city,zipcode,contact_no} = req.body;
    
    // build a newObject the address for user
    const deliveryAddress = {};
          deliveryAddress.user = req.user.id;
          console.log(deliveryAddress,'deliveryAddress');

          // check whether we have delivery address or not if we have then update otherwise add

          if(name) deliveryAddress.name = name;
          if(address) deliveryAddress.address = address;
          if(city) deliveryAddress.city = city;
          if(zipcode) deliveryAddress.zipcode = zipcode;
          if(contact_no) deliveryAddress.contact_no = contact_no;

          try {
              let deliveryAdd = await DeliveryAddress.findOne({user:req.user.id});
              console.log(deliveryAdd,'deliveryAdd')
                if(deliveryAdd){
                    let deliveryAdd = await DeliveryAddress.findOneAndUpdate(
                      {user:req.user.id},
                      {$set:deliveryAddress},
                      {new:true})
                      return console.log(deliveryAdd,'dev added 2')
                }
                // save the data to the db
                deliveryAdd = new DeliveryAddress(deliveryAddress)
                await deliveryAdd.save();
                res.status(200).json({success:true, response:'successful',data:deliveryAdd})
          } catch (err) {
            console.log(err.message);
            res.status(500).json({msg:"Server Error"})
          }
}
)
module.exports = router;
