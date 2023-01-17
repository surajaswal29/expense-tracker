import React from "react";
import LogoHeader from "../home/LogoHeader";

import ProfileImage from "../../images/profile_user.jpg";

import "./dashboard.css";

const Dashboard = () => {
  return (
    <>
      <LogoHeader />
      <div className="container-fluid">
        <div className="row mt-5">
          <div className="col-md-3 p-4">
            <div className="profile-box">
              <div className="profile-icon">
                <img src={ProfileImage} alt="Profile Icon" />
              </div>
              <h4 className="mt-3 mb-0 text-center">Suraj Udai Aswal</h4>
              <p className="text-center text-secondary">Student</p>
            </div>
          </div>
          <div className="col-md-5 p-4">
            <div className="dashboard-time-display"></div>
          </div>
          <div className="col-md-4 p-4">
            <div className="total-money-box">
              <h2 className="mt-3 mb-0 text-center">Total Money Spent</h2>
              <p className="text-center text-secondary">Student</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
