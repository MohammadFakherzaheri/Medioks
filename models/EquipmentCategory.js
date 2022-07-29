const mongoose = require('mongoose');

const AddEquipmentCategorySchema =new mongoose.Schema({
    category_name:{
        type:String,
        require:true
    }
});

module.exports = AddEquipmentCategory = mongoose.model('addEquipmentCategory', AddEquipmentCategorySchema)