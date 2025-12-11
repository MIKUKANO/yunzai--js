import plugin from '../../lib/plugins/plugin.js'
import { segment } from "oicq";
import fetch from "node-fetch"

const minsim = 0.80;

async function getImages(e) {
  const imgs = new Set();

  try {
    if (Array.isArray(e.message)) {
      for (const seg of e.message) {
        if (seg?.type === "image" && seg.url) {
          imgs.add(seg.url);
        }
      }
    }

    let replyMsg = null;

    if (typeof e.getReply === "function") {
      const reply = await e.getReply();
      replyMsg = reply?.message;
    }

    if (!replyMsg && e.source?.seq && e.group?.getChatHistory) {
      const hist = await e.group.getChatHistory(e.source.seq, 1);
      replyMsg = hist?.[0]?.message;
    }

    if (Array.isArray(replyMsg)) {
      for (const seg of replyMsg) {
        if (seg?.type === "image" && seg.url) imgs.add(seg.url);
      }
    }

    if (Array.isArray(e.img)) {
      for (const u of e.img) {
        if (u) imgs.add(u);
      }
    }

  } catch (err) {
    console.error("[AniSearch:getImages] error:", err);
  }

  return [...imgs];
}

export class AniSearch extends plugin {
  constructor() {
    super({
      name: '搜番',
      event: 'message',
      dsc: '又在看番了',
      priority: 1000,
      rule: [
        { reg: '^#?(搜|识)番$', fnc: 'ani_search' }
      ]
    })
  }

  async ani_search(e) {
    const urls = await getImages(e);

    if (!urls || urls.length === 0) {
      this.setContext('dealImg');
      await e.reply("请发送你要搜索的番剧截图。");
    } else {
      this.e.img = urls;
      await e.reply("别急，正在使用 trace.moe 识别……", true, { recallMsg: 5 });
      await this.dealImg();
    }
  }

  async dealImg() {
    if (!this.e.img || this.e.img.length === 0) {
      await this.reply("请发送图片。（发送“取消”退出）");
      return true;
    }

    this.finish('dealImg');

    try {
      const responseImage = await fetch(this.e.img[0]);
      if (!responseImage.ok)
        return this.reply("图片获取失败，链接可能过期，请重新发送。");

      const file = Buffer.from(await responseImage.arrayBuffer());

      const response = await fetch("https://api.trace.moe/search?anilistInfo&cutBorders=", {
        method: "POST",
        body: file,
        headers: { "Content-Type": "image/jpeg" }
      });

      const res = await response.json();

      if (!res || res.error || !res.result?.length)
        return this.reply("未找到番剧，请换更清晰的截图。");

      const result = res.result.find(r => r.similarity >= minsim);
      if (!result)
        return this.reply(`相似度低于 ${(minsim * 100)}%，无法识别。`);

      const { anilist, similarity, episode, from, to, image, video } = result;
      const detail = anilist;

      const nickname = this.e.sender.card || this.e.sender.nickname || this.e.sender.username || '未知';

      const from_time = new Date(from * 1000).toISOString().substr(14, 5);
      const to_time = new Date(to * 1000).toISOString().substr(14, 5);

      const forward = [];

      forward.push({
        user_id: this.e.sender.user_id,
        nickname,
        message: [
          detail?.coverImage?.large ? segment.image(detail.coverImage.large) : "",
          `📺 原名: ${detail?.title?.native}\n` +
          `📝 罗马音: ${detail?.title?.romaji}\n` +
          `🔎 相似度: ${(similarity * 100).toFixed(2)}%\n` +
          `📌 出自: 第 ${episode} 集 [${from_time} ~ ${to_time}]\n\n` +
          `🖼 预览片段：`,
          image ? segment.image(image) : ""
        ]
      });

      if (video) {
        forward.push({
          user_id: this.e.sender.user_id,
          nickname,
          message: segment.video(video)
        });
      }

      const fMsg = await this.e.group.makeForwardMsg(forward);
      await this.e.group.sendMsg(fMsg);

    } catch (err) {
      console.error("[AniSearch] 搜番错误:", err);
      await this.reply("搜番时发生错误，请稍后再试。");
    }
  }
}