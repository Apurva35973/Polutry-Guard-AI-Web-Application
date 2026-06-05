import { useEffect, useState } from "react";
import { getDashboard } from "../services/vendorService";

function VendorDashboard() {

  const [stats, setStats] = useState([]);

  useEffect(() => {

    loadDashboard();

  }, []);

  const loadDashboard = async () => {

    const response =
      await getDashboard();

    setStats(response.data.data);
  };

  return (
    <div>

      <h1>Vendor Dashboard</h1>

      <pre>
        {JSON.stringify(stats, null, 2)}
      </pre>

    </div>
  );
}

export default VendorDashboard;