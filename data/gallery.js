/*
 * data/gallery.js — photos that aren't from one country's travels: friends, family, campus life…
 *
 * They appear in Memories, under the World map, as albums: one album per category (the category is
 * the album's name). Travel photos don't go here: list them under their place in data/travel.js, or
 * upload them to assets/photos/<COUNTRY>/<place>/. A photo here with a `country` joins that
 * country's chapter instead.
 *
 * Each photo:
 *   src       path to the image, e.g. 'assets/media/life/friends/friends-01.webp'. Photos prepared with
 *             tools/prepare_media.py (README → "Prepared photos and certificates") come in three sizes and
 *             the site picks the one each screen needs; any other JPG/PNG/WebP is used as it is
 *   w, h      the width and height of that file in pixels (printed by the tool), so the page can lay it out
 *   alt       what the photo shows, for screen readers
 *   caption   one line shown on the photo
 *   category  the album it belongs to, e.g. 'Friends & Koko' or 'University life'
 *   country   ISO alpha-3 code (optional): puts the photo in that country's chapter, e.g. 'USA'
 *   place     city or place name (optional)
 *   date      'YYYY' or 'YYYY-MM' (optional)
 *   story     a longer note shown when the photo is opened (optional)
 *   public    set to false to keep a photo in the file but off the site
 *
 * Other images: keep them around 1600–2000 px on the long side and under ~500 KB so the page stays fast.
 */
window.SITE = window.SITE || {};

SITE.gallery = {
  photos: [
    { src: 'assets/media/life/friends/friends-01.webp', w: 1536, h: 2048, caption: 'Friends', category: 'Friends & Koko' },
    { src: 'assets/media/life/friends/friends-02.webp', w: 1536, h: 2048, caption: 'Friends', category: 'Friends & Koko' },
    { src: 'assets/media/life/friends/friends-03.webp', w: 1536, h: 2048, caption: 'Friends', category: 'Friends & Koko' },
    { src: 'assets/media/life/friends/friends-04.webp', w: 1536, h: 2048, caption: 'Friends', category: 'Friends & Koko' },
    { src: 'assets/media/life/koko/koko-01.webp', w: 2048, h: 1152, caption: 'My dog Koko', category: 'Friends & Koko' },
    { src: 'assets/media/life/koko/koko-02.webp', w: 2048, h: 1152, caption: 'My dog Koko', category: 'Friends & Koko' }
    // { src: 'assets/media/life/campus/campus-01.webp', w: 2048, h: 1536, alt: '…', caption: '…', category: 'University life', date: '2025-10', story: '', public: true },
  ]
};
