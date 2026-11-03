const express = require("express");
const { validate } = require("../middleware/validate");
const { employeeCreate, employeeUpdate } = require("../validation/schemas");

const router = express.Router();

const {
  createEmployee,
  getEmployees,
  updateEmployee,
  deleteEmployee,
} = require("../controllers/employeeController");

router.post("/employees", validate(employeeCreate), createEmployee);
router.get("/employees", getEmployees);
router.put("/employees/:id", validate(employeeUpdate), updateEmployee);
router.delete("/employees/:id", deleteEmployee);

module.exports = router;