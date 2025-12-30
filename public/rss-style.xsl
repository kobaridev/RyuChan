<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/"
                xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html xmlns="http://www.w3.org/1999/xhtml" lang="en">
      <head>
        <title><xsl:value-of select="/rss/channel/title"/> RSS Feed</title>
        <meta charset="UTF-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9f9f9;
          }
          header {
            background: #fff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 20px;
            text-align: center;
          }
          h1 {
            margin: 0 0 10px;
            color: #2c3e50;
          }
          p {
            margin: 0;
            color: #666;
          }
          .item {
            background: #fff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 20px;
            transition: transform 0.2s;
          }
          .item:hover {
            transform: translateY(-2px);
          }
          .item h2 {
            margin: 0 0 10px;
            font-size: 1.5em;
          }
          .item h2 a {
            color: #3498db;
            text-decoration: none;
          }
          .item h2 a:hover {
            text-decoration: underline;
          }
          .meta {
            font-size: 0.9em;
            color: #999;
            margin-bottom: 10px;
          }
          .description {
            color: #444;
          }
          .visit-btn {
            display: inline-block;
            margin-top: 10px;
            padding: 8px 16px;
            background-color: #3498db;
            color: #fff;
            text-decoration: none;
            border-radius: 4px;
            font-size: 0.9em;
          }
          .visit-btn:hover {
            background-color: #2980b9;
          }
        </style>
      </head>
      <body>
        <header>
          <h1><xsl:value-of select="/rss/channel/title"/></h1>
          <p><xsl:value-of select="/rss/channel/description"/></p>
          <a class="visit-btn" href="/">Visit Website</a>
        </header>
        <main>
          <xsl:for-each select="/rss/channel/item">
            <div class="item">
              <h2>
                <a href="{link}" target="_blank">
                  <xsl:value-of select="title"/>
                </a>
              </h2>
              <div class="meta">
                Published on <xsl:value-of select="pubDate"/>
              </div>
              <div class="description">
                <xsl:value-of select="description"/>
              </div>
            </div>
          </xsl:for-each>
        </main>
        <script>
          document.addEventListener('DOMContentLoaded', function() {
            const links = document.querySelectorAll('.item h2 a');
            links.forEach(link => {
              try {
                const url = new URL(link.href);
                link.href = url.pathname + url.search + url.hash;
              } catch (e) {
                // Ignore invalid URLs
              }
            });
          });
        </script>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>