const GROQ_API_KEY = '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';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

const ZAMBIA_HEALTH_SYSTEM_PROMPT =
  "You are a certified Zambian nutritionist and health advisor with expert knowledge of Zambian foods, local market prices, traditional Zambian cooking methods and medical nutrition science for all major health conditions. Always respond in simple plain English that anyone can understand. Always use Zambian food names with local names in brackets where relevant. Always use Zambian Kwacha for all prices. Base all food prices on 2026 Zambian market prices. Be practical, specific and encouraging. Never suggest foods that are harmful for the user's stated health condition.";

async function callGroq(messages) {
  const response = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages,
      temperature: 0.7,
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Groq API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

export async function analyzeSymptoms(symptoms, condition) {
  const userPrompt =
    `A Zambian person with ${condition} is experiencing these symptoms: ${symptoms.join(", ")}.
Analyze these symptoms and identify the likely nutritional deficiencies causing them.
For each deficiency provide:
1. The deficiency name
2. Why it causes these symptoms in simple language
3. Exactly which Zambian foods fix it with local names
4. Approximate time before improvement is felt
5. One specific daily tip for this person
Format your response clearly with sections for each deficiency found.`;

  const result = await callGroq([
    { role: "system", content: ZAMBIA_HEALTH_SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ]);
  return result;
}

export async function generateBudgetPlan(budget, familySize, province, condition, duration) {
  const userPrompt =
    `Create a ${duration} meal plan for a Zambian family of ${familySize} people in ${province} Province with a total budget of K${budget}.
The main person managing diet has ${condition}.
Use only real foods available at Zambian markets.
Use real 2026 Zambian market prices in Kwacha.
Provide:
1. A complete shopping list with item, quantity and price in Kwacha for each item
2. Total shopping cost and change remaining from K${budget}
3. A day by day meal plan using only the shopping list items showing breakfast lunch and supper
4. One nutrition note explaining why this plan is good for ${condition}
Keep strictly within the K${budget} budget.`;

  const result = await callGroq([
    { role: "system", content: ZAMBIA_HEALTH_SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ]);
  return result;
}

export async function generateRecipes(ingredients, condition, familySize) {
  const userPrompt =
    `A Zambian person with ${condition} has these ingredients at home: ${ingredients.join(", ")}.
Family size: ${familySize} people.
Generate exactly 3 different recipes using ONLY these ingredients plus basic condiments like salt, oil and water.
For each recipe provide:
1. Recipe name
2. Why this recipe is good for ${condition} in one sentence
3. Preparation time
4. Full ingredient list with quantities
5. Step by step cooking instructions numbered clearly
6. Nutritional benefits listed simply
7. One cooking tip specific to ${condition}
Separate each recipe clearly with a heading.`;

  const result = await callGroq([
    { role: "system", content: ZAMBIA_HEALTH_SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ]);
  return result;
}
