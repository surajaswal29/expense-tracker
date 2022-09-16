import React from "react";

const ExpenseImage = ({ image }) => {
  return (
    <div className="img-container">
      <img src={image} alt="Expense Image" />
    </div>
  );
};

export default ExpenseImage;
