const axios = require('axios');

// CrossRef 检索
async function searchCrossRef(query, rows = 5) {
  const url = `https://api.crossref.org/works?query=${encodeURIComponent(query)}&rows=${rows}&mailto=your@email.com`
  const res = await fetch(url)
  const data = await res.json()
  // 解析并返回文献列表
  return data.message.items.map(item => ({
    title: item.title?.[0] || '',
    author: item.author?.map(a => a.family + (a.given ? ' ' + a.given : '')).join(', ') || '',
    year: item.issued?.['date-parts']?.[0]?.[0] || '',
    venue: item['container-title']?.[0] || '',
    abstract: item.abstract || '',
    url: item.URL || '',
    doi: item.DOI || '',
    source: 'CrossRef'
  }))
}

// 兼容未来补充
async function searchSemanticScholar(query, rows = 5) {
  // 暂时返回空数组，等 key 到手后再补充
  return []
}

// 融合检索
async function searchReferences(query, rows = 5) {
  const crossRefList = await searchCrossRef(query, rows)
  // const semanticList = await searchSemanticScholar(query, rows)
  return crossRefList // 只用 CrossRef
}

function mergeReferences(refs1, refs2) {
  // ...合并逻辑...
}

module.exports = {
  searchCrossRef
};
