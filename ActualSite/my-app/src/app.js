import { BrowserRouter, Routes, Route } from "react-router-dom";

import Navbar from "./components/navbar";
import Home from "./pages/home";
import Problems from "./pages/problems";
import ProblemPage from "./pages/problemPage";

import "./app.css";

function App() {
  return (
    <BrowserRouter>

      <Navbar />

      <Routes>

        <Route
          path="/"
          element={<Home />}
        />

        <Route
          path="/problems"
          element={<Problems />}
        />

        <Route
          path="/problems/:id"
          element={<ProblemPage />}
        />

      </Routes>

    </BrowserRouter>
  );
}

export default App;
