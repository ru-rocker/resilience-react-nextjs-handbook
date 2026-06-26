import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Resilient Weather Map Dashboard',
  description: 'An interactive weather dashboard using Open-Meteo and Leaflet, built with frontend resilience.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
