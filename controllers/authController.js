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
  // 1. Grab all the new international fields
  const {
    name,
    email,
    password,
    confirmPassword,
    age,
    gender,
    bloodGroup,
    address,
    pincode,
    countryCode,
    phone,
    socialLink,
  } = req.body;

  if (password !== confirmPassword) {
    return res.redirect("/register");
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // 2. Save exactly what matches your updated User Model
    await User.create({
      name,
      email,
      password: hashedPassword,
      age,
      gender,
      bloodGroup,
      address,
      pincode,
      countryCode, // ✅ Correctly saving country code
      phone,       // ✅ Correctly saving phone
      socialLink,  // ✅ Correctly saving backup link
      isAvailable: true,
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

  if (newPassword !== confirmPassword) {
    return res.redirect("/login");
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.redirect("/login");
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;

    await user.save();
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