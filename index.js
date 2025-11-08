const express = require("express");
const cors = require("cors");
const puppeteer = require("puppeteer");

const app = express();
app.use(cors());

app.get("/api/download", async (req, res) => {
    const { url } = req.query;
    if (!url || !url.includes("instagram.com/reel")) {
        return res.status(400).json({ error: "Invalid Instagram Reel URL" });
    }
    
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });

        const page = await browser.newPage();
        await page.setUserAgent(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
        );

        await page.goto(url, { waitUntil: "networkidle2" });

        const video = await page.$eval('meta[property="og:video"]', el => el.content).catch(() => null);
        const image = await page.$eval('meta[property="og:image"]', el => el.content).catch(() => null);

        if (video) {
            res.json({ type: "video", media: video });
        } else if (image) {
            res.json({ type: "image", media: image });
        } else {
            res.status(404).json({ error: "No media found or the reel is private." });
        }

        await browser.close();
    } catch (error) {
        if (browser) await browser.close();
        console.error("Scraper Error:", error.message);
        res.status(500).json({ error: "Failed to scrape Instagram reel." });
    }
});

app.get("/api/direct-download", async (req, res) => {
  const { file } = req.query;
  if (!file) return res.status(400).send("Missing file URL");

  try {
    const response = await axios.get(file, {
      responseType: "stream",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
        Referer: "https://www.instagram.com/",
        Accept: "*/*",
      },
    });

    const contentType = response.headers["content-type"] || "video/mp4";
    const extension = contentType.includes("image") ? "jpg" : "mp4";

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename=reel.${extension}`);
    response.data.pipe(res);
  } catch (error) {
    console.error("❌ Download Error:", error.message);
    if (error.response) {
      console.error("Status:", error.response.status);
    }
    res.status(500).send("Failed to download file from Instagram CDN.");
  }
});

app.listen(3000, () => console.log("✅ Puppeteer server running on port 3000"));