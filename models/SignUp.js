const mongoose = require('mongoose');

const SignUpSchema = new mongoose.Schema({
    name:{
        type:String,
        require:true
    },
    last_name:{
        type:String
    },
    email:{
        type:String,
        require:true,
        unique:true
    },
    password:{
        type:String,
        require:true
    },
    avatar:{
        type:String
    },
    date:{
        type: Date,
        default: Date.now
    },
    otp_expired:{
        type:Date
    },
    otp:{
        type:Number
    },
    updated_at:{
        type:Date
    },
    otp_token:{
        type:String
    },
    contact_no:{
        type:Number,
        
    },
    date_of_brith:{
        type:Date,
     
    },
    residence_city:{
        type:String,
   
    },
    college_name:{
        type:String,
       
    },
    course_name:{
        type:String,
       
    },
    course_year:{
        type:String,
        
    },
    updated_at: {
        type: Date
      }
});

module.exports = SignUp = mongoose.model('signup',SignUpSchema)