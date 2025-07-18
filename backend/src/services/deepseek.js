const OpenAI = require("openai");
const prompts = require("./prompts");
const openai = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY, // 这里要和.env变量名完全一致
  baseURL: "https://api.deepseek.com/v1", // 关键！必须加
});

/**
 * 用 DeepSeek 进行模块化内容分析
 * @param {string} transcript - 输入文本
 * @param {string} module - prompt模块名，支持多级（如 normal.summary）
 * @returns {Promise<string>} - DeepSeek输出
 */
function getPromptByPath(promptsObj, path) {
  if (!path) return undefined;
  console.log("getPromptByPath----------", path);
  return path
    .split(".")
    .reduce(
      (obj, key) => (obj && obj[key] !== undefined ? obj[key] : undefined),
      promptsObj
    );
}

async function analyzeWithDeepSeek(transcript) {
  // 拼接 globalRole + 模块 prompt
  // const modulePrompt = getPromptByPath(prompts, module);
  // const globalRole = prompts.globalRole || "";
  // const prompt = (globalRole + "\n" + (modulePrompt || "")).trim();
  const messages = [
    { role: "system", content: prompts.globalRole },
    { role: "user", content: transcript },
  ];
  const response = await openai.chat.completions.create({
    model: "deepseek-chat",
    messages,
    stream: false,
  });
  console.log("DeepSeek原始返回：", response.choices[0].message.content);
  return response.choices[0].message.content;
}

module.exports = { analyzeWithDeepSeek };
