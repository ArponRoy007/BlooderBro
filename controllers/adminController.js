const User = require("../models/User");
const BloodRequest = require("../models/BloodRequest");

exports.getLogin = (req, res) => {
  res.render("admin/login", { title: "Admin Access", css: "login.css" });
};

exports.postLogin = (req, res) => {
  const { email, password } = req.body;
  // Hardcoded official credentials for investor pitches
  if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
      req.session.isAdmin = true;
      res.redirect("/admin/dashboard");
  } else {
      res.redirect("/admin/login");
  }
};

exports.getDashboard = async (req, res) => {
  if (!req.session.isAdmin) return res.redirect("/admin/login");

  try {
      const totalUsers = await User.countDocuments();
      const totalRequests = await BloodRequest.countDocuments();
      
      const donationData = await User.aggregate([{ $group: { _id: null, total: { $sum: "$donationsCount" } } }]);
      const totalDonations = donationData.length > 0 ? donationData[0].total : 0;

      const topRegions = await User.aggregate([
          { $group: { _id: "$address", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 3 }
      ]);

      // ==========================================
      // DYNAMIC CHART DATA LOGIC
      // ==========================================
      
      // 1. Daily Requests (Last 7 Days)
      const last7DaysLabels = [];
      const last7DaysData = [0, 0, 0, 0, 0, 0, 0];
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      
      for(let i=6; i>=0; i--) {
          let d = new Date();
          d.setDate(d.getDate() - i);
          last7DaysLabels.push(dayNames[d.getDay()]);
      }

      const allRequests = await BloodRequest.find({});
      allRequests.forEach(req => {
          const date = req.createdAt || req._id.getTimestamp();
          const now = new Date();
          const diffTime = now.getTime() - date.getTime();
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)); 
          
          if(diffDays >= 0 && diffDays < 7) {
              const index = 6 - diffDays;
              last7DaysData[index]++;
          }
      });

      // 2. User Growth (Last 6 Months Cumulative)
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const last6MonthsLabels = [];
      const newUsersPerMonth = [0, 0, 0, 0, 0, 0];
      
      for (let i = 5; i >= 0; i--) {
          const d = new Date();
          d.setMonth(d.getMonth() - i);
          last6MonthsLabels.push(monthNames[d.getMonth()]);
      }

      const allUsers = await User.find({});
      let baseUsers = 0; 

      allUsers.forEach(user => {
          const date = user.createdAt || user._id.getTimestamp();
          const now = new Date();
          const diffMonths = (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth());
          
          if (diffMonths > 5) {
              baseUsers++;
          } else if (diffMonths >= 0 && diffMonths <= 5) {
              const index = 5 - diffMonths;
              newUsersPerMonth[index]++;
          }
      });

      const cumulativeUserData = [];
      let currentSum = baseUsers;
      for(let i=0; i<6; i++) {
          currentSum += newUsersPerMonth[i];
          cumulativeUserData.push(currentSum);
      }

      res.render("admin/dashboard", {
          totalUsers,
          totalRequests,
          totalDonations,
          topRegions,
          last7DaysLabels: JSON.stringify(last7DaysLabels),
          last7DaysData: JSON.stringify(last7DaysData),
          last6MonthsLabels: JSON.stringify(last6MonthsLabels),
          cumulativeUserData: JSON.stringify(cumulativeUserData)
      });
  } catch (err) {
      console.error(err);
      res.send("Error loading dashboard data.");
  }
};

exports.logout = (req, res) => {
  req.session.isAdmin = false;
  res.redirect("/admin/login");
};