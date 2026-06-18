import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Academia J Rubio — Soporte técnico móvil profesional',
  description:
    'Plataforma premium para técnicos de telefonía móvil. Firmware, herramientas, tutoriales y soporte con IA.',
  metadataBase: new URL(process.env.APP_URL ?? 'http://localhost:3000'),
  openGraph: {
    title: 'Academia J Rubio',
    description: 'La plataforma de los técnicos de telefonía móvil.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
