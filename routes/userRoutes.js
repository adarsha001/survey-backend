const express = require("express");
const router = express.Router();
const bcrypt=require("bcryptjs")
const userSchema = require("../models/User");

const authMiddleware = require("../middleware/authMiddleware");
// const userschema = require("../models/userschema");
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const hashedpassword = bcrypt.hashSync(password);

    const user = new userSchema({ username, email, password: hashedpassword });
    await user.save();

    const token = await user.generatetoken(); // ✅ use instance method

    console.log("User saved successfully");
    res.status(200).json({
      user,
      msg: "User created",
      token,
      userId: user._id.toString(),
    });
  } catch (error) {
    console.error("Error saving user:", error.message);
    res.status(400).json({ message: "User already exists or invalid input" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const checkuser = await userSchema.findOne({ email });
    if (!checkuser) {
      return res.status(400).json({ message: "User not registered" });
    }

    const passwordcheck = await checkuser.comparepassword(password);
    if (!passwordcheck) {
      return res.status(400).json({ message: "Invalid password" });
    }

    // Optional: increment login count
    checkuser.loginCount += 1;
    await checkuser.save();

    const token = await checkuser.generatetoken();

    const { password: _, ...others } = checkuser._doc;
    res.status(200).json({
      message: "Login successful",
      user: others,
      token,
      totalLogins: checkuser.loginCount
    });

  } catch (error) {
    console.error("Login error:", error.message);
    res.status(400).json({ message: "Invalid input" });
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
