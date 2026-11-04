import type { YouTubeVideo } from '../youtube';

// Topic groups counted in code across every collected video, before the
// model sees anything. The model reads ~130 video lines; these groups tell it
// what repeats across all ~800 (charts and searches), so a pattern no single
// line shows still reaches the prompt as counted fact.

const MAX_TOPICS = 12;
const MIN_VIDEOS = 3;
// One channel posting a series is a schedule, not a trend
const MIN_CHANNELS = 2;
// A term mostly covering the same videos as a stronger one is the same topic
const MAX_OVERLAP = 0.7;
const MEMBERS_SHOWN = 4;

// Words every title carries: platform hashtags, filler, Indonesian and
// English function words. Lowercase, without '#'
const stopwords = new Set(
  `shorts short ytshorts youtubeshorts shortvideo shortsviral shortsvideo shortsfeed viral viralvideo viralshorts
  fyp fypシ fypシ゚ fypシ゚viral foryou foryoupage trending trend reels video videos youtube subscribe like share comment
  official full episode eps part live terbaru indonesia indo vlog dailyvlog funny lucu comedy kocak ngakak
  new best top latest today hari ini yang dan atau di ke dari untuk dengan pada dalam juga sudah udah aja saja
  bikin buat sama lagi banget gak nggak enggak ga tidak bisa ada jadi kalau kalo karena tapi sih dong kok deh
  aku kamu kita kami dia mereka gue gua lo lu nya the and for with you your this that from are was not what how
  why who when all mau akan masih baru cara begini begitu inilah ternyata semua satu dua tiga sub ft feat vs mv
  lagu song music musik reaction react review
  jangan malah unik berita news tiktok game games gaming bola rumah orang faktaunik videoviral shortviral viralshort
  mana kenapa apa siapa akhirnya sampai bareng main pakai pake punya kalian guys kecil besar lama banyak paling
  sangat lebih kurang hanya cuma tanpa setelah sebelum saat waktu hari malam pagi ayah ibu mami papa mama bapak
  emak bunda kakak adik teman langsung sekarang begini kayak seperti biar supaya terus pernah belum mulai sendiri
  salah benar dunia pertama terakhir`.split(/\s+/),
);

// A two-word phrase pins a topic down ("iphone duo", "sakura school"), so it
// outranks a single word shared by as many channels
const PHRASE_WEIGHT = 1.5;

export type TopicInput = { video: YouTubeVideo; viewGain: number | null };

export type Topic = {
  term: string;
  /** Member video ids, most viewed first */
  videoIds: string[];
  channels: number;
  views: number;
  /** Views gained by members measured against the previous snapshot; null when none were */
  viewGain: number | null;
};

function termsOf(video: YouTubeVideo): Set<string> {
  const terms = new Set<string>();
  const keep = (word: string) => word.length >= 3 && !/^\d+$/.test(word) && !stopwords.has(word);
  const words = `${video.title} ${video.tags.join(' ')}`.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  for (const word of words) {
    if (word.length >= 4 && keep(word)) terms.add(word);
  }
  // Adjacent title words, so a phrase can win over its parts
  const title = video.title.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  for (let i = 1; i < title.length; i++) {
    if (keep(title[i - 1]) && keep(title[i])) terms.add(`${title[i - 1]} ${title[i]}`);
  }
  // Creator tags are often whole phrases ("drama china sub indo")
  for (const tag of video.tags) {
    const phrase = tag.toLowerCase().trim();
    const meaningful = phrase.split(/\s+/).some(keep);
    if (phrase.includes(' ') && phrase.length <= 40 && meaningful) terms.add(phrase);
  }
  return terms;
}

/** The strongest repeated terms, most channels first, one per underlying group of videos. */
export function topicsOf(inputs: TopicInput[]): Topic[] {
  const byTerm = new Map<string, TopicInput[]>();
  for (const input of inputs) {
    for (const term of termsOf(input.video)) {
      const list = byTerm.get(term) ?? [];
      list.push(input);
      byTerm.set(term, list);
    }
  }

  const ranked = [...byTerm.entries()]
    .map(([term, members]) => ({
      term,
      members: [...members].sort((a, b) => b.video.viewCount - a.video.viewCount),
      channels: new Set(members.map((m) => m.video.channelTitle.toLowerCase())).size,
      views: members.reduce((sum, m) => sum + m.video.viewCount, 0),
    }))
    .filter((t) => t.members.length >= MIN_VIDEOS && t.channels >= MIN_CHANNELS)
    .map((t) => ({ ...t, score: t.channels * (t.term.includes(' ') ? PHRASE_WEIGHT : 1) }))
    .sort((a, b) => b.score - a.score || b.views - a.views);

  const topics: Topic[] = [];
  const covered = new Set<string>();
  for (const t of ranked) {
    if (topics.length === MAX_TOPICS) break;
    const ids = t.members.map((m) => m.video.id);
    if (ids.filter((id) => covered.has(id)).length / ids.length > MAX_OVERLAP) continue;
    ids.forEach((id) => covered.add(id));
    const gains = t.members.map((m) => m.viewGain).filter((g): g is number => g !== null);
    topics.push({
      term: t.term,
      videoIds: ids,
      channels: t.channels,
      views: t.views,
      viewGain: gains.length ? gains.reduce((a, b) => a + b, 0) : null,
    });
  }
  return topics;
}

/** The members to show for a topic: its most viewed few. */
export const topicMembers = (topic: Topic) => topic.videoIds.slice(0, MEMBERS_SHOWN);
