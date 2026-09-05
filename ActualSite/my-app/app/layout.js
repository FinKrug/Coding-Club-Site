import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata = {
  title: "Neumont Coding Club",
  description: "Learn. Build. Compete. — Neumont Coding Club challenges and resources.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        {children}
      </body>
    </html>
  );
}
