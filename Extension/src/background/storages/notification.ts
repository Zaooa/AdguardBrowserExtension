import browser from 'webextension-polyfill';

export type NotificationText = {
     title: string,
     desc?: string,
     btn: string,
 };

export type Notification = {
     id: string,
     locales: Record<string, NotificationText>
     url: string,
     text: string | NotificationText | null,
     from: string,
     to: string,
     type: string,
     bgColor?: string,
     textColor?: string,
     badgeBgColor?: string,
     badgeText?: string,
     icons?: Record<string, Record<string, string>>,
 };

export const BACK_TO_SCHOOL_22_ID = 'backToSchool22';

export const backToSchool22Notification: Notification = {
    id: BACK_TO_SCHOOL_22_ID,
    locales: {
        en: {
            title: 'Back',
            desc: 'to school',
            btn: 'Get 40% off',
        },
        ru: {
            title: 'Снова в',
            desc: 'школу',
            btn: '-40% на всё',
        },
        es: {
            title: 'Vuelta al',
            desc: 'cole',
            btn: 'Obtén un 40% off',
        },
        de: {
            title: 'Zurück zur',
            desc: 'Schule',
            btn: '40% Rabatt',
        },
        fr: {
            title: 'La rentrée',
            desc: 'scolaire',
            btn: '40% de remise',
        },
        it: {
            title: 'Ritorno a',
            desc: 'scuola',
            btn: '40% di sconto',
        },
        ko: {
            title: '백 투 스쿨',
            desc: '세일',
            btn: '40% 할인',
        },
        zh_cn: {
            title: '开学啦',
            btn: '一律享受40%折扣',
        },
        zh_tw: {
            title: '開學啦',
            btn: '獲得40%的折扣',
        },
        uk: {
            title: 'Знову до',
            desc: 'школи',
            btn: 'Знижка 40%',
        },
        pt_pt: {
            title: 'De volta à',
            desc: 'escola',
            btn: 'Obter 40% de desconto',
        },
        pt_br: {
            title: 'De volta à',
            desc: 'escola',
            btn: 'Obtenha 40% de desconto',
        },
        ar: {
            title: 'العودة',
            desc: 'إلى المدرسة',
            btn: '%احصل على خصم 40',
        },
        be: {
            title: 'Назад у',
            desc: 'школу',
            btn: 'Атрымайце скідку 40%',
        },
        id: {
            title: 'Kembali ke',
            desc: 'sekolah',
            btn: 'Dapatkan diskon 40%',
        },
        pl: {
            title: 'Powrót do',
            desc: 'szkoły',
            btn: 'Zyskaj 40% zniżki',
        },
        tr: {
            title: 'Okula dönüş',
            btn: '40 indirim kazanın',
        },
        vi: {
            title: 'Trở lại',
            desc: 'trường học',
            btn: 'Được GIẢM GIÁ 40%',
        },
    },
    text: '',
    url: 'https://link.adtidy.org/forward.html?action=back_to_school_22&app=browser_extension',
    from: '30 August 2022 12:00:00',
    to: '4 September 2022 23:59:00',
    type: 'animated',
    icons: {
        ICON_GREEN: {
            '19': browser.runtime.getURL('assets/icons/promo-on-19.png'),
            '38': browser.runtime.getURL('assets/icons/promo-on-38.png'),
        },
        ICON_GRAY: {
            '19': browser.runtime.getURL('assets/icons/promo-off-19.png'),
            '38': browser.runtime.getURL('assets/icons/promo-off-38.png'),
        },
    },
};

export const notificationStorage = new Map<string, Notification>([
    [BACK_TO_SCHOOL_22_ID, backToSchool22Notification],
]);
