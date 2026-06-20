import "./globals.css";

export const metadata = {
  title: "Study Tracker",
  description: "Permadeath-based study tracker",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
