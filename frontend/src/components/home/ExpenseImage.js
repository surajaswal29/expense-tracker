import React from "react";

const ExpenseImage = ({ image }) => {
  return (
    <div className="img-container">
      <img src={image} alt="Expense" />
    </div>
  );
};

export default ExpenseImage;
