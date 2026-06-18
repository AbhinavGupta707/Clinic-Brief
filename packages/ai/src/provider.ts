import type { z } from "zod";

type RunClinicJsonInput<T> = {
  task: string;
  system: string;
  user: string;
  schema: z.ZodType<T>;
};

type FireworksMessage = {
  role: "system" | "user";
  content: string;
};

export async function runClinicJson<T>({ task, system, user, schema }: RunClinicJsonInput<T>): Promise<T> {
  const apiKey = process.env.FIREWORKS_API_KEY;
  const model = process.env.FIREWORKS_MODEL;

  if (!apiKey || !model) {
    throw new Error(`Fireworks is not configured for task "${task}". Use fixture fallback or set FIREWORKS_API_KEY and FIREWORKS_MODEL.`);
  }

  const messages: FireworksMessage[] = [
    { role: "system", content: system },
    { role: "user", content: user }
  ];

  const first = await callFireworks({ apiKey, model, messages });
  const parsed = parseJson(first);
  const validation = schema.safeParse(parsed);

  if (validation.success) {
    return validation.data;
  }

  const retry = await callFireworks({
    apiKey,
    model,
    messages: [
      ...messages,
      {
        role: "user",
        content: `The previous JSON failed validation with this error: ${validation.error.message}. Return corrected JSON only.`
      }
    ]
  });

  return schema.parse(parseJson(retry));
}

async function callFireworks({
  apiKey,
  model,
  messages
}: {
  apiKey: string;
  model: string;
  messages: FireworksMessage[];
}): Promise<string> {
  const response = await fetch("https://api.fireworks.ai/inference/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      messages,
      response_format: { type: "json_object" },
      temperature: 0.1
    })
  });

  if (!response.ok) {
    throw new Error(`Fireworks request failed: ${response.status} ${response.statusText}`);
  }

  const json = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = json.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("Fireworks returned no content.");
  }

  return content;
}

function parseJson(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("Model response did not contain JSON.");
    }
    return JSON.parse(match[0]);
  }
}
