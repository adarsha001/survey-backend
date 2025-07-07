const express = require("express");
const router = express.Router();
const bcrypt=require("bcryptjs")
const userSchema = require("../models/User");

const authMiddleware = require("../middleware/authMiddleware");
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const user = new userSchema({ username, email, password });
    await user.save();

    const token = await user.generatetoken();

    res.status(200).json({
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        isadmin: user.isadmin
      },
      msg: "User created",
      token
    });
  } catch (error) {
    console.error("Error saving user:", error.message);

    // Handle validation errors
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ message: errors.join(", ") });
    }

    // Handle duplicate email
    if (error.code === 11000 && error.keyPattern?.email) {
      return res.status(400).json({ message: "Email already exists" });
    }

    res.status(500).json({ message: "Server error. Please try again later." });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const checkuser = await userSchema.findOne({ email });
    if (!checkuser) {
      return res.status(400).json({ message: "User not registered" });
    }

    const passwordcheck = await checkuser.comparepassword(password);
    if (!passwordcheck) {
      return res.status(400).json({ message: "Invalid password" });
    }

    const token = await checkuser.generatetoken();
    const { password: _, ...others } = checkuser._doc;

    res.status(200).json({
      message: "Login successful",
      user: others,
      token
    });

  } catch (error) {
    console.error("Login error:", error.message);
    res.status(500).json({ message: "Server error during login" });
  }
});


router.get("/me", authMiddleware, async (req, res) => {
  try {
    // req.user is available from the auth middleware
    const user = await userSchema.findById(req.user.userId).select("-password");
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        username: user.username
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
