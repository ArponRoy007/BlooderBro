const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  age: { type: Number, required: true },
  gender: { type: String, required: true },
  bloodGroup: { type: String, required: true },
  address: { type: String, required: true },
  pincode: { type: String, required: true },
  
  // ✅ Cleaned up: only one phone, plus countryCode and socialLink
  countryCode: { type: String, required: true }, 
  phone: { type: String, required: true },
  socialLink: { type: String, required: false }, 
  
  isAvailable: { type: Boolean, default: true },
  lastDonation: { type: Date, default: null },
  donationsCount: { type: Number, default: 0 },
  requestsCount: { type: Number, default: 0 },
  
  // ✅ NEW: Tracks exactly who the user donated to
  donationHistory: [{
    patientName: String,
    bloodGroup: String,
    date: { type: Date, default: Date.now }
  }]
});

module.exports = mongoose.model("User", userSchema);