import React from "react";

// Bootstrap file
import "bootstrap/dist/css/bootstrap.min.css";

// react router
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";

// component imports
import Layout from "./components/Layout.js";
import Login from "./components/user/Login.js";
import Register from "./components/user/Register.js";
import Dashboard from "./components/dashboard/dashboard";

// css file
import "./App.css";

const App = () => {
  return (
    <Router>
      <Routes>
        <Route exact path="/" element={<Layout />} />
        <Route exact path="/user/login" element={<Login />} />
        <Route exact path="/user/register" element={<Register />} />
        <Route exact path="/dashboard" element={<Dashboard />} />
      </Routes>
    </Router>
  );
};

export default App;
