import React from "react";
import "./App.css";
import expenses from "../images/expenses.jpg";

const App = () => {
  return (
    <React.StrictMode>
      <div className="main-container">
        <header className="logo-header">
          <h1>Expenzie</h1>
        </header>
        <main className="sub-container">
          <div className="img-container">
            <img src={expenses} alt="" srcset="" />
          </div>
          <div className="app-heading">
            <nav className="user-account-buttons">
              <a href="#">Register</a>
              <a href="#">Log in</a>
            </nav>

            <h1>Manage Your Expenses</h1>
            <span>Expenzie - An Expense Tracker App</span>
          </div>
        </main>
        <footer className="credit">
          Designed & Developed with &nbsp;
          <span style={{ color: "red" }}> ❤ </span>&nbsp; by&nbsp;
          <a
            href="https://surajaswal.dev"
            style={{ textDecoration: "none", fontWeight: "bold" }}
          >
            Suraj Aswal
          </a>
        </footer>
      </div>
    </React.StrictMode>
  );
};

export default App;
