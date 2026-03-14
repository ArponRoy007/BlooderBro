const User = require("../models/User");
const BloodRequest = require("../models/BloodRequest");
const nodemailer = require("nodemailer");

exports.getRequestForm = (req, res) => {
  res.render("request/request", { title: "Request Blood", css: "request.css" });
};

exports.postRequest = async (req, res) => {
  const { fullName, phone, email, bloodGroup, pincode, message, urgencyLevel, hospitalName, hospitalAddress } = req.body;

  // Save to Database
  await BloodRequest.create({
    requesterId: req.session.user.id, fullName, phone, email, bloodGroup, pincode, message, urgencyLevel, hospitalName, hospitalAddress 
  });

  // Increase requestsCount for this user
  await User.findByIdAndUpdate(req.session.user.id, { $inc: { requestsCount: 1 } });

  // Get the requester's info to put their Facebook link in the email
  const requester = await User.findById(req.session.user.id);
  const requesterFbLink = requester.facebookLink;

  // Find matching donors
  const donors = await User.find({ bloodGroup, pincode, isAvailable: true, _id: { $ne: req.session.user.id } });

  if (donors.length > 0) {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });

    const donorEmails = donors.map(d => d.email);

    const mailOptions = {
      from: `"BlooderBro Alerts" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER, 
      bcc: donorEmails, 
      subject: `🚨 URGENT: ${bloodGroup} Blood Needed at ${hospitalName || "a nearby hospital"}!`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 25px; border: 1px solid #eaeaea; border-radius: 12px; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <h2 style="color: #e63946; text-align: center;">🚨 URGENT BLOOD REQUEST 🚨</h2>
          <p style="font-size: 16px; color: #333;">Hello Hero,</p>
          <p style="font-size: 16px; color: #333;">A patient named <strong>${fullName}</strong> urgently needs <strong>${bloodGroup}</strong> blood at <strong>${hospitalName || "a nearby hospital"}</strong>.</p>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #e63946;">
            <p><strong>Hospital:</strong> ${hospitalName || "Not specified"}</p>
            <p><strong>Area Pincode:</strong> ${pincode}</p>
            <p><strong>Urgency:</strong> <span style="color: #e63946; font-weight: bold; text-transform: uppercase;">${urgencyLevel}</span></p>
          </div>
          
          <p style="text-align: center; margin-top: 35px; margin-bottom: 25px;">
            <a href="${requesterFbLink}" target="_blank" style="background-color: #e63946; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px rgba(230,57,70,0.2);">
              Click Here to Connect & Donate
            </a>
          </p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin-top: 30px;">
          <p style="color: #999; font-size: 12px; text-align: center; line-height: 1.5;">
            You are receiving this alert because you registered as a lifesaver on BlooderBro.<br>
            © 2026 BlooderBro. All rights reserved.
          </p>
        </div>
      `
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) console.error("❌ Error sending email:", error);
      else console.log("✅ Email sent!");
    });
  }

  res.redirect("/"); 
};

exports.fulfillRequest = async (req, res) => {
  await BloodRequest.findByIdAndUpdate(req.params.id, { status: "Fulfilled" });
  res.redirect("/profile");
};

// NEW: Requester confirms a specific donor gave blood!
exports.confirmDonor = async (req, res) => {
  const { reqId, donorId } = req.params;
  
  try {
    const requestDetails = await BloodRequest.findById(reqId);
    
    if (requestDetails && requestDetails.status === "Pending") {
      // 1. Give the verified donor the points and update their history
      const User = require("../models/User");
      await User.findByIdAndUpdate(donorId, {
        $inc: { donationsCount: 1 }, 
        lastDonation: new Date(),
        $push: { donationHistory: { patientName: requestDetails.fullName, bloodGroup: requestDetails.bloodGroup } }
      });
      
      // 2. Mark the request as Fulfilled so it disappears from everyone else's screen
      requestDetails.status = "Fulfilled";
      await requestDetails.save();
    }
    res.redirect("/profile");
  } catch (err) {
    console.error(err);
    res.redirect("/profile");
  }
};