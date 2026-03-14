const User = require("../models/User");
const Review = require("../models/Review");

exports.getIndex = async (req, res) => {
  try {
    const topDonor = await User.findOne({ donationsCount: { $gt: 0 } }).sort({ donationsCount: -1 });
    const topNeeder = await User.findOne({ requestsCount: { $gt: 0 } }).sort({ requestsCount: -1 });
    const reviews = await Review.find().sort({ createdAt: -1 });

    res.render("index", { title: "BlooderBro - Home", css: "index.css", topDonor, topNeeder, reviews });
  } catch (err) {
    res.render("index", { title: "Home", css: "index.css", topDonor: null, topNeeder: null, reviews: [] });
  }
};

exports.postReview = async (req, res) => {
  const { rating, text } = req.body;
  await Review.create({ userId: req.session.user.id, userName: req.session.user.name, rating: parseInt(rating), text });
  res.redirect("/");
};

exports.deleteReview = async (req, res) => {
  await Review.findOneAndDelete({ _id: req.params.id, userId: req.session.user.id });
  res.redirect("/");
};