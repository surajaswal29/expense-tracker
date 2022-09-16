import React from "react";
import "./App.css";
import expenses from "../images/expenses.jpg";
import LogoHeader from "./LogoHeader";
import CreditFooter from "./CreditFooter";
import ExpenseImage from "./ExpenseImage";

const App = () => {
  return (
    <React.StrictMode>
      <div className="main-container">
        <LogoHeader />
        <main className="sub-container">
          <ExpenseImage image={expenses} />
          <div className="app-heading">
            <nav className="user-account-buttons">
              <a href="#">Register</a>
              <a href="#">Log in</a>
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
