const User = require("../models/User");
const BloodRequest = require("../models/BloodRequest");
const nodemailer = require("nodemailer");

exports.getRequestForm = (req, res) => {
  res.render("request/request", { title: "Request Blood", css: "request.css" });
};

exports.postRequest = async (req, res) => {
  try {
    // 1. Grab all the new fields from the form
    const { fullName, countryCode, phone, email, bloodGroup, pincode, message, urgencyLevel, hospitalName, hospitalAddress, socialLink } = req.body;

    // 2. The Failsafe: Clean up the numbers
    const cleanCode = countryCode ? countryCode.replace(/\D/g, '') : ''; 
    const cleanPhone = phone ? phone.replace(/\D/g, '') : '';
    const fullWhatsappNumber = cleanCode + cleanPhone; 

    // 3. Save to Database
    await BloodRequest.create({
      requesterId: req.session.user.id, 
      fullName, 
      countryCode: cleanCode, 
      phone: cleanPhone,      
      socialLink,             
      email, 
      bloodGroup, 
      pincode, 
      message, 
      urgencyLevel, 
      hospitalName, 
      hospitalAddress 
    });

    // 4. Increase requestsCount for this user (Removed duplicate User require)
    await User.findByIdAndUpdate(req.session.user.id, { $inc: { requestsCount: 1 } });

    // 5. Find matching donors
    const donors = await User.find({ bloodGroup, pincode, isAvailable: true, _id: { $ne: req.session.user.id } });

    if (donors.length > 0) {
      // (Removed duplicate nodemailer require)
      const transporter = nodemailer.createTransport({
        host: "smtp-relay.brevo.com",
        port: 2525, 
        secure: false, 
        auth: { 
            user: process.env.EMAIL_USER, 
            pass: process.env.EMAIL_PASS 
        },
      });

      const donorEmails = donors.map(d => d.email);

      const mailOptions = {
        from: `"BlooderBro Alerts" <blooderbroofficial@gmail.com>`,
        to: "blooderbroofficial@gmail.com", 
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
            
            <p style="text-align: center; margin-top: 35px; margin-bottom: 15px;">
              <a href="https://wa.me/${fullWhatsappNumber}?text=Hi!%20I%20saw%20your%20urgent%20blood%20request%20on%20BlooderBro.%20I%20want%20to%20help." target="_blank" style="background-color: #25D366; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px rgba(37,211,102,0.3);">
                💬 Message on WhatsApp
              </a>
            </p>
            
            ${socialLink ? `
            <p style="text-align: center; margin-bottom: 25px;">
              <a href="${socialLink}" target="_blank" style="color: #666; font-size: 14px; text-decoration: underline;">
                Or reach out on Facebook/Instagram
              </a>
            </p>
            ` : ''}
            
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
        else console.log("✅ Email sent via Brevo!", info.response);
      });
    }

    res.redirect("/"); 
  } catch (err) {
    console.error("❌ Server Error:", err);
    res.redirect("/");
  }
};

exports.fulfillRequest = async (req, res) => {
  await BloodRequest.findByIdAndUpdate(req.params.id, { status: "Fulfilled" });
  res.redirect("/profile");
};

exports.confirmDonor = async (req, res) => {
  const { reqId, donorId } = req.params;
  try {
    const requestDetails = await BloodRequest.findById(reqId);
    if (requestDetails && requestDetails.status === "Pending") {
      // (Removed duplicate User require)
      await User.findByIdAndUpdate(donorId, {
        $inc: { donationsCount: 1 }, 
        lastDonation: new Date(),
        $push: { donationHistory: { patientName: requestDetails.fullName, bloodGroup: requestDetails.bloodGroup } }
      });
      requestDetails.status = "Fulfilled";
      await requestDetails.save();
    }
    res.redirect("/profile");
  } catch (err) {
    console.error(err);
    res.redirect("/profile");
  }
};