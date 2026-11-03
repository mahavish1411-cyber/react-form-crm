import { useEffect, useState } from "react";
import { onWaking } from "../api/client";

function WakingBanner() {
  const [waking, setWaking] = useState(false);

  useEffect(() => onWaking(setWaking), []);

  if (!waking) return null;

  return (
    <div
      role="status"
      style={{
        background: "#fef3c7",
        color: "#92400e",
        padding: "10px 16px",
        textAlign: "center",
        fontSize: "14px",
        borderBottom: "1px solid #fcd34d",
      }}
    >
      Waking up the demo server — this can take up to a minute on the free tier.
    </div>
  );
}

export default WakingBanner;
