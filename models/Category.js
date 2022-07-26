const mongoose = require('mongoose');

const AddCategorySchema =new mongoose.Schema({
    category_name:{
        type:String,
        require:true
    }
});

module.exports = AddCategory = mongoose.model('addcategory', AddCategorySchema)