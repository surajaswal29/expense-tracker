import React, { useState, useEffect } from "react";
import LogoHeader from "../home/LogoHeader";

import ProfileImage from "../../images/profile_user.jpg";

import "./dashboard.css";

const Dashboard = () => {
  const date = new Date();
  const [currentSecond, setCurrentSecond] = useState();

  const currentHour = date.getHours();
  const currentMin = date.getMinutes();

  const weekDay = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  const month = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  useEffect(() => {
    const perSecondDisplay = setInterval(() => {
      setCurrentSecond(date.getSeconds());
    }, 1000);

    return () => clearInterval(perSecondDisplay);
  });

  const moneySpent = 4000;

  const hourFormat = 12;
  let hour = 0;

  if (currentHour > 12) {
    hour = hour + (currentHour % hourFormat);
  } else {
    hour += currentHour;
  }

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
            <div className="dashboard-time-display">
              <h1 className="mb-1">
                {`${hour < 10 ? "0" + hour : hour}:${currentMin}:${
                  currentSecond < 10 ? "0" + currentSecond : currentSecond
                }`}
                <span>{currentHour > 12 ? "PM" : "AM"}</span>
              </h1>
              <h4 className="mb-0">{`${weekDay[date.getDay()]}, ${
                month[date.getMonth()]
              } ${date.getDate()}, ${date.getFullYear()}`}</h4>
            </div>
          </div>
          <div className="col-md-4 p-4">
            <div className="total-money-box">
              <h2 className="mt-3 mb-0">Total Money Spent</h2>
              <h2 className="mb-0">
                {moneySpent.toLocaleString("en-IN", {
                  style: "currency",
                  currency: "INR",
                })}
              </h2>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
