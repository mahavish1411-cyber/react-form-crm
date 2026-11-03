const jwt = require("jsonwebtoken");

function secret() {
  const value = process.env.JWT_SECRET;
  if (!value) throw new Error("JWT_SECRET is not set");
  return value;
}

function signToken({ id, role }, expiresIn = "2h") {
  return jwt.sign({ id: String(id), role }, secret(), { expiresIn });
}

function verifyToken(token) {
  const { id, role } = jwt.verify(token, secret());
  return { id, role };
}

module.exports = { signToken, verifyToken };
