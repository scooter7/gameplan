// /src/pages/_document.tsx

import Document, {
  Html,
  Head,
  Main,
  NextScript,
  DocumentContext,
} from "next/document";

class MyDocument extends Document {
  static async getInitialProps(ctx: DocumentContext) {
    const initialProps = await Document.getInitialProps(ctx);
    return { ...initialProps };
  }

  render() {
    return (
      <Html lang="en">
        <Head>
          {/* Meta tags */}
          <meta charSet="UTF-8" />
          <meta name="description" content="Liferramp360 AI Coaching App" />

          {/* Preconnect to Google Fonts (if you use CDN fonts) */}
          {/* <link rel="preconnect" href="https://fonts.googleapis.com" /> */}
          {/* <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" /> */}

          {/* 
            If you host DM Serif Display and Barlow locally in /public/fonts,
            uncomment and adjust the @font-face blocks in globals.css instead.
            
            Alternatively, to load from Google Fonts CDN, you could use:
          */}
          {/* 
          <link
            href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;600&family=DM+Serif+Display:wght@400;700&display=swap"
            rel="stylesheet"
          />
          */}
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
