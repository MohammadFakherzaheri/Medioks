const mongoose = require('mongoose');

const contactUsSchema = new mongoose.Schema({
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'signup'
    },
    name:{
        type:String,
        require:true,
    },
    email:{
        type:String,
        require:true
    },
    contact_no:{
        type:Number,
        require:true
    },
    feedback:{
        type:String,
        require:true
    },
    date:{
        type: Date,
        default: Date.now
    },
});

module.exports = ContactUs = mongoose.model('contactUs',contactUsSchema);