const User = require("../models/User");
const BloodRequest = require("../models/BloodRequest");

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.session.user.id);
    
    // 1. Fetch requests matching the user's blood group and pincode
    let matchedRequests = await BloodRequest.find({
      bloodGroup: user.bloodGroup, 
      pincode: user.pincode, 
      status: "Pending", 
      requesterId: { $ne: user._id },
      ignoredBy: { $ne: user._id } 
    }).populate("requesterId", "facebookLink");

    const urgencyWeight = { emergency: 1, "24hours": 2, routine: 3 };
    matchedRequests.sort((a, b) => (urgencyWeight[a.urgencyLevel] || 4) - (urgencyWeight[b.urgencyLevel] || 4));

    // 2. Fetch the user's active requests (Use .lean() so we can modify the object)
    let myRequests = await BloodRequest.find({ requesterId: user._id, status: "Pending" })
        .populate("claimedDonors", "name")
        .lean(); 

    // 3. THE MAGIC: Find all potential donors for each request, EXCLUDING those who clicked "Can't"
    for (let reqItem of myRequests) {
        const eligibleDonors = await User.find({
            bloodGroup: reqItem.bloodGroup,
            pincode: reqItem.pincode,
            isAvailable: true,
            _id: { $ne: user._id, $nin: reqItem.ignoredBy } // Removes D1 who clicked Can't!
        }).select("name");
        
        reqItem.eligibleDonors = eligibleDonors;
    }

    res.render("profile/profile", { user, matchedRequests, myRequests, title: "My Profile", css: "profile.css" });
  } catch (err) {
    console.error(err);
    res.redirect("/");
  }
};

exports.updateProfile = async (req, res) => {
  const { email, phone, address, pincode } = req.body;
  await User.findByIdAndUpdate(req.session.user.id, { email, phone, address, pincode });
  res.redirect("/profile");
};

exports.deleteProfile = async (req, res) => {
  await User.findByIdAndDelete(req.session.user.id);
  req.session.destroy(() => res.redirect("/register"));
};

exports.logDonation = async (req, res) => {
  try {
    // CHANGED: No free points! We just add them to the "claimedDonors" list.
    await BloodRequest.findByIdAndUpdate(req.params.reqId, {
      $addToSet: { claimedDonors: req.session.user.id }
    });
    res.redirect("/profile");
  } catch (err) {
    console.error(err);
    res.redirect("/profile");
  }
};

// Adds the user to the Ignore List when they click "Can't"
exports.ignoreRequest = async (req, res) => {
  try {
    const BloodRequest = require("../models/BloodRequest");
    
    // $addToSet safely adds the ID to the ignoredBy array without creating duplicates
    await BloodRequest.findByIdAndUpdate(req.params.reqId, {
      $addToSet: { ignoredBy: req.session.user.id } 
    });
    
    // Instantly refreshes the page so the request vanishes
    res.redirect("/profile");
  } catch (err) {
    console.error(err);
    res.redirect("/profile");
  }
};