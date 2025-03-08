import Providers from "./providers/Providers";
import "./globals.css";

export const metadata = {
  title: "AMAA - Ask Me Anything About",
  description: "Your personal AI assistant",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}