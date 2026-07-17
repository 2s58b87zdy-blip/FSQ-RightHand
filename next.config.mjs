import './styles.css';

export const metadata = {
  title: 'FSQ Command',
  description: 'FSQ Command marine operations platform'
};

export default function RootLayout({ children }) {
  return (
    <html lang="da">
      <body>{children}</body>
    </html>
  );
}
