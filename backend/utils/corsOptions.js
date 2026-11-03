const DEFAULT_ORIGINS = ["http://localhost:5173"];

const escapeRegex = (s) => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&");

const toMatcher = (entry) => {
  if (!entry.includes("*")) return (origin) => origin === entry;
  const re = new RegExp(
    "^" +
      entry
        .split("*")
        .map(escapeRegex)
        .join("[a-z0-9-]+(?:\\.[a-z0-9-]+)*") +
      "$",
    "i"
  );
  return (origin) => re.test(origin);
};

function buildCorsOptions(envValue) {
  const entries = String(envValue || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const matchers = (entries.length ? entries : DEFAULT_ORIGINS).map(toMatcher);

  return {
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      callback(null, matchers.some((m) => m(origin)));
    },
  };
}

module.exports = { buildCorsOptions };
