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
        required:true
    },
    date_of_brith:{
        type:Date,
        required:true
    },
    residence_city:{
        type:String,
        required:true
    },
    college_name:{
        type:String,
        required:true
    },
    course_name:{
        type:String,
        required:true
    },
    course_year:{
        type:String,
        required:true
    }
   
});

module.exports = SignUp = mongoose.model('signup',SignUpSchema)