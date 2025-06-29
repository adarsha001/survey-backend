const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  // Get token from Authorization header
  const authHeader = req.header("Authorization");
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ 
      success: false,
      message: "Authorization token required" 
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Attach user to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      isadmin: decoded.isadmin
    };
    
    next();
  } catch (err) {
    return res.status(401).json({ 
      success: false,
      message: "Invalid or expired token" 
    });
  }
};