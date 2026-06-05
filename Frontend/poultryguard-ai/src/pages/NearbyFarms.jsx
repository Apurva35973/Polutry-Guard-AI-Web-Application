import { useEffect, useState } from "react";
import { getNearbyFarms } from "../services/vendorService";

function NearbyFarms() {

  const [farms, setFarms] = useState([]);

  useEffect(() => {

    loadFarms();

  }, []);

  const loadFarms = async () => {

    const response =
      await getNearbyFarms();

    setFarms(
      response.data.data.farms
    );
  };

  return (
    <div>

      <h1>Nearby Farms</h1>

      {
        farms.map((farm) => (

          <div key={farm.farmer_id}>

            <h3>{farm.farm_name}</h3>

            <p>{farm.full_name}</p>

            <p>{farm.farm_type}</p>

            <p>{farm.total_birds}</p>

          </div>

        ))
      }

    </div>
  );
}

export default NearbyFarms;