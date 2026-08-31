import { ReactNode } from "react";
import type { Metadata } from "next";
import { getPublicSiteUrl } from "@/lib/urls";

export const metadata: Metadata = {
  metadataBase: new URL(getPublicSiteUrl()),
  title: "Swiss Wall Panels",
  description: "Premium acoustic and decorative wall panels for Switzerland.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
