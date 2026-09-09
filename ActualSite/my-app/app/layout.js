import { Barlow_Condensed, Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

const headingFont = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-heading-src",
  display: "swap",
});

const bodyFont = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body-src",
  display: "swap",
});

export const metadata = {
  title: "Neumont Coding Club",
  description: "Learn. Build. Compete. — Neumont Coding Club challenges and resources.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${headingFont.variable} ${bodyFont.variable}`}>
      <body>
        <Navbar />
        {children}
        <footer className="site-footer">
          Neumont Coding Club — Learn. Build. Compete.
        </footer>
      </body>
    </html>
  );
}
