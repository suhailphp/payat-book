import { insertEvent, insertPerson, insertTxn, setEventStatus } from '../db';

/* Dev-only sample data: 30 Kerala-style people with randomized balances in
   both directions spread over the last 6 months, plus 2 hostings (1 open).
   Appends on every call. Only ever reachable behind __DEV__. */

const NAMES = [
  'Hameed', 'Riyas KP', 'Fathima', 'Suhail', 'Anas', 'Shameer', 'Nasser PK', 'Rasheed',
  'Jasmin', 'Ayesha', 'Muhsina', 'Basheer', 'Kunjumon', 'Sudheesh', 'Vineeth', 'Anoop',
  'Sreejith', 'Manoj', 'Salim', 'Iqbal', 'Shahina', 'Ramla', 'Noufal', 'Faisal',
  'Thaha', 'Mujeeb', 'Sainaba', 'Khadeeja', 'Abdul Kareem', 'Moideen',
];

const NOTES = ['wedding payat', 'housewarming', 'kuri', 'nikah', ''];

const iso = (d: Date) => d.toISOString().slice(0, 10);
const daysBack = (days: number) => iso(new Date(Date.now() - days * 864e5));
const rand = (n: number) => Math.floor(Math.random() * n);
const amount = () => (1 + rand(40)) * 100; // ₹100–₹4,000 in payat-style steps

export async function seedSampleData(): Promise<void> {
  const ids: number[] = [];
  for (const name of NAMES) {
    const phone = Math.random() < 0.6 ? `+91 9${String(100000000 + rand(899999999))}` : '';
    ids.push(await insertPerson(name, phone, daysBack(180 - rand(150))));
  }

  /* everyone gets a few entries over the last ~6 months, both directions */
  for (const pid of ids) {
    const k = 1 + rand(5);
    for (let i = 0; i < k; i++) {
      await insertTxn({
        personId: pid,
        eventId: null,
        dir: Math.random() < 0.5 ? 'in' : 'out',
        amount: amount(),
        date: daysBack(rand(180)),
        note: NOTES[rand(NOTES.length)],
      });
    }
  }

  /* the first person gets a long history so per-person pagination shows */
  for (let i = 0; i < 16; i++) {
    await insertTxn({
      personId: ids[0],
      eventId: null,
      dir: Math.random() < 0.5 ? 'in' : 'out',
      amount: amount(),
      date: daysBack(rand(180)),
      note: NOTES[rand(NOTES.length)],
    });
  }

  /* 2 hostings: one finished, one still open */
  const closed = await insertEvent('Wedding of Fathima', daysBack(45));
  for (const pid of ids.slice(0, 8)) {
    await insertTxn({ personId: pid, eventId: closed, dir: 'in', amount: amount(), date: daysBack(44 + rand(3)), note: '' });
  }
  await setEventStatus(closed, 'closed');

  const open = await insertEvent('Housewarming payat', daysBack(2));
  for (const pid of ids.slice(8, 12)) {
    await insertTxn({ personId: pid, eventId: open, dir: 'in', amount: amount(), date: daysBack(rand(3)), note: '' });
  }
}
