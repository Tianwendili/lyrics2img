// 假名注释功能已改为纯前端实现（kuroshiro 浏览器版 + jsDelivr CDN 词典）。
// 此端点保留只为向后兼容，返回未转换文本。
export const onRequestGet = async ({ request }) => {
  const url = new URL(request.url);
  const text = url.searchParams.get('text') || '';
  return Response.json({ html: text, raw: text, note: 'furigana is now client-side' });
};
