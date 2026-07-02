import { Link } from "react-router-dom";

function Navbar() {
  return (
    <nav className="navbar">
      <h2>Neumont Coding Club</h2>

      <div>
        <Link to="/">Home</Link>
        <Link to="/problems">Challenges</Link>
      </div>
    </nav>
  );
}

export default Navbar;