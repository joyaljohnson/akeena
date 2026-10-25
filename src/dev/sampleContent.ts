// Made-up content for tests and previews on machines without the private fixture. Every name,
// venue and link here is fictional.
import type { LetterData } from '../lib/letterTypes';

export const sample: LetterData = {
  name: 'Sample',
  fontId: 'parisienne',
  personalNote: 'You have been my person from the very first day. Will you stand with me?',
  content: {
    bride: { firstName: 'Bride', signOff: 'With love,' },
    cover: {
      headlineTemplate: '{name}, would you be my bridesmaid?',
      background: {
        videoUrl: 'https://media.example.test/cover.mp4',
        posterUrl: 'https://media.example.test/cover-poster.jpg',
        musicUrl: 'https://media.example.test/music.m4a',
      },
    },
    duties: {
      title: 'Duties',
      items: ['Be the calm in the happy storm', 'Hold my bouquet', 'Dance like nobody is watching'],
    },
    chapters: [
      {
        id: 'ch1',
        number: 1,
        title: 'First Chapter',
        theme: 'pearl',
        events: [
          {
            date: '2026-12-25',
            time: '18:30',
            venueName: 'Sample Hall',
            mapsUrl: 'https://maps.example.test/one',
          },
        ],
        vibe: 'Warm and intimate',
        dressCode: 'Shades of white',
        dressCodeNote: 'Pictures to follow',
      },
      {
        id: 'ch2',
        number: 2,
        title: 'Second Chapter',
        theme: 'jewel',
        events: [
          {
            label: 'Ceremony',
            date: '2026-12-27',
            time: '15:00',
            venueName: 'Sample Church',
            mapsUrl: 'https://maps.example.test/two',
          },
          {
            label: 'Evening',
            date: '2026-12-27',
            time: null,
            timeNote: 'Evening function',
            venueName: 'Sample Convention Centre',
            mapsUrl: 'https://maps.example.test/three',
          },
        ],
        vibe: 'Rich and traditional',
        dressCode: 'Any bright colour except red',
      },
      {
        id: 'ch3',
        number: 3,
        title: 'Third Chapter',
        theme: 'gold',
        events: [
          {
            date: '2027-01-04',
            time: '16:00',
            venueName: 'Sample Garden',
            mapsUrl: 'https://maps.example.test/four',
          },
        ],
        vibe: 'Sunset vows',
        dressCode: 'Shades of gold',
      },
      {
        id: 'ch4',
        number: 4,
        title: 'Fourth Chapter',
        theme: 'pastel-metallic',
        events: [
          {
            date: '2027-01-06',
            time: null,
            venueName: 'Sample Cathedral',
            mapsUrl: 'https://maps.example.test/five',
          },
        ],
        vibe: 'Faith and forever',
        dressCode: 'Pastel metallic tissue silk',
      },
    ],
    closingQuote: 'No take-backs, no excuses. You are officially stuck with me!',
    acceptance: { question: 'Will you accept?', yesLabel: 'Yes, I do!' },
    oath: 'I solemnly swear I am up to no good (and ready to celebrate)',
    moodboard: { label: 'Join my sample board', url: 'https://moodboard.example.test/board' },
  },
};
