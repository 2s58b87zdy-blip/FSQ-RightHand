import './styles.css';

export const metadata = {
  title: 'FSQ Command',
  description: 'FSQ Command marine operations platform',
  applicationName: 'FSQ Command',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'FSQ Command'
  },
  icons: {
    icon: '/icon.svg',
    apple: '/fsq-logo.jpg'
  }
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#04101b'
};

export default function RootLayout({ children }) {
  return (
    <html lang="da">
      <body>{children}</body>
    </html>
  );
}
