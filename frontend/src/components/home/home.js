import React from "react";

// Main Image
import expenses from "../../images/expenses1.png"; //banner image
//Header Logo
import LogoHeader from "./LogoHeader";
//Credit Footer
import CreditFooter from "./CreditFooter";
//expense image
import ExpenseImage from "./ExpenseImage";

// React Router DOM
import { Link } from "react-router-dom";

// css file
import "./home.css";

const Home = () => {
  return (
    <React.StrictMode>
      <div className="main-container">
        <LogoHeader />
        <main className="sub-container">
          <ExpenseImage image={expenses} />
          <div className="app-heading">
            <nav className="user-account-buttons">
              <Link to={"/user/register"}>
                <button>Register</button>
              </Link>

              <Link to={"/user/login"}>
                <button>Log in</button>
              </Link>
            </nav>

            <h1>Manage Your Expenses</h1>
            <span>Expenzie - An Expense Tracker App</span>
          </div>
        </main>
        <CreditFooter />
      </div>
    </React.StrictMode>
  );
};

export default Home;
