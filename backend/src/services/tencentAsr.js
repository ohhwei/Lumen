// backend/src/services/tencentAsr.js
const tencentcloud = require("tencentcloud-sdk-nodejs");
const AsrClient = tencentcloud.asr.v20190614.Client;

// 1. 初始化腾讯云 ASR 客户端
const client = new AsrClient({
  credential: {
    secretId: process.env.TENCENT_SPEECH_API_KEY_ID,
    secretKey: process.env.TENCENT_SPEECH_API_KEY,
  },
  region: "ap-guangzhou",
  profile: {
    httpProfile: {
      endpoint: "asr.tencentcloudapi.com",
    },
  },
});

/**
 * 提交异步长音频识别任务
 * @param {string} ossUrl - 阿里云 OSS 公网 mp4 链接
 * @returns {Promise<string>} - 腾讯云任务ID
 */
async function submitAsrTask(ossUrl) {
  const params = {
    EngineModelType: "16k_zh_video", // 普通话视频模型
    ChannelNum: 1,
    ResTextFormat: 2, // 2=分句+时间戳
    SourceType: 0, // 0=公网链接
    Url: ossUrl, // 腾讯云要求首字母大写
    FilterDirty: 0,
    FilterModal: 0,
    FilterPunc: 0,
    ConvertNumMode: 1,
  };
  const data = await client.CreateRecTask(params);
  return data.Data.TaskId;
}

/**
 * 查询异步识别任务结果
 * @param {string} taskId
 * @returns {Promise<object>} - 识别结果JSON
 */
async function getAsrResult(taskId) {
  const data = await client.DescribeTaskStatus({ TaskId: taskId });
  if (data.Data.StatusStr === "success") {
    // 返回分句+时间戳的JSON
    return data.Data;
  } else if (data.Data.StatusStr === "failed") {
    // 优先使用有内容的错误字段
    const errMsg =
      data.Data.ErrMsg ||
      data.Data.Message ||
      data.Data.ErrorMsg ||
      JSON.stringify(data.Data);
    throw new Error("腾讯云转写失败: " + errMsg);
  } else {
    // 还在处理中
    return null;
  }
}

module.exports = { submitAsrTask, getAsrResult };
