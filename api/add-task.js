export default async function handler(req, res) {
  // POST以外は拒否
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const NOTION_TOKEN = process.env.NOTION_TOKEN;
  const NOTION_DB_ID = process.env.NOTION_DB_ID;

  if (!NOTION_TOKEN || !NOTION_DB_ID) {
    return res.status(500).json({ message: "環境変数が設定されていません" });
  }

  const { name, dept, memo, report, cbt, date } = req.body;

  if (!name) {
    return res.status(400).json({ message: "タイトルは必須です" });
  }

  // Notion API用のプロパティを組み立て
  const properties = {
    Name: {
      title: [{ text: { content: name } }],
    },
  };

  if (dept) {
    properties["診療科"] = { select: { name: dept } };
  }

  if (memo) {
    properties["実習メモ"] = { rich_text: [{ text: { content: memo } }] };
  }

  if (report) {
    properties["レポート考察"] = { rich_text: [{ text: { content: report } }] };
  }

  if (cbt) {
    properties["CBT知識"] = { rich_text: [{ text: { content: cbt } }] };
  }

  if (date) {
    properties["作成日時"] = { date: { start: date } };
  }

  try {
    const notionRes = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${NOTION_TOKEN}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify({
        parent: { database_id: NOTION_DB_ID },
        properties,
      }),
    });

    if (!notionRes.ok) {
      const errBody = await notionRes.json();
      console.error("Notion API Error:", errBody);
      return res.status(notionRes.status).json({
        message: errBody.message || "Notion APIエラー",
      });
    }

    const data = await notionRes.json();
    return res.status(200).json({ id: data.id });

  } catch (err) {
    console.error("Server Error:", err);
    return res.status(500).json({ message: "サーバーエラーが発生しました" });
  }
}
