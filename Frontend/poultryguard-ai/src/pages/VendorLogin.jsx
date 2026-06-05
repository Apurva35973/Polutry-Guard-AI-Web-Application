import { useState } from "react";
import axios from "axios";

function VendorLogin() {

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const login = async () => {

    try {

      const response =
        await axios.post(
          "http://localhost:5000/auth/login",
          {
            email,
            password
          }
        );

      localStorage.setItem(
        "token",
        response.data.data.token
      );

      window.location.href = "/dashboard";

    } catch (error) {

      alert("Login Failed");
    }
  };

  return (
    <div>

      <h1>Vendor Login</h1>

      <input
        placeholder="Email"
        onChange={(e) =>
          setEmail(e.target.value)}
      />

      <input
        type="password"
        placeholder="Password"
        onChange={(e) =>
          setPassword(e.target.value)}
      />

      <button onClick={login}>
        Login
      </button>

    </div>
  );
}

export default VendorLogin;