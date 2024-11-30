import plugin from '../../lib/plugins/plugin.js';
import cfg from '../../lib/config/config.js';
import common from '../../lib/common/common.js';
import moment from "moment";
import fs from 'fs';
const path = process.cwd();

// 设置事件概率, 请确保概率总和小于1，剩余概率触发反击
let reply_text = 0.1; // 文字回复概率
let reply_img = 0.1; // 图片回复概率
let reply_voice = 0.4; // 语音回复概率

// 剩下的概率就是反击
let master = "主人";

// 定义图片和语音文件存放路径
const chuo_path = path + '/resources/chuochuo/pic/';
const voice_path = path + '/resources/chuochuo/voice/';
const atri_path = path + '/resources/chuochuo/atri.json';

// 图片和语音文件的格式
const imageFormats = ['.jpg', '.gif', '.png', '.jpeg']; // 支持的图片格式
const voiceFormats = ['.mp3', '.wav', '.ogg']; // 支持的语音格式

// 获取目录下的所有文件
const getFiles = (dir, formats) => {
    return fs.readdirSync(dir).filter(file => formats.some(format => file.endsWith(format)));
}

// 获取支持的图片文件
const imageFiles = getFiles(chuo_path, imageFormats);

// 获取支持的语音文件
const voiceFiles = getFiles(voice_path, voiceFormats);

// 回复文字列表
const word_list = [
    "啊我真是太高性能了",
    'Ciallo～(∠・ω< )⌒☆',
    '>_<！！！',
    'o(´^｀)o',
    '地球也包括我吗？',
    '你再戳,亚托莉要生气了哦',
    '好吃就是高兴嘛！',
    '我可是高性能机器人！',
];

// 反击消息列表
const ciku_ = [
    "亚托莉今天已经被戳了_num_次啦，休息一下好不好",
    "亚托莉今天已经被戳了_num_次啦，有完没完！",
    "亚托莉今天已经被戳了_num_次啦，要戳坏掉了！",
    "亚托莉今天已经被戳了_num_次啦，别戳了!!!",
    "亚托莉今天已经被戳了_num_次啦，不准戳了！！！",
    "亚托莉今天已经被戳了_num_次啦，再戳就坏了！",
];

export class chuo extends plugin {
    constructor() {
        super({
            name: '亚托莉-戳一戳',
            dsc: '戳一戳亚托莉触发效果',
            event: 'notice.group.poke',
            priority: 5000,
            rule: [
                {
                    fnc: 'chuoyichuo'
                }
            ]
        });
    }

    async chuoyichuo(e) {
        if (cfg.masterQQ.includes(e.target_id)) {
            // 戳主人时的特殊反应
            if (!cfg.masterQQ.includes(e.operator_id) && e.self_id != e.operator_id) {
                e.reply([
                    segment.at(e.operator_id),
                    `\n你想干嘛, 竟敢戳我亲爱滴${master}, 胆子好大啊你`,
                    segment.image(path + `/resources/chuochuo/pic/生气.gif`),
                ], true);
                
                // 反击戳一次
                await e.bot.sendApi('group_poke', {
                    group_id: e.group_id,   // 群ID
                    user_id: String(e.operator_id)  // 触发戳的用户ID
                });
            }
            return true;
        }
        
        if (e.target_id == e.self_id) {
            // 戳机器人的效果
            let count = await redis.get(`Yz:pokecount:`) || 0;
            let group = Bot.pickGroup(e.group_id);
            
            // 当前时间
            let time = moment(Date.now()).add(1, "days").format("YYYY-MM-DD 00:00:00");
            let exTime = Math.round((new Date(time).getTime() - new Date().getTime()) / 1000);

            // 更新戳次数
            count++;
            await redis.set(`Yz:pokecount:`, count, { EX: exTime });
            
            if (Math.ceil(Math.random() * 100) <= 20 && count >= 10) {
                let conf = cfg.getGroup(e.group_id);
                e.reply([
                    `${ciku_[Math.round(Math.random() * (ciku_.length - 1))]}`
                        .replace("_name_", conf.botAlias[0])
                        .replace("_num_", count),
                ]);
                return true;
            }

            // 随机回复逻辑
            let random_type = Math.random();

            if (random_type < reply_text) {
                // 回复随机文字
                let text_number = Math.floor(Math.random() * word_list.length);
                e.reply(word_list[text_number]);
            } else if (random_type < (reply_text + reply_img)) {
                // 回复随机图片
                let photo_number = Math.floor(Math.random() * imageFiles.length);
                let photo_file = imageFiles[photo_number];
                e.reply(segment.image(chuo_path + photo_file));
            } else if (random_type < (reply_text + reply_img + reply_voice)) {
                // 回复随机语音
                let voice_number = Math.floor(Math.random() * voiceFiles.length);
                let voice_file = voiceFiles[voice_number];
                e.reply(segment.record(voice_path + voice_file));

                // 读取和匹配语音文件的文字描述
                try {
                    let atri_json = JSON.parse(fs.readFileSync(atri_path, 'utf8'));
                    let matched_entry = Object.entries(atri_json).find(([key, value]) => value.o === voice_file);
                    if (matched_entry) e.reply(matched_entry[1].s);
                } catch (err) {
                    console.error('读取或解析 atri.json 文件失败:', err);
                }
            } else {
                e.reply('你戳得过我吗');
                
                await e.bot.sendApi('group_poke', {
                    group_id: e.group_id, 
                    user_id: String(e.user_id)  
                });
            }

            return true;
        }
    }
}
