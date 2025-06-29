const jwt = require("jsonwebtoken");
require('dotenv').config(); // 
const mongoose = require("mongoose");
const bcrypt=require("bcryptjs")
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true
  },
  username: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  isadmin: {
    type: Boolean,
    default: false
  },

  
}, {
  timestamps: true
});

userSchema.methods.generatetoken =async function (){
  const token = jwt.sign({userId:this._id,email:this.email,isadmin:this.isadmin},process.env.JWT_SECRET)
return token
}

userSchema.methods.comparepassword=async function(inputpassword){

return bcrypt.compareSync(inputpassword,this.password);
  
}
module.exports = mongoose.model("userschema", userSchema);
