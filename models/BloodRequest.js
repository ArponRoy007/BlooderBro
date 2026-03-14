const mongoose = require("mongoose");

const bloodRequestSchema = new mongoose.Schema({
  requesterId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  fullName: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  bloodGroup: { type: String, required: true },
  pincode: { type: String, required: true },
  message: { type: String },
  urgencyLevel: { type: String, default: "routine" },
  hospitalName: { type: String },
  hospitalAddress: { type: String },
  status: { type: String, default: "Pending" },
  ignoredBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  // NEW: Keeps track of heroes who clicked the "Donated" button!
  claimedDonors: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
}, { timestamps: true });

module.exports = mongoose.model("BloodRequest", bloodRequestSchema);