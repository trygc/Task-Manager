import type { AppProps } from "next/app";
import Head from "next/head";
import { Inter } from "next/font/google";
import "@/index.css";
import { AppearanceProvider } from "@/context/AppearanceContext";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

const fontVariables = inter.variable;

export default function TrygcApp({ Component, pageProps }: AppProps) {
  return (
    <AppearanceProvider>
      <div className={`${fontVariables} app-fonts`}>
        <Head>
          <title>Trygc Dashboard</title>
          <meta name="application-name" content="Trygc Dashboard" />
          <meta name="apple-mobile-web-app-title" content="Trygc Dashboard" />
          <meta name="theme-color" content="#111111" />
          <link rel="icon" type="image/png" href="/trygc-favicon.png" />
          <link rel="apple-touch-icon" href="/trygc-favicon.png" />
        </Head>
        <Component {...pageProps} />
      </div>
    </AppearanceProvider>
  );
}
