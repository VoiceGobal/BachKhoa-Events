import React, { createContext, useContext, useState, useEffect } from 'react';
import { InteractiveObject } from '../types';
import { safeLocalStorage } from '../utils/storage';

// Asset imports
import heroWomenDay from '../assets/images/bk_2010_celebration_1792479981730.jpg';
import heroTeachersDay from '../assets/images/bk_2011_tri_an_1792479982972.jpg';
import heroLunarNewYear from '../assets/images/hero_lunar_new_year_1792477014724.jpg';
import cardLotusGrace from '../assets/images/card_lotus_grace_1792461702480.jpg';
import cardTeachersGratitude from '../assets/images/card_teachers_gratitude_1792477012977.jpg';
import giftCelebrationBox from '../assets/images/gift_celebration_box_1792461702624.jpg';
import giftTeachersBox from '../assets/images/gift_teachers_box_1792477013968.jpg';

export type HolidayId = '20-10' | '20-11' | '08-03' | 'tet' | 'valentine';

export interface HolidayRelationship {
  id: string;
  label: string;
  defaultPronoun: string;
}

export interface HolidayConfig {
  id: HolidayId;
  shortDate: string;
  name: string;
  fullName: string;
  tagline: string;
  badge: string;
  heroImage: string;
  cardImage: string;
  giftImage: string;
  themeColor: 'rose' | 'amber' | 'indigo' | 'red' | 'purple';
  primaryGradient: string;
  secondaryGradient: string;
  accentBorder: string;
  ticketPrefix: string;
  defaultRecipient: string;
  defaultCardTitle: string;
  defaultCardMessage: string;
  relationships: HolidayRelationship[];
  interactiveItems: InteractiveObject[];
}

export const HOLIDAYS_MAP: Record<HolidayId, HolidayConfig> = {
  '20-10': {
    id: '20-10',
    shortDate: '20/10',
    name: 'Ngày Phụ Nữ Việt Nam',
    fullName: 'Kỷ Niệm Ngày Phụ Nữ Việt Nam 20/10',
    tagline: 'Gửi yêu thương – Trao nụ cười – Tôn vinh nét đẹp & đức hi sinh của Phụ nữ Việt Nam.',
    badge: 'Tôn Vinh Phái Đẹp 20/10',
    heroImage: heroWomenDay,
    cardImage: cardLotusGrace,
    giftImage: giftCelebrationBox,
    themeColor: 'rose',
    primaryGradient: 'from-purple-800 via-rose-600 to-amber-500',
    secondaryGradient: 'from-rose-500 via-pink-500 to-amber-400',
    accentBorder: 'border-rose-300 dark:border-rose-800',
    ticketPrefix: 'PN',
    defaultRecipient: 'Người phụ nữ tôi yêu mến',
    defaultCardTitle: 'Chúc Mừng Ngày 20/10 Rực Rỡ',
    defaultCardMessage:
      'Nhân ngày Phụ nữ Việt Nam 20/10, chúc bạn luôn ngập tràn niềm vui, nụ cười rạng ngời và đón nhận thật nhiều tình yêu thương ấm áp từ cuộc sống. Bạn luôn là đóa hoa thơm ngát tỏa hương cho đời!',
    relationships: [
      { id: 'mother', label: 'Mẹ kính yêu', defaultPronoun: 'Con - Mẹ' },
      { id: 'wife', label: 'Vợ yêu thương', defaultPronoun: 'Anh - Em' },
      { id: 'girlfriend', label: 'Bạn gái / Người yêu', defaultPronoun: 'Anh - Em' },
      { id: 'teacher_f', label: 'Cô giáo kính mến', defaultPronoun: 'Em - Cô' },
      { id: 'sister', label: 'Chị / Em gái ruột', defaultPronoun: 'Em - Chị' },
      { id: 'colleague_f', label: 'Đồng nghiệp nữ / Sếp nữ', defaultPronoun: 'Tôi - Bạn' },
      { id: 'friend_f', label: 'Bạn thân / Bạn học', defaultPronoun: 'Mình - Bạn' },
      { id: 'other', label: 'Mối quan hệ khác...', defaultPronoun: '' },
    ],
    interactiveItems: [
      {
        id: 'item-flower',
        title: 'Hoa Yêu Thương',
        subtitle: 'Chạm để đón nhận hương sắc',
        iconName: 'flower',
        bgGradient: 'from-purple-100 via-pink-100 to-rose-200',
        borderColor: 'border-purple-300',
        wishTitle: 'Bông hoa ngát hương giữa đời thường',
        wishContent:
          'Mỗi người phụ nữ là một đóa hoa mang hương sắc riêng biệt. Bạn không cần phải nở rộ giống bất kỳ ai, bởi vì sự chân thành, lòng trắc ẩn và nụ cười của chính bạn đã là món quà tuyệt mỹ nhất cho thế giới này. Chúc bạn ngày 20/10 ngát hương hạnh phúc!',
        advice: 'Gợi ý: Dành tặng cho bản thân một cành hoa yêu thích hôm nay.',
      },
      {
        id: 'item-gift',
        title: 'Hộp Quà Bất Ngờ',
        subtitle: 'Mở món quà tinh thần đặc biệt',
        iconName: 'gift',
        bgGradient: 'from-amber-100 via-orange-100 to-red-200',
        borderColor: 'border-orange-300',
        wishTitle: 'Món quà vô giá của cuộc sống',
        wishContent:
          'Món quà quý giá nhất trong ngày 20/10 không nằm trong lớp giấy bọc hào nhoáng, mà chính là sự bình an trong tâm hồn và sự yêu thương thấu hiểu từ những người trân quý bạn. Chúc bạn luôn nhận được những điều kỳ diệu và bất ngờ ngọt ngào từ cuộc sống!',
        advice: 'Gợi ý: Mở lòng đón nhận những lời chúc chân thành xung quanh bạn.',
      },
      {
        id: 'item-envelope',
        title: 'Phong Bì Bí Mật',
        subtitle: 'Mở phong thư gửi từ trái tim',
        iconName: 'envelope',
        bgGradient: 'from-rose-100 via-red-100 to-pink-200',
        borderColor: 'border-rose-400',
        wishTitle: 'Lá thư từ đáy lòng gửi đến bạn',
        wishContent:
          'Bạn đã luôn vất vả vì công việc và gia đình, nhiều lúc giấu đi những mỏi mệt sau nụ cười hiền hậu. Hôm nay, xin hãy tạm gác lại mọi lo toan, để bản thân được nghỉ ngơi, được yêu chiều và được đón nhận tất cả sự nâng niu mà bạn hoàn toàn xứng đáng.',
        advice: 'Gợi ý: Dành 15 phút yên tĩnh uống tách trà nóng và mỉm cười nhẹ nhõm.',
      },
      {
        id: 'item-heart',
        title: 'Trái Tim Lời Chúc',
        subtitle: 'Cảm nhận nhịp đập yêu thương',
        iconName: 'heart',
        bgGradient: 'from-fuchsia-100 via-purple-100 to-pink-200',
        borderColor: 'border-fuchsia-400',
        wishTitle: 'Ngập tràn tình yêu thương và sự thấu cảm',
        wishContent:
          'Chúc trái tim ấm áp của bạn luôn được sưởi ấm bởi những cái ôm chân tình, những ánh nhìn thấu cảm và những lời nói dịu dàng. Mong bạn luôn yêu đời, yêu người và luôn được yêu thương trọn vẹn nhất!',
        advice: 'Gợi ý: Gửi một tin nhắn cảm ơn đến người bạn trân quý nhất hôm nay.',
      },
      {
        id: 'item-star',
        title: 'Ngôi Sao May Mắn',
        subtitle: 'Ước một điều ước cho riêng mình',
        iconName: 'star',
        bgGradient: 'from-yellow-100 via-amber-100 to-orange-200',
        borderColor: 'border-amber-400',
        wishTitle: 'Tỏa sáng rực rỡ như vì sao tinh tú',
        wishContent:
          'Bất kể bầu trời đêm có tối tăm đến đâu, ánh sao của bạn vẫn luôn lấp lánh bền bỉ. Chúc mọi ước mơ ấp ủ của bạn sẽ sớm đơm hoa kết trái. Chúc bạn luôn giữ vững niềm tin, sự lạc quan và may mắn sẽ luôn mỉm cười với bạn trên mọi nẻo đường.',
        advice: 'Gợi ý: Nhắm mắt lại và ước một điều ước thật đẹp cho tương lai của bạn.',
      },
    ],
  },

  '20-11': {
    id: '20-11',
    shortDate: '20/11',
    name: 'Ngày Nhà Giáo Việt Nam',
    fullName: 'Tri Ân Ngày Nhà Giáo Việt Nam 20/11',
    tagline: 'Tri ân Thầy Cô – Người lái đò thầm lặng chở nặng ước mơ & ươm mầm tri thức cho bao thế hệ.',
    badge: 'Tri Ân Người Lái Đò 20/11',
    heroImage: heroTeachersDay,
    cardImage: cardTeachersGratitude,
    giftImage: giftTeachersBox,
    themeColor: 'indigo',
    primaryGradient: 'from-indigo-800 via-amber-600 to-emerald-600',
    secondaryGradient: 'from-indigo-600 via-sky-500 to-amber-500',
    accentBorder: 'border-indigo-300 dark:border-indigo-800',
    ticketPrefix: 'NG',
    defaultRecipient: 'Thầy Cô giáo kính yêu',
    defaultCardTitle: 'Tri Ân Công Ơn Thầy Cô 20/11',
    defaultCardMessage:
      'Nhân ngày Nhà giáo Việt Nam 20/11, chúng em xin kính gửi đến Thầy Cô lời tri ân sâu sắc nhất. Cảm ơn Thầy Cô đã luôn tận tụy bên trang giáo án, chắp cánh cho những ước mơ của chúng em bay cao, bay xa trên bước đường đời!',
    relationships: [
      { id: 'teacher_class', label: 'Cô giáo chủ nhiệm', defaultPronoun: 'Em - Cô' },
      { id: 'teacher_sub', label: 'Thầy giáo bộ môn', defaultPronoun: 'Em - Thầy' },
      { id: 'teacher_principal', label: 'Thầy/Cô Hiệu Trưởng & Ban Giám Hiệu', defaultPronoun: 'Em - Thầy/Cô' },
      { id: 'teacher_old', label: 'Thầy Cô giáo cũ qua các thời kỳ', defaultPronoun: 'Học trò cũ - Thầy/Cô' },
      { id: 'teacher_retired', label: 'Thầy Cô giáo đã về hưu', defaultPronoun: 'Kính thư - Thầy/Cô' },
      { id: 'teacher_lecturer', label: 'Giảng viên Đại học / Cao đẳng', defaultPronoun: 'Sinh viên - Thầy/Cô' },
      { id: 'colleague_edu', label: 'Đồng nghiệp ngành Sư phạm', defaultPronoun: 'Tôi - Thầy/Cô' },
      { id: 'other', label: 'Mối quan hệ khác...', defaultPronoun: '' },
    ],
    interactiveItems: [
      {
        id: 'item-book',
        title: 'Trang Sách Tri Thức',
        subtitle: 'Mở bài học soi sáng tương lai',
        iconName: 'envelope',
        bgGradient: 'from-amber-100 via-yellow-100 to-emerald-200',
        borderColor: 'border-amber-400',
        wishTitle: 'Trang giáo án chắp cánh ước mơ',
        wishContent:
          'Từng nét chữ, từng trang giáo án của Thầy Cô không chỉ mang lại kiến thức, mà còn mở ra cả chân trời bao la của lòng nhân ái và khát vọng vươn lên. Kính chúc Thầy Cô luôn giữ trọn ngọn lửa nhiệt huyết với sự nghiệp trồng người cao quý!',
        advice: 'Gợi ý: Nhắn gửi một lời cảm ơn chân thành đến người thầy cô đầu tiên của bạn.',
      },
      {
        id: 'item-chalk',
        title: 'Bụi Phấn Kỷ Niệm',
        subtitle: 'Lắng đọng giọt mồ hôi bên bục giảng',
        iconName: 'heart',
        bgGradient: 'from-sky-100 via-indigo-100 to-purple-200',
        borderColor: 'border-indigo-400',
        wishTitle: 'Viên phấn trắng rơi cho đời xanh tươi',
        wishContent:
          'Bụi phấn vương trên tóc Thầy, tóc Cô bạc thêm vì những đêm trăn trở cùng học trò. Chúng em mãi khắc ghi công ơn dưỡng dục bao la ấy. Kính chúc Thầy Cô muôn vàn sức khỏe, an khang và luôn mỉm cười tự hào trước sự trưởng thành của các thế hệ học trò.',
        advice: 'Gợi ý: Dành 1 phút hồi tưởng về kỷ niệm đáng nhớ nhất thời cắp sách.',
      },
      {
        id: 'item-flower-score10',
        title: 'Đóa Hoa Điểm 10',
        subtitle: 'Dâng tặng thành tích tri ân',
        iconName: 'flower',
        bgGradient: 'from-rose-100 via-pink-100 to-amber-200',
        borderColor: 'border-rose-400',
        wishTitle: 'Món quà ý nghĩa nhất gửi Thầy Cô',
        wishContent:
          'Không có đóa hoa nào đẹp bằng sự nỗ lực và nên người của học trò. Chúng em xin dâng lên Thầy Cô những đóa hoa điểm 10 rực rỡ nhất cùng lời hứa sẽ luôn sống có ích, kiên định và xứng đáng với kỳ vọng của Thầy Cô.',
        advice: 'Gợi ý: Cố gắng hoàn thành xuất sắc một mục tiêu học tập/công việc hôm nay.',
      },
      {
        id: 'item-pen',
        title: 'Bút Mực Yêu Thương',
        subtitle: 'Nét chữ nết người thuở đầu đời',
        iconName: 'gift',
        bgGradient: 'from-emerald-100 via-teal-100 to-sky-200',
        borderColor: 'border-teal-400',
        wishTitle: 'Nét bút cô uốn nắn nhân cách con',
        wishContent:
          'Cảm ơn Thầy Cô đã kiên nhẫn cầm tay uốn nắn từng nét chữ đầu đời ngây ngô, dạy chúng em biết yêu thương quê hương, trân trọng con người và sống chính trực. Kính chúc Thầy Cô luôn dồi dào sức sống và tràn trề năng lượng tích cực.',
        advice: 'Gợi ý: Viết một lá thư tay hoặc bưu thiếp gửi về mái trường xưa.',
      },
      {
        id: 'item-star-ferry',
        title: 'Ngọn Hải Đăng Dẫn Lối',
        subtitle: 'Người lái đò thầm lặng',
        iconName: 'star',
        bgGradient: 'from-yellow-100 via-amber-100 to-rose-200',
        borderColor: 'border-amber-400',
        wishTitle: 'Chuyến đò tri thức cập bến vinh quang',
        wishContent:
          'Thầy Cô như người lái đò thầm lặng, đưa hết lớp học trò này đến lớp học sinh khác sang bến bờ tri thức. Dù sóng gió hay nắng mưa, con đò ấy vẫn kiên cường rẽ sóng. Xin nghiêng mình cảm tạ tấm lòng son sắt của quý Thầy Cô!',
        advice: 'Gợi ý: Gửi lời chúc mừng 20/11 đến tất cả các thầy cô giáo đang giảng dạy bạn.',
      },
    ],
  },

  '08-03': {
    id: '08-03',
    shortDate: '08/03',
    name: 'Quốc Tế Phụ Nữ',
    fullName: 'Chúc Mừng Ngày Quốc Tế Phụ Nữ 08/03',
    tagline: 'Tự tin – Bản lĩnh – Tỏa sáng: Tôn vinh quyền bình đẳng và vẻ đẹp của người phụ nữ toàn cầu.',
    badge: 'Quốc Tế Phụ Nữ 08/03',
    heroImage: heroWomenDay,
    cardImage: cardLotusGrace,
    giftImage: giftCelebrationBox,
    themeColor: 'purple',
    primaryGradient: 'from-fuchsia-800 via-purple-600 to-pink-500',
    secondaryGradient: 'from-fuchsia-600 via-pink-500 to-rose-400',
    accentBorder: 'border-fuchsia-300 dark:border-fuchsia-800',
    ticketPrefix: 'Q8',
    defaultRecipient: 'Người phụ nữ hiện đại & bản lĩnh',
    defaultCardTitle: 'Chúc Mừng Ngày Quốc Tế Phụ Nữ 8/3',
    defaultCardMessage:
      'Nhân ngày Quốc tế Phụ nữ 8/3, chúc bạn luôn xinh đẹp, tự tin, rực rỡ và luôn làm chủ cuộc đời mình. Hãy luôn yêu thương bản thân và nở nụ cười rạng ngời mỗi ngày nhé!',
    relationships: [
      { id: 'mother', label: 'Mẹ kính yêu', defaultPronoun: 'Con - Mẹ' },
      { id: 'wife', label: 'Vợ yêu quý', defaultPronoun: 'Anh - Em' },
      { id: 'girlfriend', label: 'Bạn gái / Người thương', defaultPronoun: 'Anh - Em' },
      { id: 'sister', label: 'Chị em gái', defaultPronoun: 'Em - Chị' },
      { id: 'colleague_f', label: 'Nữ đồng nghiệp / Nữ lãnh đạo', defaultPronoun: 'Tôi - Bạn' },
      { id: 'friend_f', label: 'Bạn bè phái nữ', defaultPronoun: 'Mình - Bạn' },
      { id: 'other', label: 'Mối quan hệ khác...', defaultPronoun: '' },
    ],
    interactiveItems: [
      {
        id: 'item-tulip',
        title: 'Đóa Tulip Kiêu Hãnh',
        subtitle: 'Biểu tượng tự tin và tự chủ',
        iconName: 'flower',
        bgGradient: 'from-fuchsia-100 via-pink-100 to-purple-200',
        borderColor: 'border-fuchsia-400',
        wishTitle: 'Nở rộ theo cách riêng của bạn',
        wishContent:
          'Bạn độc lập, tài năng và xứng đáng với tất cả những điều tuyệt vời nhất của cuộc sống. Đừng bao giờ nghi ngờ giá trị của chính mình. Chúc bạn ngày 8/3 ngập tràn tiếng cười và niềm kiêu hãnh!',
        advice: 'Gợi ý: Mua một món quà tự thưởng cho bản thân.',
      },
      {
        id: 'item-gift',
        title: 'Hộp Quà Bình Đẳng',
        subtitle: 'Tôn vinh cống hiến của phụ nữ',
        iconName: 'gift',
        bgGradient: 'from-purple-100 via-pink-100 to-rose-200',
        borderColor: 'border-purple-400',
        wishTitle: 'Khẳng định vị thế và tài năng',
        wishContent:
          'Chúc cho mọi ước mơ trong sự nghiệp và đời sống của bạn đều thành công rực rỡ. Thế giới trở nên tươi đẹp hơn chính nhờ trí tuệ và tấm lòng nhân ái của người phụ nữ.',
        advice: 'Gợi ý: Chia sẻ niềm vui ngày 8/3 với các đồng nghiệp nữ.',
      },
      {
        id: 'item-envelope',
        title: 'Thư Gửi Phái Đẹp',
        subtitle: 'Lời nhắn gửi chân thành',
        iconName: 'envelope',
        bgGradient: 'from-pink-100 via-rose-100 to-fuchsia-200',
        borderColor: 'border-pink-400',
        wishTitle: 'Bạn luôn là điều kỳ diệu',
        wishContent:
          'Dù ở bất kỳ cương vị nào, người phụ nữ vẫn luôn là điểm tựa ấm áp và là nguồn cảm hứng bất tận. Chúc bạn có một ngày 8/3 thật thư thái và ấm cúng!',
        advice: 'Gợi ý: Tạm gác công việc để tận hưởng buổi tối trọn vẹn.',
      },
      {
        id: 'item-heart',
        title: 'Trái Tim Tự Yêu',
        subtitle: 'Học cách nâng niu chính mình',
        iconName: 'heart',
        bgGradient: 'from-rose-100 via-pink-100 to-purple-200',
        borderColor: 'border-rose-400',
        wishTitle: 'Yêu thương bản thân trước hết',
        wishContent:
          'Trước khi là người mẹ, người vợ hay người con chu toàn, bạn trước hết là chính bạn. Hãy chăm sóc sức khỏe, nuôi dưỡng tâm hồn và mỉm cười trước gương mỗi sớm mai.',
        advice: 'Gợi ý: Dành cho mình một buổi spa thư giãn hoặc đọc sách.',
      },
      {
        id: 'item-star',
        title: 'Ánh Sao Thành Công',
        subtitle: 'Tỏa sáng trên mọi lĩnh vực',
        iconName: 'star',
        bgGradient: 'from-amber-100 via-purple-100 to-pink-200',
        borderColor: 'border-amber-400',
        wishTitle: 'Vươn xa những hoài bão lớn',
        wishContent:
          'Chúc bạn luôn gặt hái được nhiều thắng lợi mới trong công việc, giữ vững ngọn lửa đam mê và tiếp tục truyền cảm hứng cho những người xung quanh!',
        advice: 'Gợi ý: Viết ra 3 điều bạn tự hào nhất về bản thân trong năm qua.',
      },
    ],
  },

  tet: {
    id: 'tet',
    shortDate: 'Tết',
    name: 'Tết Nguyên Đán & Mùa Xuân',
    fullName: 'Mừng Xuân Bính Ngọ – Tết Nguyên Đán',
    tagline: 'Vạn Niên Thịnh Vượng – Đón Lộc Đầu Xuân – Gia Đạo Bình An – Phúc Lộc Thọ Toàn.',
    badge: 'Mừng Xuân An Khang',
    heroImage: heroLunarNewYear,
    cardImage: cardLotusGrace,
    giftImage: giftCelebrationBox,
    themeColor: 'red',
    primaryGradient: 'from-red-700 via-amber-500 to-yellow-500',
    secondaryGradient: 'from-red-600 via-amber-500 to-yellow-400',
    accentBorder: 'border-red-400 dark:border-red-800',
    ticketPrefix: 'TT',
    defaultRecipient: 'Gia đình & Người thân',
    defaultCardTitle: 'Chúc Mừng Năm Mới An Khang Thịnh Vượng',
    defaultCardMessage:
      'Nhân dịp năm mới Tết đến Xuân về, chúc bạn và gia quyến một năm mới dồi dào sức khỏe, vạn sự như ý, tấn tài tấn lộc, công việc thuận buồm xuôi gió và ngập tràn niềm vui sum vầy!',
    relationships: [
      { id: 'family_grand', label: 'Ông Bà & Bố Mẹ', defaultPronoun: 'Con cháu - Ông bà/Bố mẹ' },
      { id: 'teachers', label: 'Thầy Cô giáo', defaultPronoun: 'Học trò - Thầy Cô' },
      { id: 'partner', label: 'Người yêu / Bạn đời', defaultPronoun: 'Anh - Em' },
      { id: 'colleague', label: 'Đồng nghiệp & Đối tác', defaultPronoun: 'Tôi - Bạn' },
      { id: 'friends', label: 'Bạn bè & Tri kỷ', defaultPronoun: 'Mình - Bạn' },
      { id: 'other', label: 'Mối quan hệ khác...', defaultPronoun: '' },
    ],
    interactiveItems: [
      {
        id: 'item-blossom',
        title: 'Cành Mai Đào Thắm',
        subtitle: 'Sắc xuân rực rỡ đón lộc',
        iconName: 'flower',
        bgGradient: 'from-red-100 via-amber-100 to-yellow-200',
        borderColor: 'border-red-400',
        wishTitle: 'Xuân sắc đơm hoa nảy lộc',
        wishContent:
          'Mai vàng nở rộ đón giàu sang, đào thắm khoe hương rước cát tường. Chúc bạn một mùa xuân ngập tràn may mắn, khởi sắc mọi phương diện và gặt hái bội thu!',
        advice: 'Gợi ý: Cùng gia đình cắm một bình hoa Tết thật tươi tắn.',
      },
      {
        id: 'item-lixi',
        title: 'Bao Lì Xì Đỏ',
        subtitle: 'Khai xuân đắc lộc may mắn',
        iconName: 'gift',
        bgGradient: 'from-red-100 via-orange-100 to-amber-200',
        borderColor: 'border-red-500',
        wishTitle: 'Túi tiền rủng rỉnh – Tài lộc đầy nhà',
        wishContent:
          'Lì xì đỏ thắm mang đến vận may, phúc lành và tài lộc. Chúc bạn năm mới tiền vào như nước, thăng quan tiến chức và vạn sự hanh thông!',
        advice: 'Gợi ý: Trao gửi những phong bao lì xì kèm lời chúc ý nghĩa đến con trẻ và người lớn tuổi.',
      },
      {
        id: 'item-envelope',
        title: 'Thư Chúc Xuân',
        subtitle: 'Tình thân sum vầy ấm cúng',
        iconName: 'envelope',
        bgGradient: 'from-amber-100 via-yellow-100 to-red-200',
        borderColor: 'border-amber-500',
        wishTitle: 'Mùa xuân của sự đoàn viên',
        wishContent:
          'Tết là khi được trở về bên mái ấm gia đình, cùng nhau ăn bữa cơm tất niên và kể cho nhau nghe những câu chuyện ấm lòng. Chúc bạn có một cái Tết đoàn viên trọn vẹn!',
        advice: 'Gợi ý: Gọi điện chúc Tết những người thân ở xa.',
      },
      {
        id: 'item-heart',
        title: 'Trái Tim Hiếu Thảo',
        subtitle: 'Tri ân tổ tiên và đấng sinh thành',
        iconName: 'heart',
        bgGradient: 'from-red-100 via-rose-100 to-pink-200',
        borderColor: 'border-red-400',
        wishTitle: 'Mẹ cha trường thọ cùng cháu con',
        wishContent:
          'Cầu chúc cho cha mẹ, ông bà luôn dồi dào sức khỏe, tinh thần an vui, bách niên giai lão cùng con cháu đón thêm nhiều mùa xuân phúc hậu!',
        advice: 'Gợi ý: Dành trọn vẹn ngày mùng một Tết bên cha mẹ.',
      },
      {
        id: 'item-star',
        title: 'Ngôi Sao Khởi Sắc',
        subtitle: 'Ước nguyện vạn sự cát tường',
        iconName: 'star',
        bgGradient: 'from-yellow-100 via-amber-100 to-red-200',
        borderColor: 'border-yellow-500',
        wishTitle: 'Năm mới thắng lợi mới',
        wishContent:
          'Chúc mọi dự định công việc, kinh doanh hay học tập của bạn trong năm mới đều thuận lợi, bứt phá ngoạn mục và chạm tới đỉnh cao thành công!',
        advice: 'Gợi ý: Chọn ngày đẹp mở hàng hoặc khai bút đầu xuân.',
      },
    ],
  },

  valentine: {
    id: 'valentine',
    shortDate: '14/02',
    name: 'Lễ Tình Nhân Valentine',
    fullName: 'Kỷ Niệm Ngày Lễ Tình Nhân 14/02',
    tagline: 'Khắc ghi rung động ngọt ngào – Nơi trái tim lên tiếng & tình yêu đơm hoa.',
    badge: 'Ngọt Ngào Lễ Tình Nhân',
    heroImage: heroWomenDay,
    cardImage: cardLotusGrace,
    giftImage: giftCelebrationBox,
    themeColor: 'rose',
    primaryGradient: 'from-rose-800 via-red-600 to-pink-500',
    secondaryGradient: 'from-rose-600 via-pink-500 to-red-400',
    accentBorder: 'border-rose-400 dark:border-rose-800',
    ticketPrefix: 'VL',
    defaultRecipient: 'Nửa kia yêu thương',
    defaultCardTitle: 'Gửi Em / Anh – Tình Yêu Của Đời Tôi',
    defaultCardMessage:
      'Nhân ngày Valentine 14/02, chúc cho tình yêu của đôi mình mãi luôn ngọt ngào, bền chặt và ấm áp như những ngày đầu tiên. Cảm ơn vì đã luôn ở bên và mang đến cho anh/em hạnh phúc trọn vẹn nhất!',
    relationships: [
      { id: 'wife', label: 'Vợ yêu', defaultPronoun: 'Chồng - Vợ' },
      { id: 'husband', label: 'Chồng yêu', defaultPronoun: 'Vợ - Chồng' },
      { id: 'girlfriend', label: 'Bạn gái', defaultPronoun: 'Anh - Em' },
      { id: 'boyfriend', label: 'Bạn trai', defaultPronoun: 'Em - Anh' },
      { id: 'crush', label: 'Người thương thầm (Crush)', defaultPronoun: 'Mình - Bạn' },
      { id: 'other', label: 'Mối quan hệ khác...', defaultPronoun: '' },
    ],
    interactiveItems: [
      {
        id: 'item-rose',
        title: 'Hoa Hồng Đỏ Thắm',
        subtitle: 'Minh chứng cho tình yêu nồng nàn',
        iconName: 'flower',
        bgGradient: 'from-rose-100 via-red-100 to-pink-200',
        borderColor: 'border-rose-400',
        wishTitle: 'Tình yêu bất diệt theo năm tháng',
        wishContent:
          'Hoa hồng tượng trưng cho tình yêu chân thành và say đắm. Chúc cho tình cảm của bạn luôn được thắp sáng bởi sự tôn trọng, đồng cảm và những cử chỉ yêu thương mỗi ngày.',
        advice: 'Gợi ý: Tặng nửa kia một bông hoa kèm lời thì thầm ngọt ngào.',
      },
      {
        id: 'item-choco',
        title: 'Hộp Socola Ngọt Ngào',
        subtitle: 'Vị ngọt tan chảy nơi đầu lưỡi',
        iconName: 'gift',
        bgGradient: 'from-amber-100 via-rose-100 to-pink-200',
        borderColor: 'border-amber-400',
        wishTitle: 'Vị ngọt ngào của hạnh phúc lứa đôi',
        wishContent:
          'Tình yêu như thanh socola: có chút đắng nhẹ của những lúc hờn dỗi, nhưng hậu vị luôn đọng lại sự ngọt ngào bất tận. Chúc hai bạn luôn nắm chặt tay nhau đi qua mọi thăng trầm.',
        advice: 'Gợi ý: Cùng nhau thưởng thức bữa tối lãng mạn dưới ánh nến.',
      },
      {
        id: 'item-letter',
        title: 'Thư Tình Trao Tay',
        subtitle: 'Bức thư gói trọn tâm tư',
        iconName: 'envelope',
        bgGradient: 'from-pink-100 via-rose-100 to-red-200',
        borderColor: 'border-pink-400',
        wishTitle: 'Lời thì thầm từ trái tim',
        wishContent:
          'Gặp được người mình thương giữa biển người mênh mông là duyên may lớn nhất. Cảm ơn bạn vì đã cùng nhau viết nên câu chuyện tình yêu bình yên và đẹp đẽ.',
        advice: 'Gợi ý: Viết một mảnh giấy note nhỏ nhắn nhét vào túi áo nửa kia.',
      },
      {
        id: 'item-heart',
        title: 'Hai Nửa Trái Tim',
        subtitle: 'Nhịp đập chung một tình yêu',
        iconName: 'heart',
        bgGradient: 'from-red-100 via-pink-100 to-rose-200',
        borderColor: 'border-red-400',
        wishTitle: 'Gắn kết bền chặt suốt đời',
        wishContent:
          'Chúc cho tình yêu của bạn luôn mới mẻ, dịu dàng và là nơi chốn bình yên nhất để trở về sau những bộn bề của cuộc sống ngoài kia.',
        advice: 'Gợi ý: Trao nhau một cái ôm thật chặt trước khi bắt đầu ngày mới.',
      },
      {
        id: 'item-star',
        title: 'Vì Sao Tình Duyên',
        subtitle: 'Ước hẹn hạnh phúc dài lâu',
        iconName: 'star',
        bgGradient: 'from-yellow-100 via-rose-100 to-pink-200',
        borderColor: 'border-rose-400',
        wishTitle: 'Nguyện ước cùng nhau già đi',
        wishContent:
          'Mong ước lớn nhất trong tình yêu là được cùng người mình thương đi qua thanh xuân, ngắm bình minh và cùng nhau già đi trong an yên và thấu hiểu.',
        advice: 'Gợi ý: Cùng nhau ngắm bầu trời đêm và chia sẻ ước mơ tương lai.',
      },
    ],
  },
};

interface EventContextType {
  activeHoliday: HolidayId;
  holidayConfig: HolidayConfig;
  setActiveHoliday: (holiday: HolidayId) => void;
  allHolidays: HolidayConfig[];
}

const EventContext = createContext<EventContextType | undefined>(undefined);

export const EventProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeHoliday, setActiveHolidayState] = useState<HolidayId>(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = safeLocalStorage.getItem('active_holiday') as HolidayId;
        if (saved && HOLIDAYS_MAP[saved]) return saved;
        // Check URL query or hash
        const params = new URLSearchParams(window.location.search);
        const eventParam = params.get('event') as HolidayId;
        if (eventParam && HOLIDAYS_MAP[eventParam]) return eventParam;
        if (window.location.hash.includes('20-11') || window.location.hash.includes('thay-co')) return '20-11';
        if (window.location.hash.includes('tet')) return 'tet';
        if (window.location.hash.includes('08-03') || window.location.hash.includes('8-3')) return '08-03';
      }
    } catch {
      // Fallback
    }
    return '20-10'; // Default 20/10 as requested
  });

  const setActiveHoliday = (holiday: HolidayId) => {
    setActiveHolidayState(holiday);
    try {
      safeLocalStorage.setItem('active_holiday', holiday);
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    try {
      safeLocalStorage.setItem('active_holiday', activeHoliday);
    } catch {
      // Ignore
    }
  }, [activeHoliday]);

  const holidayConfig = HOLIDAYS_MAP[activeHoliday] || HOLIDAYS_MAP['20-10'];
  const allHolidays = Object.values(HOLIDAYS_MAP);

  return (
    <EventContext.Provider value={{ activeHoliday, holidayConfig, setActiveHoliday, allHolidays }}>
      {children}
    </EventContext.Provider>
  );
};

export const useEvent = () => {
  const ctx = useContext(EventContext);
  if (!ctx) throw new Error('useEvent must be used within EventProvider');
  return ctx;
};
