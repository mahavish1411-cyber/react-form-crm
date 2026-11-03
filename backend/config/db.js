const mongoose = require("mongoose");

// ==========================================
// DATABASE ERROR HANDLER
// ==========================================

function describeDatabaseError(error) {
  if (error?.name === 'MongoParseError' || error?.name === 'MongoInvalidArgumentError') {
    return {
      code: 'DATABASE_CONFIG_ERROR',
      message: 'MongoDB connection string is invalid. Check MONGODB_URI in backend/.env and URL-encode special characters in the username and password.',
    };
  }
  const serverErrors = Array.from(
    error?.reason?.servers?.values?.() || [],
    (server) => server.error
  ).filter(Boolean);

  const errors = [error, ...serverErrors].filter(Boolean);

  const codes = errors.flatMap((item) => [
    item.code,
    item.cause?.code,
  ]);

  if (
    codes.includes("ENOTFOUND") ||
    codes.includes("EAI_AGAIN")
  ) {
    return {
      code: "DATABASE_DNS_ERROR",
      message:
        "MongoDB hostname could not be resolved. Check your Atlas connection string and DNS.",
    };
  }

  if (
    codes.includes(18) ||
    codes.includes("AuthenticationFailed") ||
    errors.some(item => item.code === 8000 && /auth|credential/i.test(item.message || ''))
  ) {
    return {
      code: "DATABASE_AUTH_ERROR",
      message:
        "MongoDB authentication failed. Update the database username/password in backend/.env using Atlas Database Access credentials (not your Atlas sign-in). URL-encode special characters in credentials.",
    };
  }

  if (error?.code === "DATABASE_CONFIG_ERROR") {
    return {
      code: error.code,
      message: error.message,
    };
  }

  return {
    code: "DATABASE_UNAVAILABLE",
    message:
      "MongoDB is unavailable. Check your Atlas cluster, network connection and IP access list.",
  };
}

// ==========================================
// CONNECT DATABASE
// ==========================================

const connectDB = async () => {
  const uri = process.env.MONGODB_URI?.trim();

  if (!uri || !/^mongodb(?:\+srv)?:\/\//.test(uri)) {
    const error = new Error(
      "Set a valid MONGODB_URI in backend/.env."
    );

    error.code = "DATABASE_CONFIG_ERROR";

    throw error;
  }

  mongoose.set("bufferCommands", false);

  try {
    console.log("Connecting to MongoDB...");

    const connection = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000,
    });

    console.log(
      `MongoDB Connected Successfully: ${connection.connection.name}`
    );

    return connection;
  } catch (error) {
    console.error("\n========== MONGODB ERROR ==========");
    console.error("Error Name:", error.name);
    console.error("Error Code:", error.code || "N/A");
    console.error("Error Message:", error.message);

    if (error.reason?.servers) {
      for (const [address, server] of error.reason.servers) {
        console.error("Server:", address);
        console.error(
          "Server Error:",
          server.error?.message || "Unknown"
        );
      }
    }

    console.error("===================================\n");

    throw error;
  }
};

module.exports = connectDB;
module.exports.describeDatabaseError = describeDatabaseError;
