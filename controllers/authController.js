const User = require("../models/User");
const bcrypt = require("bcryptjs");

// Load Login Page
exports.getLogin = (req, res) => {
  if (req.session.user) return res.redirect("/");
  res.render("auth/login", { title: "Login", css: "login.css" });
};

// Load Register Page
exports.getRegister = (req, res) => {
  if (req.session.user) return res.redirect("/");
  res.render("auth/register", { title: "Register", css: "signup.css" });
};

// Handle Login Submission
exports.postLogin = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.redirect("/login");

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.redirect("/login");

    req.session.user = {
      id: user._id,
      name: user.name,
      email: user.email,
    };
    res.redirect("/");
  } catch (err) {
    console.error(err);
    res.redirect("/login");
  }
};

// Handle Register Submission
exports.postRegister = async (req, res) => {
  const { name, age, gender, address, pincode, bloodGroup, email, phone, facebookLink, password, confirmPassword } = req.body;

  if (password !== confirmPassword) {
    return res.redirect("/register");
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({
      name, age, gender, address, pincode, bloodGroup, email, phone, facebookLink, password: hashedPassword, isAvailable: true,
    });
    res.redirect("/login");
  } catch (err) {
    console.error("Register Error:", err);
    res.redirect("/register");
  }
};

// Handle Password Reset Logic (Forgot Password)
exports.postForgotPassword = async (req, res) => {
    const { email, newPassword, confirmPassword } = req.body;
  
    // 1. Check if passwords match
    if (newPassword !== confirmPassword) {
        return res.redirect("/login");
    }
  
    try {
        // 2. Find the user by their email
        const user = await User.findOne({ email });
        if (!user) {
            return res.redirect("/login"); 
        }
  
        // 3. Hash the NEW password and securely overwrite the old one in the database!
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        
        // 4. Save the erased/updated password to MongoDB
        await user.save(); 
  
        // 5. Send them back to the login page to try their new password
        res.redirect("/login");
    } catch (err) {
        console.error("Password Reset Error:", err);
        res.redirect("/login");
    }
};

// Handle Logout
exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
};