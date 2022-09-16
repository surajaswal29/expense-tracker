import React from "react";
import "./App.css"; //style file
import expenses from "../images/expenses.jpg"; //banner image
import LogoHeader from "./LogoHeader"; //Header Logo
import CreditFooter from "./CreditFooter"; //Credit Footer
import ExpenseImage from "./ExpenseImage"; //expense image

const App = () => {
  return (
    <React.StrictMode>
      <div className="main-container">
        <LogoHeader />
        <main className="sub-container">
          <ExpenseImage image={expenses} />
          <div className="app-heading">
            <nav className="user-account-buttons">
              <button href="#">Register</button>
              <button href="#">Log in</button>
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

export default App;
