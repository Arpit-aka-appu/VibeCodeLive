import type { Metadata } from "next";
import { Geist, Geist_Mono , Rubik } from "next/font/google";
import "./globals.css";
import { Providers , AuthBootstrapc}from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Configure the font object
const rubik = Rubik({
  subsets: ['latin'],
  variable: "--font-rubik",
  display: 'swap', // Prevents layout shift
});


export const metadata: Metadata = {
  title: "TeachView Live | Real-Time Collaborative Coding & Classroom Telemetry",
  description:
    "Interactive Monaco code editor classrooms with live student telemetry, multi-language execution via Judge0, and AI-assisted struggle detection.",
  verification: {
    google: "36c2_gS965wsrumHSor0n2bjd7AAsVCpDmo-Y2ezwNI",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${rubik.variable} ${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <AuthBootstrapc>{children}</AuthBootstrapc>
        </Providers>
      </body>
    </html>
  );
}
