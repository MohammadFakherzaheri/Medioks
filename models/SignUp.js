const mongoose = require('mongoose');

const SignUpSchema = new mongoose.Schema({
    name:{
        type:String,
        require:true
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
    }

   
});

module.exports = SignUp = mongoose.model('signup',SignUpSchema)