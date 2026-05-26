export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const NOTION_TOKEN = process.env.NOTION_TOKEN;
  const NOTION_DB_ID = process.env.NOTION_DB_ID;

  if (!NOTION_TOKEN || !NOTION_DB_ID) {
    return res.status(500).json({ message: "環境変数が設定されていません" });
  }

  try {
    const notionRes = await fetch(
      `https://api.notion.com/v1/databases/${NOTION_DB_ID}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${NOTION_TOKEN}`,
          "Notion-Version": "2022-06-28",
        },
      }
    );

    if (!notionRes.ok) {
      const errBody = await notionRes.json();
      return res.status(notionRes.status).json({
        message: errBody.message || "Notion APIエラー",
      });
    }

    const db = await notionRes.json();
    const options = db.properties?.["診療科"]?.select?.options ?? [];
    const departments = options.map((opt) => opt.name);

    return res.status(200).json({ departments });

  } catch (err) {
    console.error("Server Error:", err);
    return res.status(500).json({ message: "サーバーエラーが発生しました" });
  }
}
