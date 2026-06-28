import type { Metadata, Viewport } from 'next';
import './globals.css';
import { NewFileTicker } from '@/components/new-file-ticker';
import { PingTracker } from '@/components/ping-tracker';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

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
      <head>
        {/* Aplica el tema antes del primer render para evitar flash */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{if(localStorage.getItem('theme')==='light')document.documentElement.classList.add('light')}catch(e){}})()` }} />
      </head>
      <body>
        <NewFileTicker />
        <PingTracker />
        {children}
      </body>
    </html>
  );
}
