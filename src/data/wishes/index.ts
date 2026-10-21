import { WishItem, RecipientCategory, WishTone } from '../../types';
import { familyWishes } from './family';
import { romanticWishes } from './romantic';
import { teacherWishes } from './teachers';
import { colleagueWishes } from './colleagues';
import { friendWishes } from './friends';
import { businessWishes } from './business';
import { healthcareWishes } from './healthcare';
import { humorousWishes } from './humorous';
import { emotionalWishes } from './emotional';
import { inspiringWishes } from './inspiring';
import { wellnessWishes } from './wellness';
import { selfloveWishes } from './selflove';

export const allWishes: WishItem[] = [
  ...familyWishes,
  ...romanticWishes,
  ...teacherWishes,
  ...colleagueWishes,
  ...friendWishes,
  ...businessWishes,
  ...healthcareWishes,
  ...humorousWishes,
  ...emotionalWishes,
  ...inspiringWishes,
  ...wellnessWishes,
  ...selfloveWishes,
];

export const categoryLabels: Record<RecipientCategory, { label: string; count: number; desc: string }> = {
  family: {
    label: 'Mẹ & Gia đình',
    count: familyWishes.length,
    desc: 'Những lời chúc hiếu thảo gửi mẹ, bà, chị em và người thân'
  },
  romantic: {
    label: 'Vợ & Người yêu',
    count: romanticWishes.length,
    desc: 'Lời yêu thương nồng nàn, ngọt ngào gửi nửa kia'
  },
  teachers: {
    label: 'Cô giáo & Giáo dục',
    count: teacherWishes.length,
    desc: 'Tri ân công ơn người lái đò thầm lặng đưa bao thế hệ sang sông'
  },
  colleagues: {
    label: 'Đồng nghiệp & Công sở',
    count: colleagueWishes.length,
    desc: 'Chúc mừng phái đẹp nơi công sở, sếp nữ và đối tác'
  },
  friends: {
    label: 'Bạn bè & Học đường',
    count: friendWishes.length,
    desc: 'Lời chúc chân thành, vui tươi gửi bạn thân, tri kỷ và sinh viên'
  },
  business: {
    label: 'Nữ Doanh nhân',
    count: businessWishes.length,
    desc: 'Tôn vinh bản lĩnh người phụ nữ làm chủ thương trường'
  },
  healthcare: {
    label: 'Y tế & Dịch vụ',
    count: healthcareWishes.length,
    desc: 'Biết ơn những thiên thần áo trắng và người làm dịch vụ tận tâm'
  },
  humorous: {
    label: 'Hài hước & Dí dỏm',
    count: humorousWishes.length,
    desc: 'Mang lại tiếng cười sảng khoái và năng lượng tươi vui'
  },
  emotional: {
    label: 'Cảm động & Sâu lắng',
    count: emotionalWishes.length,
    desc: 'Chạm tới trái tim với những tâm sự chân thật, ấm áp'
  },
  inspiring: {
    label: 'Truyền cảm hứng',
    count: inspiringWishes.length,
    desc: 'Cổ vũ sự tự tin, độc lập và bản lĩnh phái đẹp'
  },
  wellness: {
    label: 'Sức khỏe & Bình an',
    count: wellnessWishes.length,
    desc: 'Cầu chúc thân tâm an lạc, khỏe khoắn và an nhiên'
  },
  selflove: {
    label: 'Yêu thương bản thân',
    count: selfloveWishes.length,
    desc: 'Dành tặng chính mình – vì bạn xứng đáng với điều tốt đẹp nhất'
  }
};

export const toneLabels: Record<WishTone, string> = {
  emotional: 'Cảm động',
  refined: 'Tinh tế',
  humorous: 'Hài hước',
  cute: 'Dễ thương',
  formal: 'Trang trọng',
  inspiring: 'Truyền cảm hứng'
};

export function getRandomWish(): WishItem {
  const randomIndex = Math.floor(Math.random() * allWishes.length);
  return allWishes[randomIndex];
}

export function findWishesByCriteria(
  relationship?: string,
  tone?: string,
  length?: string
): WishItem[] {
  let matched = allWishes.filter(item => {
    if (tone && item.tone !== tone) return false;
    if (length && item.length !== length) return false;
    return true;
  });

  if (matched.length === 0) {
    matched = allWishes;
  }
  return matched;
}
