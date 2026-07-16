export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'API key not configured' });
    }

    const { emailContent } = req.body;
    if (!emailContent) {
      return res.status(400).json({ error: 'No email content' });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': apiKey
      },
      body: JSON.stringify({
        model: 'claude-opus-4-6',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: `Extract BOL (Bill of Lading) information from these emails. Return ONLY valid JSON, no markdown.

${emailContent}

Return JSON:
{"shipper":{"organization":"","contact_name":"","address":"","phone":"","email":""},"consignee":{"name":"","company":"","address":"","country":"","phone":"","email":""},"items":[],"shipping":{"method":"","cost":"","transit_time":"","notes":""},"pickup_notes":"","delivery_notes":"","billing_client":"","images_attached":[],"needs_review":[]}`
        }]
      })
    });

    if (!response.ok) {
      return res.status(500).json({ error: 'API error' });
    }

    const data = await response.json();
    let text = data.content[0].text;

    if (text.includes('```')) {
      text = text.replace(/```json\n?/g, '').replace(/```/g, '');
    }

    const result = JSON.parse(text);
    res.json(result);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
