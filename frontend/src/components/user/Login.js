import React, { useState } from "react";
import LogoHeader from "../home/LogoHeader";

import { Link, useNavigate } from "react-router-dom";

// CSS file
import "./user.css";

// images
// import Facebook from "./images/fb.png";
// import Google from "./images/google.png";
// import Linkedin from "./images/linkedin.png";
// import Twitter from "./images/twitter.png";

const Login = () => {
  const navigate = useNavigate();

  const userData = JSON.parse(localStorage.getItem("userData"));
  console.log(userData[0][1]);

  // const demoEmail = "chrispine@gmail.com";
  // const demoPassword = "Abc@123";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  console.log(email, password);
  const loginHandler = (e) => {
    e.preventDefault();

    if (email === userData[1][1] && password === userData[2][1]) {
      navigate("/dashboard");
    } else {
      alert("Incorrect email or password");
    }
  };

  // useEffect(() => {
  //   console.log(errorMsg);
  // }, [errorMsg]);

  return (
    <>
      <LogoHeader />
      <div className="box">
        <span className="login-heading">Login to your account</span>
        <form onSubmit={loginHandler}>
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
            <span>{errorMsg}</span>
          </div> */}
          <div className="forget">
            <label className="checkbox-label">
              <input type="checkbox" />
              <span className="checkbox-custom "></span>
              <span className="label-text">Remember me</span>
            </label>
            <span className="fg">
              <a href="/forgot"> Forget password?</a>
            </span>
          </div>
          <button type="submit" className="btn">
            Sign In
          </button>
        </form>
        {/* <span className="option">or sign in with</span>
        <div className="social">
          <div className="box-radius">
            <img src={Facebook} alt="Social Icons" />
          </div>
          <div className="box-radius">
            <img src={Google} alt="Social Icons" />
          </div>
          <div className="box-radius">
            <img src={Linkedin} alt="Social Icons" />
          </div>
          <div className="box-radius">
            <img src={Twitter} alt="Social Icons" />
          </div>
        </div> */}
        <div className="create-account-box reg-cab">
          New to Expenzie? &nbsp;
          <Link to={"/user/register/"}>Create an account</Link>
        </div>
      </div>
    </>
  );
};

export default Login;
