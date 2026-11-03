const Employee = require("../models/Employee");

// ======================================================
// HELPER - PREPARE EMPLOYEE DATA
// ======================================================

const prepareEmployeeData = (body) => {
  const data = {
    ...body,
  };
  for (const field of ["employeeId", "name", "email", "phone", "department", "designation"]) {
    if (typeof data[field] === "string") data[field] = data[field].trim();
  }
  if (typeof data.email === "string") data.email = data.email.toLowerCase();

  // Convert salary values safely to numbers
  if (body.basicSalary !== undefined) {
    data.basicSalary = Number(body.basicSalary || 0);
  }

  if (body.allowance !== undefined) {
    data.allowance = Number(body.allowance || 0);
  }

  if (body.deduction !== undefined) {
    data.deduction = Number(body.deduction || 0);
  }

  return data;
};

// ======================================================
// CREATE EMPLOYEE
// ======================================================

const createEmployee = async (req, res) => {
  try {
    const employeeData = prepareEmployeeData(req.body);

    // ------------------------------------------
    // BASIC VALIDATION
    // ------------------------------------------

    if (
      !employeeData.employeeId ||
      !employeeData.name ||
      !employeeData.email ||
      !employeeData.phone ||
      !employeeData.department ||
      !employeeData.designation
    ) {
      return res.status(400).json({
        success: false,
        message: "Please fill all required employee fields",
      });
    }

    // ------------------------------------------
    // SALARY VALIDATION
    // ------------------------------------------

    if (
      Number.isNaN(employeeData.basicSalary) ||
      Number.isNaN(employeeData.allowance) ||
      Number.isNaN(employeeData.deduction)
    ) {
      return res.status(400).json({
        success: false,
        message: "Salary values must be valid numbers",
      });
    }

    if (
      employeeData.basicSalary < 0 ||
      employeeData.allowance < 0 ||
      employeeData.deduction < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Salary values cannot be negative",
      });
    }

    // ------------------------------------------
    // CHECK EMPLOYEE ID
    // ------------------------------------------

    const existingEmployeeId = await Employee.findOne({
      employeeId: employeeData.employeeId,
    });

    if (existingEmployeeId) {
      return res.status(400).json({
        success: false,
        message: "Employee ID already exists",
      });
    }

    // ------------------------------------------
    // CHECK EMAIL
    // ------------------------------------------

    const existingEmail = await Employee.findOne({
      email: employeeData.email.toLowerCase(),
    });

    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: "Employee email already exists",
      });
    }

    // ------------------------------------------
    // CREATE
    // ------------------------------------------

    const employee = await Employee.create(employeeData);

    return res.status(201).json({
      success: true,
      message: "Employee Created Successfully",
      data: employee,
    });
  } catch (error) {
    console.error("Create employee error:", error);
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: Object.values(error.errors).map((item) => item.message).join(", "),
      });
    }

    // MongoDB duplicate key
    if (error.code === 11000) {
      const duplicateField = Object.keys(
        error.keyPattern || {}
      )[0];

      return res.status(400).json({
        success: false,
        message: duplicateField
          ? `${duplicateField} already exists`
          : "Employee already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        error.message || "Unable to create employee",
    });
  }
};

// ======================================================
// GET ALL EMPLOYEES
// ======================================================

const getEmployees = async (req, res) => {
  try {
    const employees = await Employee.find().sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      count: employees.length,
      data: employees,
    });
  } catch (error) {
    console.error("Get employees error:", error);

    return res.status(500).json({
      success: false,
      message:
        error.message || "Unable to fetch employees",
    });
  }
};

// ======================================================
// UPDATE EMPLOYEE
// ======================================================

const updateEmployee = async (req, res) => {
  try {
    const employeeId = req.params.id;

    // ------------------------------------------
    // CHECK EMPLOYEE EXISTS
    // ------------------------------------------

    const existingEmployee = await Employee.findById(
      employeeId
    );

    if (!existingEmployee) {
      return res.status(404).json({
        success: false,
        message: "Employee Not Found",
      });
    }

    const employeeData = prepareEmployeeData(req.body);

    // ------------------------------------------
    // SALARY VALIDATION
    // ------------------------------------------

    if (
      employeeData.basicSalary !== undefined &&
      Number.isNaN(employeeData.basicSalary)
    ) {
      return res.status(400).json({
        success: false,
        message: "Basic salary must be a valid number",
      });
    }

    if (
      employeeData.allowance !== undefined &&
      Number.isNaN(employeeData.allowance)
    ) {
      return res.status(400).json({
        success: false,
        message: "Allowance must be a valid number",
      });
    }

    if (
      employeeData.deduction !== undefined &&
      Number.isNaN(employeeData.deduction)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Employee deduction must be a valid number",
      });
    }

    if (
      Number(employeeData.basicSalary || 0) < 0 ||
      Number(employeeData.allowance || 0) < 0 ||
      Number(employeeData.deduction || 0) < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Salary values cannot be negative",
      });
    }

    // ------------------------------------------
    // CHECK DUPLICATE EMPLOYEE ID
    // ------------------------------------------

    if (employeeData.employeeId) {
      const duplicateEmployeeId =
        await Employee.findOne({
          employeeId: employeeData.employeeId,
          _id: {
            $ne: employeeId,
          },
        });

      if (duplicateEmployeeId) {
        return res.status(400).json({
          success: false,
          message: "Employee ID already exists",
        });
      }
    }

    // ------------------------------------------
    // CHECK DUPLICATE EMAIL
    // ------------------------------------------

    if (employeeData.email) {
      const duplicateEmail = await Employee.findOne({
        email: employeeData.email.toLowerCase(),
        _id: {
          $ne: employeeId,
        },
      });

      if (duplicateEmail) {
        return res.status(400).json({
          success: false,
          message: "Employee email already exists",
        });
      }
    }

    // ------------------------------------------
    // UPDATE EMPLOYEE
    // ------------------------------------------

    const employee = await Employee.findByIdAndUpdate(
      employeeId,
      employeeData,
      {
        new: true,
        runValidators: true,
      }
    );

    return res.status(200).json({
      success: true,
      message: "Employee Updated Successfully",
      data: employee,
    });
  } catch (error) {
    console.error("Update employee error:", error);

    // MongoDB duplicate key
    if (error.code === 11000) {
      const duplicateField = Object.keys(
        error.keyPattern || {}
      )[0];

      return res.status(400).json({
        success: false,
        message: duplicateField
          ? `${duplicateField} already exists`
          : "Employee already exists",
      });
    }

    // Invalid MongoDB ObjectId
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid Employee ID",
      });
    }

    // Mongoose validation
    if (error.name === "ValidationError") {
      const messages = Object.values(
        error.errors || {}
      ).map((item) => item.message);

      return res.status(400).json({
        success: false,
        message:
          messages.join(", ") ||
          "Employee validation failed",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        error.message || "Unable to update employee",
    });
  }
};

// ======================================================
// DELETE EMPLOYEE
// ======================================================

const deleteEmployee = async (req, res) => {
  try {
    const employee = await Employee.findByIdAndDelete(
      req.params.id
    );

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee Not Found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Employee Deleted Successfully",
    });
  } catch (error) {
    console.error("Delete employee error:", error);

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid Employee ID",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        error.message || "Unable to delete employee",
    });
  }
};

// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  createEmployee,
  getEmployees,
  updateEmployee,
  deleteEmployee,
};
