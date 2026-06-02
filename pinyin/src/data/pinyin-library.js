// 拼音题库 — 100-150条常用汉字
// 每条记录: { id, char, pinyin, initial, final, tone, difficulty, initialGroup, finalGroup }

export const INITIAL_GROUPS = {
  bpmf:    ['b','p','m','f'],
  dtnl:    ['d','t','n','l'],
  gkh:     ['g','k','h'],
  jqx:     ['j','q','x'],
  zhchshr: ['zh','ch','sh','r'],
  zcs:     ['z','c','s'],
  yw:      ['y','w'],
};

export const FINAL_GROUPS = {
  simple:     ['a','o','e','i','u','v'],
  compound:   ['ai','ei','ao','ou','ia','ie','ua','uo','ve','ue','iu','ui'],
  nasal:      ['an','en','in','un','vn','ang','eng','ing','ong'],
  complex:    ['iao','iou','uai','uei','ian','uan','van','iang','uang','ueng'],
};

// 韵母分组映射
function getFinalGroup(final) {
  if (['a','o','e','i','u','v'].includes(final)) return 'simple';
  if (['ai','ei','ao','ou','ia','ie','ua','uo','üe','ue','iu','ui'].includes(final)) return 'compound';
  if (['an','en','in','un','ün','ang','eng','ing','ong'].includes(final)) return 'nasal';
  return 'complex';
}

// 声母分组映射
function getInitialGroup(initial) {
  for (const [group, members] of Object.entries(INITIAL_GROUPS)) {
    if (members.includes(initial)) return group;
  }
  return null;
}

// 例句库
export const SENTENCES = {
  '爸':'爸爸爱我。','妈':'妈妈真好。','怕':'我不怕黑。','发':'头发长长的。','波':'水波一圈圈。',
  '坡':'山坡绿绿的。','摸':'小狗摸起来很软。','佛':'寺庙里有佛。','笔':'我用笔写字。','皮':'苹果皮是红的。',
  '米':'米饭香香的。','地':'大地绿绿的。','踢':'我踢足球。','你':'你好吗？','力':'大象力气大。',
  '不':'我不哭了。','普':'普通话很好听。','木':'树木高高的。','父':'父亲很伟大。','读':'我爱读书。',
  '土':'泥土软软的。','努':'努力学习。','路':'马路上有车。','大':'大象很大。','他':'他是我的朋友。',
  '拿':'请拿好书包。','拉':'手拉手一起走。','得':'我考得很好。','特':'这只猫特别可爱。','呢':'你在干什么呢？',
  '乐':'音乐真好听。','么':'这是什么？','歌':'我唱一首歌。','课':'上课要认真。','河':'小河流水。',
  '故':'讲故事。','哭':'别哭了。','虎':'老虎很威风。','鸡':'大公鸡叫了。','七':'七只小鸟。',
  '西':'太阳西边落。','高':'高山真高。','好':'好朋友。','跑':'快快跑。','到':'春天到了。',
  '老':'老师好。','九':'九个苹果。','球':'踢足球。','牛':'黄牛吃草。','六':'六朵小花。',
  '叫':'小鸟叫。','小':'小朋友。','天':'蓝天上白云飘。','见':'明天见。','面':'吃面条。',
  '猪':'小猪胖胖的。','出':'太阳出来了。','书':'我爱看书。','入':'请进吧。',
  '做':'我会做饭了。','错':'没关系，不是你的错。','所':'所以我要努力。','花':'花儿开了。','瓜':'大西瓜真甜。',
  '中':'中国很大。','虫':'小虫爬呀爬。','上':'太阳升上来了。','长':'长长的路。','让':'请让我过去。',
  '在':'小鸟在天上飞。','才':'我才起床。','北':'北风吹来了。','美':'美丽的花。','飞':'鸟儿飞得高。',
  '水':'水是生命之源。','回':'回家了。','叶':'树叶落下来了。','写':'我会写字了。','月':'月儿弯弯的。',
  '学':'学习很快乐。','二':'二个朋友。','人':'人人有礼貌。','门':'开门看看。','身':'身体健康最重要。',
  '心':'心里暖暖的。','金':'金色的太阳。','云':'白云朵朵。','春':'春天来了。',
  '明':'明天会更好。','星':'星星亮晶晶。','光':'光很温暖。','王':'国王很善良。','万':'万里无云。',
  '鱼':'小鱼游啊游。','家':'我爱我的家。','下':'下雨了。','票':'买张票。','电':'电灯亮了。',
  '快':'跑得快。','羊':'小羊吃青草。','熊':'大熊猫很可爱。','暖':'阳光暖暖的。','远':'山很远很远。',
  '请':'请坐下。','东':'太阳从东方升起。','能':'我能行！','风':'春风轻轻吹。','红':'红花真好看。',
  '绿':'绿叶真美。','女':'女孩笑得很甜。','狗':'小狗汪汪叫。','头':'点点头。','周':'今天是周一。',
  '声':'大声说话。','冰':'冰冰凉凉的。','平':'水平面静静的。','甜':'糖果甜甜的。','蓝':'蓝天真好看。',
  '少':'多少星星？','吃':'好好吃饭。','十':'十个手指。','纸':'一张白纸。','词':'词语好有趣。',
  '四':'四只蝴蝶。','日':'太阳日日升起。','牙':'认真刷牙。','蛙':'小青蛙跳得高。','我':'我很开心。',
  '问':'想问问题。','零':'从零开始。','算':'我会算数。','买':'去超市买东西。','国':'我爱祖国。',
  '对':'你说得对。','最':'最亮的星星。','空':'天空好蓝。','网':'小蜘蛛在结网。','朋':'朋友手拉手。',
  '真':'真的吗？','什':'什么颜色？','都':'大家都来了。','手':'拍拍手。','走':'慢慢走。',
  '白':'白雪公主。','开':'花儿开放了。','海':'大海真蓝。','太':'太阳真亮。','贵':'珍贵的友谊。',
  '包':'书包满满的。','猫':'小猫喵喵叫。','草':'小草绿油油。','早':'早上起得早。',
  '跳':'快乐地跳。','鸟':'小鸟唱歌。','眼':'眼睛亮亮的。','山':'高高的山。','三':'三个小伙伴。',
  '慢':'慢慢来不着急。',
};

export function getSentence(char) {
  return SENTENCES[char] || `我爱学"${char}"字`;
}

// 主题库
const QUESTIONS = [
  // ===== DIFFICULTY 1: 基础声母(bpmf dtnl) + 单韵母(aoeiu) =====
  { id:'ba',   char:'爸', pinyin:'bà', initial:'b', final:'a', tone:4, difficulty:1 },
  { id:'ma',   char:'妈', pinyin:'mā', initial:'m', final:'a', tone:1, difficulty:1 },
  { id:'pa',   char:'怕', pinyin:'pà', initial:'p', final:'a', tone:4, difficulty:1 },
  { id:'fa',   char:'发', pinyin:'fā', initial:'f', final:'a', tone:1, difficulty:1 },
  { id:'bo',   char:'波', pinyin:'bō', initial:'b', final:'o', tone:1, difficulty:1 },
  { id:'po',   char:'坡', pinyin:'pō', initial:'p', final:'o', tone:1, difficulty:1 },
  { id:'mo',   char:'摸', pinyin:'mō', initial:'m', final:'o', tone:1, difficulty:1 },
  { id:'fo',   char:'佛', pinyin:'fó', initial:'f', final:'o', tone:2, difficulty:1 },
  { id:'bi',   char:'笔', pinyin:'bǐ', initial:'b', final:'i', tone:3, difficulty:1 },
  { id:'pi',   char:'皮', pinyin:'pí', initial:'p', final:'i', tone:2, difficulty:1 },
  { id:'mi',   char:'米', pinyin:'mǐ', initial:'m', final:'i', tone:3, difficulty:1 },
  { id:'di',   char:'地', pinyin:'dì', initial:'d', final:'i', tone:4, difficulty:1 },
  { id:'ti',   char:'踢', pinyin:'tī', initial:'t', final:'i', tone:1, difficulty:1 },
  { id:'ni',   char:'你', pinyin:'nǐ', initial:'n', final:'i', tone:3, difficulty:1 },
  { id:'li',   char:'力', pinyin:'lì', initial:'l', final:'i', tone:4, difficulty:1 },
  { id:'bu',   char:'不', pinyin:'bù', initial:'b', final:'u', tone:4, difficulty:1 },
  { id:'pu',   char:'普', pinyin:'pǔ', initial:'p', final:'u', tone:3, difficulty:1 },
  { id:'mu',   char:'木', pinyin:'mù', initial:'m', final:'u', tone:4, difficulty:1 },
  { id:'fu',   char:'父', pinyin:'fù', initial:'f', final:'u', tone:4, difficulty:1 },
  { id:'du',   char:'读', pinyin:'dú', initial:'d', final:'u', tone:2, difficulty:1 },
  { id:'tu',   char:'土', pinyin:'tǔ', initial:'t', final:'u', tone:3, difficulty:1 },
  { id:'nu',   char:'努', pinyin:'nǔ', initial:'n', final:'u', tone:3, difficulty:1 },
  { id:'lu',   char:'路', pinyin:'lù', initial:'l', final:'u', tone:4, difficulty:1 },
  { id:'da',   char:'大', pinyin:'dà', initial:'d', final:'a', tone:4, difficulty:1 },
  { id:'ta',   char:'他', pinyin:'tā', initial:'t', final:'a', tone:1, difficulty:1 },
  { id:'na',   char:'拿', pinyin:'ná', initial:'n', final:'a', tone:2, difficulty:1 },
  { id:'la',   char:'拉', pinyin:'lā', initial:'l', final:'a', tone:1, difficulty:1 },
  { id:'de',   char:'得', pinyin:'dé', initial:'d', final:'e', tone:2, difficulty:1 },
  { id:'te',   char:'特', pinyin:'tè', initial:'t', final:'e', tone:4, difficulty:1 },
  { id:'ne',   char:'呢', pinyin:'ne', initial:'n', final:'e', tone:1, difficulty:1 },
  { id:'le',   char:'乐', pinyin:'lè', initial:'l', final:'e', tone:4, difficulty:1 },
  { id:'me',   char:'么', pinyin:'me', initial:'m', final:'e', tone:1, difficulty:1 },

  // ===== DIFFICULTY 2: gkh jqx + 进阶韵母 =====
  { id:'ge',   char:'歌', pinyin:'gē', initial:'g', final:'e', tone:1, difficulty:2 },
  { id:'ke',   char:'课', pinyin:'kè', initial:'k', final:'e', tone:4, difficulty:2 },
  { id:'he',   char:'河', pinyin:'hé', initial:'h', final:'e', tone:2, difficulty:2 },
  { id:'gu',   char:'故', pinyin:'gù', initial:'g', final:'u', tone:4, difficulty:2 },
  { id:'ku',   char:'哭', pinyin:'kū', initial:'k', final:'u', tone:1, difficulty:2 },
  { id:'hu',   char:'虎', pinyin:'hǔ', initial:'h', final:'u', tone:3, difficulty:2 },
  { id:'ji',   char:'鸡', pinyin:'jī', initial:'j', final:'i', tone:1, difficulty:2 },
  { id:'qi',   char:'七', pinyin:'qī', initial:'q', final:'i', tone:1, difficulty:2 },
  { id:'xi',   char:'西', pinyin:'xī', initial:'x', final:'i', tone:1, difficulty:2 },
  { id:'gao',  char:'高', pinyin:'gāo', initial:'g', final:'ao', tone:1, difficulty:2 },
  { id:'hao',  char:'好', pinyin:'hǎo', initial:'h', final:'ao', tone:3, difficulty:2 },
  { id:'pao',  char:'跑', pinyin:'pǎo', initial:'p', final:'ao', tone:3, difficulty:2 },
  { id:'dao',  char:'到', pinyin:'dào', initial:'d', final:'ao', tone:4, difficulty:2 },
  { id:'lao',  char:'老', pinyin:'lǎo', initial:'l', final:'ao', tone:3, difficulty:2 },
  { id:'jiu',  char:'九', pinyin:'jiǔ', initial:'j', final:'iu', tone:3, difficulty:2 },
  { id:'qiu',  char:'球', pinyin:'qiú', initial:'q', final:'iu', tone:2, difficulty:2 },
  { id:'niu',  char:'牛', pinyin:'niú', initial:'n', final:'iu', tone:2, difficulty:2 },
  { id:'liu',  char:'六', pinyin:'liù', initial:'l', final:'iu', tone:4, difficulty:2 },
  { id:'jiao', char:'叫', pinyin:'jiào', initial:'j', final:'iao', tone:4, difficulty:2 },
  { id:'xiao', char:'小', pinyin:'xiǎo', initial:'x', final:'iao', tone:3, difficulty:2 },
  { id:'tian', char:'天', pinyin:'tiān', initial:'t', final:'ian', tone:1, difficulty:2 },
  { id:'jian', char:'见', pinyin:'jiàn', initial:'j', final:'ian', tone:4, difficulty:2 },
  { id:'mian', char:'面', pinyin:'miàn', initial:'m', final:'ian', tone:4, difficulty:2 },

  // ===== DIFFICULTY 3: zhchshr zcs yw + 复合韵母/鼻韵母 =====
  { id:'zhu',  char:'猪', pinyin:'zhū', initial:'zh',final:'u', tone:1, difficulty:3 },
  { id:'chu',  char:'出', pinyin:'chū', initial:'ch',final:'u', tone:1, difficulty:3 },
  { id:'shu',  char:'书', pinyin:'shū', initial:'sh',final:'u', tone:1, difficulty:3 },
  { id:'ru',   char:'入', pinyin:'rù', initial:'r', final:'u', tone:4, difficulty:3 },
  { id:'zuo',  char:'做', pinyin:'zuò', initial:'z', final:'uo', tone:4, difficulty:3 },
  { id:'cuo',  char:'错', pinyin:'cuò', initial:'c', final:'uo', tone:4, difficulty:3 },
  { id:'suo',  char:'所', pinyin:'suǒ', initial:'s', final:'uo', tone:3, difficulty:3 },
  { id:'hua',  char:'花', pinyin:'huā', initial:'h', final:'ua', tone:1, difficulty:3 },
  { id:'gua',  char:'瓜', pinyin:'guā', initial:'g', final:'ua', tone:1, difficulty:3 },
  { id:'zhong',char:'中', pinyin:'zhōng',initial:'zh',final:'ong',tone:1, difficulty:3 },
  { id:'chong',char:'虫', pinyin:'chóng',initial:'ch',final:'ong',tone:2, difficulty:3 },
  { id:'shang',char:'上', pinyin:'shàng',initial:'sh',final:'ang',tone:4, difficulty:3 },
  { id:'chang',char:'长', pinyin:'cháng',initial:'ch',final:'ang',tone:2, difficulty:3 },
  { id:'rang', char:'让', pinyin:'ràng', initial:'r', final:'ang', tone:4, difficulty:3 },
  { id:'zai',  char:'在', pinyin:'zài', initial:'z', final:'ai', tone:4, difficulty:3 },
  { id:'cai',  char:'才', pinyin:'cái', initial:'c', final:'ai', tone:2, difficulty:3 },
  { id:'bei',  char:'北', pinyin:'běi', initial:'b', final:'ei', tone:3, difficulty:3 },
  { id:'mei',  char:'美', pinyin:'měi', initial:'m', final:'ei', tone:3, difficulty:3 },
  { id:'fei',  char:'飞', pinyin:'fēi', initial:'f', final:'ei', tone:1, difficulty:3 },
  { id:'shui', char:'水', pinyin:'shuǐ',initial:'sh',final:'ui', tone:3, difficulty:3 },
  { id:'hui',  char:'回', pinyin:'huí', initial:'h', final:'ui', tone:2, difficulty:3 },
  { id:'ye',   char:'叶', pinyin:'yè', initial:'y', final:'e', tone:4, difficulty:3 },
  { id:'xie',  char:'写', pinyin:'xiě', initial:'x', final:'ie', tone:3, difficulty:3 },
  { id:'yue',  char:'月', pinyin:'yuè', initial:'y', final:'ue',tone:4, difficulty:3 },
  { id:'xue',  char:'学', pinyin:'xué', initial:'x', final:'üe',tone:2, difficulty:3 },
  { id:'er',   char:'二', pinyin:'èr', initial:'-', final:'er', tone:4, difficulty:3 },
  { id:'ren',  char:'人', pinyin:'rén', initial:'r', final:'en', tone:2, difficulty:3 },
  { id:'men',  char:'门', pinyin:'mén', initial:'m', final:'en', tone:2, difficulty:3 },
  { id:'shen', char:'身', pinyin:'shēn',initial:'sh',final:'en', tone:1, difficulty:3 },
  { id:'xin',  char:'心', pinyin:'xīn', initial:'x', final:'in', tone:1, difficulty:3 },
  { id:'jin',  char:'金', pinyin:'jīn', initial:'j', final:'in', tone:1, difficulty:3 },
  { id:'yun',  char:'云', pinyin:'yún', initial:'y', final:'un', tone:2, difficulty:3 },
  { id:'chun', char:'春', pinyin:'chūn',initial:'ch',final:'un', tone:1, difficulty:3 },
  { id:'ming', char:'明', pinyin:'míng',initial:'m', final:'ing', tone:2, difficulty:3 },
  { id:'xing', char:'星', pinyin:'xīng',initial:'x', final:'ing', tone:1, difficulty:3 },
  { id:'guang',char:'光', pinyin:'guāng',initial:'g',final:'uang',tone:1, difficulty:3 },
  { id:'wang', char:'王', pinyin:'wáng',initial:'w', final:'ang', tone:2, difficulty:3 },
  { id:'wan',  char:'万', pinyin:'wàn', initial:'w', final:'an', tone:4, difficulty:3 },
  { id:'yu',   char:'鱼', pinyin:'yú', initial:'y', final:'u', tone:2, difficulty:3 },
  { id:'jia',  char:'家', pinyin:'jiā', initial:'j', final:'ia', tone:1, difficulty:2 },
  { id:'xia',  char:'下', pinyin:'xià', initial:'x', final:'ia', tone:4, difficulty:2 },
  { id:'piao', char:'票', pinyin:'piào',initial:'p', final:'iao', tone:4, difficulty:2 },
  { id:'dian', char:'电', pinyin:'diàn',initial:'d', final:'ian', tone:4, difficulty:2 },
  { id:'kuai', char:'快', pinyin:'kuài',initial:'k', final:'uai', tone:4, difficulty:3 },
  { id:'yang', char:'羊', pinyin:'yáng',initial:'y', final:'ang', tone:2, difficulty:3 },
  { id:'xiong',char:'熊', pinyin:'xióng',initial:'x', final:'iong',tone:2, difficulty:3 },
  { id:'nuan', char:'暖', pinyin:'nuǎn',initial:'n', final:'uan', tone:3, difficulty:3 },
  { id:'yuan', char:'远', pinyin:'yuǎn',initial:'y', final:'uan', tone:3, difficulty:3 },
  { id:'qing', char:'请', pinyin:'qǐng',initial:'q', final:'ing', tone:3, difficulty:2 },
  { id:'dong', char:'东', pinyin:'dōng',initial:'d', final:'ong', tone:1, difficulty:2 },
  { id:'neng', char:'能', pinyin:'néng',initial:'n', final:'eng', tone:2, difficulty:2 },
  { id:'feng', char:'风', pinyin:'fēng',initial:'f', final:'eng', tone:1, difficulty:2 },
  { id:'hong', char:'红', pinyin:'hóng',initial:'h', final:'ong', tone:2, difficulty:2 },
  { id:'lv',   char:'绿', pinyin:'lǜ', initial:'l', final:'v', tone:4, difficulty:2 },
  { id:'nv',   char:'女', pinyin:'nǚ', initial:'n', final:'v', tone:3, difficulty:2 },
  { id:'gou',  char:'狗', pinyin:'gǒu',initial:'g', final:'ou', tone:3, difficulty:2 },
  { id:'tou',  char:'头', pinyin:'tóu',initial:'t', final:'ou', tone:2, difficulty:2 },
  { id:'zhou', char:'周', pinyin:'zhōu',initial:'zh',final:'ou', tone:1, difficulty:3 },
  { id:'sheng',char:'声', pinyin:'shēng',initial:'sh',final:'eng', tone:1, difficulty:3 },
  { id:'bing', char:'冰', pinyin:'bīng',initial:'b', final:'ing', tone:1, difficulty:2 },
  { id:'ping', char:'平', pinyin:'píng',initial:'p', final:'ing', tone:2, difficulty:2 },
  { id:'tian2',char:'甜', pinyin:'tián',initial:'t', final:'ian', tone:2, difficulty:2 },
  { id:'lan',  char:'蓝', pinyin:'lán', initial:'l', final:'an', tone:2, difficulty:2 },
  { id:'shao', char:'少', pinyin:'shǎo',initial:'sh',final:'ao', tone:3, difficulty:3 },
  { id:'chi',  char:'吃', pinyin:'chī',initial:'ch',final:'i', tone:1, difficulty:3 },
  { id:'shi',  char:'十', pinyin:'shí',initial:'sh',final:'i', tone:2, difficulty:3 },
  { id:'zhi',  char:'纸', pinyin:'zhǐ',initial:'zh',final:'i', tone:3, difficulty:3 },
  { id:'ci',   char:'词', pinyin:'cí', initial:'c', final:'i', tone:2, difficulty:3 },
  { id:'si',   char:'四', pinyin:'sì', initial:'s', final:'i', tone:4, difficulty:3 },
  { id:'ri',   char:'日', pinyin:'rì', initial:'r', final:'i', tone:4, difficulty:3 },
  { id:'ya',   char:'牙', pinyin:'yá', initial:'y', final:'a', tone:2, difficulty:2 },
  { id:'wa',   char:'蛙', pinyin:'wā', initial:'w', final:'a', tone:1, difficulty:3 },
  { id:'wo',   char:'我', pinyin:'wǒ', initial:'w', final:'o', tone:3, difficulty:3 },
  { id:'wen',  char:'问', pinyin:'wèn',initial:'w', final:'en', tone:4, difficulty:3 },
  { id:'ling', char:'零', pinyin:'líng',initial:'l', final:'ing', tone:2, difficulty:2 },
  { id:'suan', char:'算', pinyin:'suàn',initial:'s', final:'uan', tone:4, difficulty:3 },
  { id:'mai',  char:'买', pinyin:'mǎi',initial:'m', final:'ai', tone:3, difficulty:2 },
  { id:'guo',  char:'国', pinyin:'guó',initial:'g', final:'uo', tone:2, difficulty:2 },
  { id:'dui',  char:'对', pinyin:'duì',initial:'d', final:'ui', tone:4, difficulty:2 },
  { id:'zui',  char:'最', pinyin:'zuì',initial:'z', final:'ui', tone:4, difficulty:3 },
  { id:'kong', char:'空', pinyin:'kōng',initial:'k', final:'ong', tone:1, difficulty:2 },
  { id:'wang2',char:'网', pinyin:'wǎng',initial:'w', final:'ang', tone:3, difficulty:3 },
  { id:'peng', char:'朋', pinyin:'péng',initial:'p', final:'eng', tone:2, difficulty:2 },
  { id:'zhen', char:'真', pinyin:'zhēn',initial:'zh',final:'en', tone:1, difficulty:3 },
  { id:'shen2',char:'什', pinyin:'shén',initial:'sh',final:'en', tone:2, difficulty:3 },
  { id:'dou',  char:'都', pinyin:'dōu',initial:'d', final:'ou', tone:1, difficulty:2 },
  { id:'shou', char:'手', pinyin:'shǒu',initial:'sh',final:'ou', tone:3, difficulty:3 },
  { id:'zou',  char:'走', pinyin:'zǒu',initial:'z', final:'ou', tone:3, difficulty:3 },
  { id:'bai',  char:'白', pinyin:'bái',initial:'b', final:'ai', tone:2, difficulty:1 },
  { id:'kai',  char:'开', pinyin:'kāi',initial:'k', final:'ai', tone:1, difficulty:2 },
  { id:'hai',  char:'海', pinyin:'hǎi',initial:'h', final:'ai', tone:3, difficulty:2 },
  { id:'tai',  char:'太', pinyin:'tài',initial:'t', final:'ai', tone:4, difficulty:2 },
  { id:'gui',  char:'贵', pinyin:'guì',initial:'g', final:'ui', tone:4, difficulty:2 },
  { id:'bao',  char:'包', pinyin:'bāo',initial:'b', final:'ao', tone:1, difficulty:1 },
  { id:'mao',  char:'猫', pinyin:'māo',initial:'m', final:'ao', tone:1, difficulty:1 },
  { id:'cao',  char:'草', pinyin:'cǎo',initial:'c', final:'ao', tone:3, difficulty:3 },
  { id:'zao',  char:'早', pinyin:'zǎo',initial:'z', final:'ao', tone:3, difficulty:3 },
  { id:'tiao', char:'跳', pinyin:'tiào',initial:'t', final:'iao', tone:4, difficulty:2 },
  { id:'niao', char:'鸟', pinyin:'niǎo',initial:'n', final:'iao', tone:3, difficulty:2 },
  { id:'yan',  char:'眼', pinyin:'yǎn',initial:'y', final:'an', tone:3, difficulty:2 },
  { id:'shan', char:'山', pinyin:'shān',initial:'sh',final:'an', tone:1, difficulty:3 },
  { id:'san',  char:'三', pinyin:'sān',initial:'s', final:'an', tone:1, difficulty:3 },
  { id:'man',  char:'慢', pinyin:'màn',initial:'m', final:'an', tone:4, difficulty:2 },
];

// 增强：添加音系分组
export const LIBRARY = QUESTIONS.map(q => ({
  ...q,
  initialGroup: getInitialGroup(q.initial),
  finalGroup: getFinalGroup(q.final),
}));

// 获取全部题目
export function getAllQuestions() {
  return [...LIBRARY];
}

// 按难度获取
export function getQuestionsByDifficulty(difficulty) {
  return LIBRARY.filter(q => q.difficulty <= difficulty);
}

// 获取随机混淆选项 — 优先从同音系分组抽取
export function getRandomDistractors(correct, type, count, correctValue) {
  // type: 'initial' | 'final' | 'tone' | 'char'
  let pool;
  if (type === 'initial') {
    const group = getInitialGroup(correctValue);
    if (group) {
      pool = INITIAL_GROUPS[group].filter(v => v !== correctValue);
      // 同组不足时从相邻组补充
      if (pool.length < count) {
        const allOthers = Object.values(INITIAL_GROUPS).flat().filter(v => v !== correctValue);
        pool = [...new Set([...pool, ...allOthers])];
      }
    } else {
      pool = Object.values(INITIAL_GROUPS).flat().filter(v => v !== correctValue);
    }
  } else if (type === 'final') {
    const group = getFinalGroup(correctValue);
    if (group) {
      pool = FINAL_GROUPS[group].filter(v => v !== correctValue);
    } else {
      pool = Object.values(FINAL_GROUPS).flat().filter(v => v !== correctValue);
    }
  } else if (type === 'tone') {
    pool = [1,2,3,4].filter(v => v !== correctValue);
  } else if (type === 'char') {
    // 返回char+pinyin组合的distractor记录
    const others = LIBRARY.filter(q => q.id !== correct.id);
    return shuffleArray(others).slice(0, count);
  }
  return shuffleArray(pool || []).slice(0, count);
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 获取声母/韵母列表
export function getAllInitials() {
  return [...new Set(LIBRARY.map(q => q.initial).filter(i => i !== '-'))];
}

export function getAllFinals() {
  return [...new Set(LIBRARY.map(q => q.final))];
}
