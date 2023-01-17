import React, { useState } from "react";
import LogoHeader from "../home/LogoHeader";

import { Link } from "react-router-dom";

// CSS file
import "./user.css";

// // images
// import Facebook from "./images/fb.png";
// import Google from "./images/google.png";
// import Linkedin from "./images/linkedin.png";
// import Twitter from "./images/twitter.png";

const Register = () => {
  const [uname, setUname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const registerHandler = (e) => {
    e.preventDefault();
    console.log(uname, email, password);
    const myData = new FormData();

    myData.set("uname", uname);
    myData.set("email", email);
    myData.set("password", password);

    const userData = [...myData];
    console.log(userData);
    localStorage.setItem("userData", JSON.stringify(userData));

    alert("user registered");
  };

  return (
    <>
      <LogoHeader />
      <div className="box">
        <span className="login-heading">Create an account</span>
        <form onSubmit={registerHandler} encType="multipart/form-data">
          <label htmlFor="uname">Full Name</label>
          <input
            type="text"
            name="uname"
            id="uname"
            placeholder="Enter full name"
            className="input-box"
            value={uname}
            onChange={(e) => setUname(e.target.value)}
          />
          <label htmlFor="email">Email Address</label>
          <input
            type="email"
            name="email"
            id="email"
            placeholder="Enter email address"
            className="input-box"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <label htmlFor="password">Password</label>
          <input
            type="password"
            name="password"
            id="password"
            placeholder="Enter Password"
            className="input-box"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {/* <div className="error">
            <span>Incorrect email or password</span>
          </div> */}

          <button type="submit" className="btn">
            Register
          </button>
        </form>
        <div className="create-account-box reg-cab">
          Already had an account? &nbsp;
          <Link to={"/user/login/"}>Login</Link>
        </div>
      </div>
    </>
  );
};

export default Register;
