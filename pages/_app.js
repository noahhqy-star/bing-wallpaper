import '../styles/global.scss';
import '../styles/index.scss';
import '../styles/date.scss';
import '../styles/downDialog.scss';
import '../styles/storyDialog.scss';
import '../styles/font.scss';
import Head from 'next/head';

function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>必应壁纸 - 每日精选</title>
        <meta name="description" content="每日必应高清壁纸" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}

export default MyApp;