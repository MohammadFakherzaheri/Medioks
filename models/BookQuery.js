const mongoose = require('mongoose');

const BookQuerySchema = new mongoose.Schema({
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'signup'
    },
    name:{
        type:String,
        require:true
    },
    email:{
        type:String,
        require:true
    },
    contact_no:{
        type:Number,
        require:true
    },
    book_name:{
        type:String,
        require:true
    },
    book_publisher:{
        type:String,
        require:true
    },
    book_author:{
        type:String,
        require:true
    },
    book_edition:{
        type:String,
        require:true
    },
    book_ISBN:{
        type:Number,
        require:true
    },
    date:{
        type: Date,
        default: Date.now
    },
});

module.exports = BookQuery = mongoose.model('bookQuery',BookQuerySchema)