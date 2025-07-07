const jwt = require("jsonwebtoken");
require('dotenv').config(); 
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/\S+@\S+\.\S+/, "Please enter a valid email address"]
  },
  username: {
    type: String,
    required: [true, "Username is required"],
    minlength: [3, "Username must be at least 3 characters long"],
    maxlength: [30, "Username must be at most 30 characters"],
    trim: true
  },
  password: {
    type: String,
    required: [true, "Password is required"],
    minlength: [6, "Password must be at least 6 characters long"]
  },
  isadmin: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// ✅ Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// ✅ JWT Token Method
userSchema.methods.generatetoken = async function () {
  return jwt.sign(
    { userId: this._id, email: this.email, isadmin: this.isadmin },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

// ✅ Password Compare Method
userSchema.methods.comparepassword = async function (inputpassword) {
  return bcrypt.compare(inputpassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
