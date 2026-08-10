import { Link } from "react-router-dom";

function Home() {
  return (
    <div className="container">

      <section className="hero">
        <h1>Neumont Coding Club</h1>

        <p>
          Learn. Build. Compete.
        </p>

        <Link to="/problems">
          <button>
            View Challenges
          </button>
        </Link>
      </section>

      <section>
        <h2>About Us</h2>

        <p>
          The Neumont Coding Club is a place for students
          to practice algorithms, work on projects,
          and prepare for technical interviews.
        </p>
      </section>

      <section>
        <h2>Upcoming Events</h2>

        <ul>
          <li>Weekly Coding Challenge</li>
          <li>Game Development Night</li>
          <li>Hackathon Preparation Workshop</li>
        </ul>
      </section>

    </div>
  );
}

export default Home;