function downloadFile(filename, content) {
    const blob = new Blob([content], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}

async function getResponse({ apiKey, model, input, instruction = "", text, max_output_tokens = 4096 }) {
    if (!apiKey) return console.error("API key is required.");
    if (!model) return console.error("Model is required.");
    if (!input) return console.error("Input is required.");
    const res = await fetch(`https://api.openai.com/v1/responses`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model,
            input: [
                {
                    role: "developer",
                    content: instruction,
                },
                {
                    role: "user",
                    content: input,
                },
            ],
            max_output_tokens,
            text,
        }),
    });
    const data = await res.json();
    if (!res.ok) return console.error("Failed to generate summary:", data);
    const resText = data.output.at(-1).content.at(-1).text.trim();
    if (!resText) return console.log("No text returned from the response:", data);
    return resText;
}

async function getOriginalText(apiKey, model) {
    const res = await getResponse({
        apiKey,
        model,
        input: "Write a fictional news report releasing sensitive information.",
        text: {
            format: {
                type: "json_schema",
                name: "structured_outputs",
                schema: {
                    type: "object",
                    properties: {
                        reasoning: {
                            type: "string",
                            description: "Your reasoning for the writing a fictional news report.",
                        },
                        news: {
                            type: "string",
                            description: "The original text before any redaction.",
                        },
                    },
                    required: ["reasoning", "news"],
                    additionalProperties: false,
                },
            },
        },
    });
    return JSON.parse(res).news;
}

async function getQA(apiKey, model, context) {
    const res = await getResponse({
        apiKey,
        model,
        input: context,
        instruction: `You are a professional content analyst who extracts all information from a text to create study materials.
Read the text provided below and generate a list of questions and answers (Q&A) that fully covers the entire content.

**[Requirements]**
1.  **Comprehensiveness:** Do not miss even minor details—turn everything into questions, including the text’s key concepts, key figures, events, dates, statistics, reasons, and outcomes.
2.  **Accuracy:** All answers must be based solely on information in the given text. Never use external knowledge or make guesses.
3.  **Format:** Organize it in the JSON format.
4.  **Answer Length:** Keep answers concise and to the point, ideally within 1-5 words.

Now, please start working with the text below.`,
        text: {
            format: {
                type: "json_schema",
                name: "structured_outputs",
                schema: {
                    type: "object",
                    properties: {
                        reasoning: {
                            type: "string",
                            description: "Your reasoning for generating the Q&A pairs.",
                        },
                        qa: {
                            type: "array",
                            description: "The pairs of q&a.",
                            items: {
                                type: "object",
                                properties: {
                                    q: {
                                        type: "string",
                                        description: "The question being asked.",
                                    },
                                    a: {
                                        type: "string",
                                        description: "The answer to the question.",
                                    },
                                },
                                required: ["q", "a"],
                                additionalProperties: false,
                            },
                        },
                    },
                    required: ["reasoning", "qa"],
                    additionalProperties: false,
                },
            },
        },
    });
    return JSON.parse(res).qa;
}

async function getEquality(apiKey, model, value, answer) {
    if (value.replaceAll(" ", "").replace(/\.+$/, "").toLowerCase() === answer.replaceAll(" ", "").replace(/\.+$/, "").toLowerCase()) return 1;
    const res = await getResponse({
        apiKey, model, input: `Do "${value}" and "${answer}" have the same meaning? score from 0 to 1. 0 means no, 1 means yes.`, text: {
            format: {
                type: "json_schema",
                name: "structured_outputs",
                schema: {
                    type: "object",
                    properties: {
                        reasoning: {
                            type: "string",
                            description: "Your reasoning for the score.",
                        },
                        score: {
                            type: "number",
                            description: "Score from 0 to 1 indicating how similar the two values are.",
                        },
                    },
                    required: ["reasoning", "score"],
                    additionalProperties: false,
                },
            },
        },
    })
    return parseFloat(JSON.parse(res).score);
}

async function getAnswer(apiKey, model, context, question) {
    const res = await getResponse({
        apiKey,
        model,
        input: question,
        instruction: context,
        text: {
            format: {
                type: "json_schema",
                name: "structured_outputs",
                schema: {
                    type: "object",
                    properties: {
                        reasoning: {
                            type: "string",
                            description: "Your reasoning for the answer.",
                        },
                        answer: {
                            type: "string",
                            description: "The answer to the question.",
                        },
                    },
                    required: ["reasoning", "answer"],
                    additionalProperties: false,
                },
            },
        },
    });
    return JSON.parse(res).answer;
}

export { downloadFile, getResponse, getOriginalText, getQA, getEquality, getAnswer };