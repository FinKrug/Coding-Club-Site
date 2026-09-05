import Link from "next/link";

function Navbar() {
  return (
    <nav className="navbar">
      <h2>Neumont Coding Club</h2>

      <div>
        <Link href="/">Home</Link>
        <Link href="/problems">Challenges</Link>
      </div>
    </nav>
  );
}

export default Navbar;
