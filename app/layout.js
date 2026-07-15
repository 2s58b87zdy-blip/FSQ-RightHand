import './styles.css';

export const metadata = {
  title: 'FSQ Right Hand',
  description: 'FSQ digital workshop and marine operations platform'
};

export default function RootLayout({ children }) {
  return (
    <html lang="da">
      <body>{children}</body>
    </html>
  );
}
